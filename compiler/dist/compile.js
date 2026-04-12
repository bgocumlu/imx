import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { parseFile, extractImports } from './parser.js';
import { validate } from './validator.js';
import { lowerComponent } from './lowering.js';
import { emitComponent, emitComponentHeader, emitRoot } from './emitter.js';
import { formatDiagnostic } from './diagnostics.js';
/**
 * Compile a list of .tsx files and write generated C++ to outputDir.
 * Returns a result object instead of calling process.exit().
 */
export function compile(files, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    let hasErrors = false;
    const errorMessages = [];
    const warningMessages = [];
    const compiled = [];
    const allExternalInterfaces = new Map();
    // Phase 1: Parse, validate, and lower all components
    for (const file of files) {
        if (!fs.existsSync(file)) {
            const msg = `${file}:1:1 - error: file not found`;
            errorMessages.push(msg);
            hasErrors = true;
            continue;
        }
        const source = fs.readFileSync(file, 'utf-8');
        const parsed = parseFile(file, source);
        if (parsed.errors.length > 0) {
            parsed.errors.forEach(e => errorMessages.push(formatDiagnostic(e, source)));
            hasErrors = true;
            continue;
        }
        const validation = validate(parsed);
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(w => warningMessages.push(formatDiagnostic(w, source)));
        }
        if (validation.errors.length > 0) {
            validation.errors.forEach(e => errorMessages.push(formatDiagnostic(e, source)));
            hasErrors = true;
            continue;
        }
        // Load external interface definitions from imx.d.ts in the same directory
        const externalInterfaces = loadExternalInterfaces(path.dirname(path.resolve(file)));
        for (const [k, v] of externalInterfaces)
            allExternalInterfaces.set(k, v);
        const ir = lowerComponent(parsed, validation, externalInterfaces);
        const imports = extractImports(parsed.sourceFile);
        compiled.push({
            name: ir.name,
            sourceFile: parsed.sourceFile.fileName,
            sourcePath: file,
            stateCount: ir.stateSlots.length,
            bufferCount: ir.bufferCount,
            ir,
            imports,
            hasProps: ir.params.length > 0 || !!ir.namedPropsType,
            boundProps: new Set(),
        });
    }
    if (hasErrors) {
        return { success: false, componentCount: 0, errors: errorMessages, warnings: warningMessages };
    }
    // Phase 2: Build lookup of compiled components for cross-file resolution
    const componentMap = new Map();
    for (const comp of compiled) {
        componentMap.set(comp.name, comp);
    }
    // Phase 3: Resolve imported component stateCount/bufferCount in IR, then emit
    for (const comp of compiled) {
        resolveCustomComponents(comp.ir.body, componentMap);
        resolveDragDropTypes(comp.ir.body);
        // Only detect bound props for custom components (inline props).
        // Root components with namedPropsType receive T& directly — no pointer wrapping needed.
        if (!comp.ir.namedPropsType) {
            comp.boundProps = detectBoundProps(comp.ir.body);
        }
    }
    // Propagate bound props through component call chains:
    // If component X passes props.foo to a bound prop of child component Y,
    // then foo is also bound in X (needs to be a pointer too).
    let changed = true;
    while (changed) {
        changed = false;
        for (const comp of compiled) {
            if (comp.ir.namedPropsType)
                continue;
            const before = comp.boundProps.size;
            propagateBoundProps(comp.ir.body, comp.boundProps, componentMap);
            if (comp.boundProps.size > before)
                changed = true;
        }
    }
    // Build boundProps map for cross-component emitter use
    const boundPropsMap = new Map();
    for (const comp of compiled) {
        boundPropsMap.set(comp.name, comp.boundProps);
    }
    const sharedPropsType = compiled.find(c => c.ir.namedPropsType)?.ir.namedPropsType;
    // Resolve actual C++ types for bound props by tracing through parent interfaces.
    // When a child declares `speed: number`, but the parent struct has `float speed`,
    // the bound prop pointer must use the parent's actual type.
    const resolvedBoundPropTypes = new Map();
    for (const comp of compiled) {
        // Build field types for this component (either from external interface or inline params)
        let fieldTypes;
        if (comp.ir.namedPropsType) {
            fieldTypes = allExternalInterfaces.get(comp.ir.namedPropsType);
        }
        else if (comp.ir.params.length > 0) {
            fieldTypes = new Map();
            for (const p of comp.ir.params)
                fieldTypes.set(p.name, p.type);
        }
        if (fieldTypes) {
            resolveChildBoundTypes(comp.ir.body, fieldTypes, componentMap, allExternalInterfaces, resolvedBoundPropTypes);
        }
    }
    for (const comp of compiled) {
        const importInfos = [];
        for (const [importedName] of comp.imports) {
            const importedComp = componentMap.get(importedName);
            if (importedComp) {
                importInfos.push({
                    name: importedName,
                    headerFile: `${importedName}.gen.h`,
                });
            }
        }
        const cppOutput = emitComponent(comp.ir, importInfos, comp.sourceFile, comp.boundProps, boundPropsMap, { sourceMap: true });
        const baseName = comp.name;
        const outPath = path.join(outputDir, `${baseName}.gen.cpp`);
        fs.writeFileSync(outPath, cppOutput);
        console.log(`  ${baseName} -> ${outPath}`);
        // Generate embed headers for any <Image embed> nodes
        const embedImages = collectEmbedImages(comp.ir.body);
        if (embedImages.length > 0) {
            const sourceDir = path.dirname(path.resolve(comp.sourcePath));
            generateEmbedHeaders(embedImages, sourceDir, outputDir);
        }
        // Generate a header for non-root components (not for named interface types —
        // those are declared in the user's main.cpp). Even propless components need
        // a forward declaration so the root can call their render function.
        if (!comp.ir.namedPropsType && (comp.hasProps || comp !== compiled[0])) {
            const resolved = resolvedBoundPropTypes.get(comp.name);
            const headerOutput = emitComponentHeader(comp.ir, comp.sourceFile, comp.boundProps, sharedPropsType, resolved);
            const headerPath = path.join(outputDir, `${baseName}.gen.h`);
            fs.writeFileSync(headerPath, headerOutput);
            console.log(`  ${baseName} -> ${headerPath} (header)`);
        }
    }
    // Collect font declarations from ALL components
    const allFontDeclarations = [];
    for (const comp of compiled) {
        allFontDeclarations.push(...collectFontDeclarations(comp.ir.body));
    }
    const fontDeclarations = deduplicateFonts(allFontDeclarations);
    // Generate embed headers for fonts
    if (fontDeclarations.some(f => f.embed)) {
        const sourceDir = path.dirname(path.resolve(compiled[0].sourcePath));
        generateFontEmbedHeaders(fontDeclarations, sourceDir, outputDir);
    }
    // Phase 4: Emit root entry point
    if (compiled.length > 0) {
        const root = compiled[0];
        // Use namedPropsType if available (e.g. "AppState"), else ComponentNameProps for inline props
        const isNamedPropsType = !!root.ir.namedPropsType;
        const propsType = root.ir.namedPropsType
            ? root.ir.namedPropsType
            : root.hasProps ? root.name + 'Props' : undefined;
        const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount, root.sourceFile, propsType, isNamedPropsType, fontDeclarations);
        const rootPath = path.join(outputDir, 'app_root.gen.cpp');
        fs.writeFileSync(rootPath, rootOutput);
        console.log(`  -> ${rootPath} (root entry point)`);
    }
    return { success: true, componentCount: compiled.length, errors: [], warnings: warningMessages };
}
function resolveCustomComponents(nodes, map) {
    for (const node of nodes) {
        if (node.kind === 'custom_component') {
            const target = map.get(node.name);
            if (target) {
                node.stateCount = target.stateCount;
                node.bufferCount = target.bufferCount;
            }
        }
        else if (node.kind === 'conditional') {
            resolveCustomComponents(node.body, map);
            if (node.elseBody)
                resolveCustomComponents(node.elseBody, map);
        }
        else if (node.kind === 'list_map') {
            resolveCustomComponents(node.body, map);
        }
    }
}
export function resolveDragDropTypes(nodes) {
    const typeMap = new Map();
    collectDragDropTypes(nodes, typeMap);
    applyDragDropTypes(nodes, typeMap);
}
function collectDragDropTypes(nodes, typeMap) {
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'DragDropTarget') {
            const onDrop = node.props['onDrop'] ?? '';
            const parts = onDrop.split('|');
            if (parts.length >= 3) {
                const cppType = parts[0];
                const typeStr = node.props['type'] ?? '';
                const key = typeStr.replace(/^"|"$/g, '');
                if (key)
                    typeMap.set(key, cppType);
            }
        }
        else if (node.kind === 'conditional') {
            collectDragDropTypes(node.body, typeMap);
            if (node.elseBody)
                collectDragDropTypes(node.elseBody, typeMap);
        }
        else if (node.kind === 'list_map') {
            collectDragDropTypes(node.body, typeMap);
        }
    }
}
function applyDragDropTypes(nodes, typeMap) {
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'DragDropSource') {
            const typeStr = node.props['type'] ?? '';
            const key = typeStr.replace(/^"|"$/g, '');
            const cppType = typeMap.get(key);
            if (cppType) {
                node.props['_payloadType'] = cppType;
            }
        }
        else if (node.kind === 'conditional') {
            applyDragDropTypes(node.body, typeMap);
            if (node.elseBody)
                applyDragDropTypes(node.elseBody, typeMap);
        }
        else if (node.kind === 'list_map') {
            applyDragDropTypes(node.body, typeMap);
        }
    }
}
function collectEmbedImages(nodes) {
    const images = [];
    for (const node of nodes) {
        if (node.kind === 'image' && node.embed && node.embedKey) {
            images.push(node);
        }
        else if (node.kind === 'conditional') {
            images.push(...collectEmbedImages(node.body));
            if (node.elseBody)
                images.push(...collectEmbedImages(node.elseBody));
        }
        else if (node.kind === 'list_map') {
            images.push(...collectEmbedImages(node.body));
        }
    }
    return images;
}
function generateEmbedHeaders(images, sourceDir, outputDir) {
    for (const img of images) {
        if (!img.embedKey)
            continue;
        const rawSrc = img.src.replace(/^"|"$/g, '');
        let imagePath = path.resolve(sourceDir, rawSrc);
        const headerPath = path.join(outputDir, `${img.embedKey}.embed.h`);
        // Try public/ subdirectory as fallback (relative to sourceDir's parent)
        if (!fs.existsSync(imagePath)) {
            const publicPath = path.resolve(sourceDir, '..', 'public', rawSrc);
            if (fs.existsSync(publicPath)) {
                imagePath = publicPath;
            }
        }
        // Mtime caching: skip if header exists and is newer than image
        if (fs.existsSync(headerPath) && fs.existsSync(imagePath)) {
            const imgStat = fs.statSync(imagePath);
            const hdrStat = fs.statSync(headerPath);
            if (hdrStat.mtimeMs >= imgStat.mtimeMs) {
                continue; // Header is up to date
            }
        }
        if (!fs.existsSync(imagePath)) {
            console.warn(`  warning: embedded image not found: ${imagePath} (also tried public/)`);
            continue;
        }
        const imageData = fs.readFileSync(imagePath);
        const bytes = Array.from(imageData)
            .map(b => `0x${b.toString(16).padStart(2, '0')}`)
            .join(', ');
        const header = [
            `// Generated from ${rawSrc} by imxc`,
            `#pragma once`,
            `static const unsigned char ${img.embedKey}_data[] = { ${bytes} };`,
            `static const unsigned int ${img.embedKey}_size = ${imageData.length};`,
            '',
        ].join('\n');
        fs.writeFileSync(headerPath, header);
        console.log(`  ${rawSrc} -> ${headerPath} (embed)`);
    }
}
function collectFontDeclarations(nodes) {
    const fonts = [];
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'Font' && node.props['src']) {
            const name = (node.props['name'] ?? '').replace(/^"|"$/g, '');
            const src = (node.props['src'] ?? '').replace(/^"|"$/g, '');
            const size = node.props['size'] ?? '16.0f';
            const embed = node.props['embed'] === 'true';
            let embedKey;
            if (embed) {
                embedKey = src.replace(/[^a-zA-Z0-9]/g, '_');
            }
            fonts.push({ name, src, size, embed, embedKey });
        }
        else if (node.kind === 'conditional') {
            fonts.push(...collectFontDeclarations(node.body));
            if (node.elseBody)
                fonts.push(...collectFontDeclarations(node.elseBody));
        }
        else if (node.kind === 'list_map') {
            fonts.push(...collectFontDeclarations(node.body));
        }
    }
    return fonts;
}
function deduplicateFonts(fonts) {
    const seen = new Map();
    for (const f of fonts) {
        if (seen.has(f.name)) {
            const existing = seen.get(f.name);
            if (existing.src !== f.src) {
                console.error(`  error: font "${f.name}" declared with different sources: "${existing.src}" vs "${f.src}"`);
            }
            continue;
        }
        seen.set(f.name, f);
    }
    return Array.from(seen.values());
}
function generateFontEmbedHeaders(fonts, sourceDir, outputDir) {
    for (const font of fonts) {
        if (!font.embed || !font.embedKey)
            continue;
        let fontPath = path.resolve(sourceDir, font.src);
        const headerPath = path.join(outputDir, `${font.embedKey}.embed.h`);
        // Mtime caching: skip if header exists and is newer than font file
        if (fs.existsSync(headerPath) && fs.existsSync(fontPath)) {
            const fontStat = fs.statSync(fontPath);
            const hdrStat = fs.statSync(headerPath);
            if (hdrStat.mtimeMs >= fontStat.mtimeMs) {
                continue;
            }
        }
        if (!fs.existsSync(fontPath)) {
            // Try public/ subdirectory (relative to sourceDir's parent, for src/ layout)
            const publicPath = path.resolve(sourceDir, '..', 'public', font.src);
            if (fs.existsSync(publicPath)) {
                fontPath = publicPath;
            }
            else {
                console.warn(`  warning: embedded font not found: ${fontPath} (also tried public/)`);
                continue;
            }
        }
        const fontData = fs.readFileSync(fontPath);
        const bytes = Array.from(fontData)
            .map(b => `0x${b.toString(16).padStart(2, '0')}`)
            .join(', ');
        const header = [
            `// Generated from ${font.src} by imxc`,
            `#pragma once`,
            `static const unsigned char ${font.embedKey}_data[] = { ${bytes} };`,
            `static const unsigned int ${font.embedKey}_size = ${fontData.length};`,
            '',
        ].join('\n');
        fs.writeFileSync(headerPath, header);
        console.log(`  ${font.src} -> ${headerPath} (font embed)`);
    }
}
function detectBoundProps(nodes) {
    const bound = new Set();
    walkNodesForBinding(nodes, bound);
    return bound;
}
function propagateBoundProps(nodes, bound, componentMap) {
    for (const node of nodes) {
        if (node.kind === 'custom_component') {
            const child = componentMap.get(node.name);
            if (child) {
                for (const [propName, valueExpr] of Object.entries(node.props)) {
                    if (child.boundProps.has(propName) && valueExpr.startsWith('props.')) {
                        const parentProp = valueExpr.slice(6).split('.')[0].split('[')[0];
                        bound.add(parentProp);
                    }
                }
            }
        }
        else if (node.kind === 'conditional') {
            propagateBoundProps(node.body, bound, componentMap);
            if (node.elseBody)
                propagateBoundProps(node.elseBody, bound, componentMap);
        }
        else if (node.kind === 'list_map') {
            propagateBoundProps(node.body, bound, componentMap);
        }
    }
}
function walkNodesForBinding(nodes, bound) {
    for (const node of nodes) {
        if ('directBind' in node && node.directBind && 'valueExpr' in node) {
            const expr = node.valueExpr;
            if (expr && expr.startsWith('props.')) {
                const propName = expr.slice(6).split('.')[0].split('[')[0];
                bound.add(propName);
            }
        }
        // Scan all expressions for nested struct field access (props.X.Y or props.X[N]).
        // This catches struct binding in callbacks, conditions, selections, text args, etc.
        // — not just directBind widgets.
        scanNodeExprsForBinding(node, bound);
        if (node.kind === 'conditional') {
            walkNodesForBinding(node.body, bound);
            if (node.elseBody)
                walkNodesForBinding(node.elseBody, bound);
        }
        else if (node.kind === 'list_map') {
            walkNodesForBinding(node.body, bound);
        }
    }
}
/** Scan all string-valued properties of an IR node for props.X.Y / props.X[N] patterns. */
function scanNodeExprsForBinding(node, bound) {
    const obj = node;
    for (const key of Object.keys(obj)) {
        // Skip structural/recursive fields — they're handled by walkNodes recursion
        if (key === 'kind' || key === 'body' || key === 'elseBody' || key === 'loc')
            continue;
        const val = obj[key];
        if (typeof val === 'string') {
            extractNestedPropAccess(val, bound);
        }
        else if (Array.isArray(val)) {
            for (const item of val) {
                if (typeof item === 'string')
                    extractNestedPropAccess(item, bound);
            }
        }
        else if (typeof val === 'object' && val !== null) {
            // Handles Record<string, string> (container props, custom component props)
            // and IRItemInteraction objects
            for (const v of Object.values(val)) {
                if (typeof v === 'string')
                    extractNestedPropAccess(v, bound);
            }
        }
    }
}
/** If expr contains props.X.Y or props.X[N], mark X as needing pointer binding.
 *  Skips .c_str() and .size() — these are method calls on scalar types, not struct access. */
function extractNestedPropAccess(expr, bound) {
    // Match props.X. (dot access)
    const dotRegex = /props\.(\w+)\./g;
    let match;
    while ((match = dotRegex.exec(expr)) !== null) {
        const afterDot = expr.slice(match.index + match[0].length);
        if (afterDot.startsWith('c_str()') || afterDot.startsWith('size()'))
            continue;
        bound.add(match[1]);
    }
    // Match props.X[ (bracket access)
    const bracketRegex = /props\.(\w+)\[/g;
    while ((match = bracketRegex.exec(expr)) !== null) {
        bound.add(match[1]);
    }
}
/**
 * Walk IR nodes in a parent component, resolving actual C++ types for child bound props.
 * When a child has `speed: number` but the parent passes props.speed from a struct
 * where speed is float, the resolved type overrides the child's inferred type.
 */
function resolveChildBoundTypes(nodes, parentFieldTypes, componentMap, extIfaces, result) {
    for (const node of nodes) {
        if (node.kind === 'custom_component') {
            const child = componentMap.get(node.name);
            if (child) {
                for (const [propName, valueExpr] of Object.entries(node.props)) {
                    if (!child.boundProps.has(propName) || !valueExpr.startsWith('props.'))
                        continue;
                    const resolvedType = resolveBoundPropType(valueExpr, parentFieldTypes, extIfaces);
                    if (resolvedType) {
                        if (!result.has(node.name))
                            result.set(node.name, new Map());
                        result.get(node.name).set(propName, resolvedType);
                    }
                }
            }
        }
        else if (node.kind === 'conditional') {
            resolveChildBoundTypes(node.body, parentFieldTypes, componentMap, extIfaces, result);
            if (node.elseBody)
                resolveChildBoundTypes(node.elseBody, parentFieldTypes, componentMap, extIfaces, result);
        }
        else if (node.kind === 'list_map') {
            resolveChildBoundTypes(node.body, parentFieldTypes, componentMap, extIfaces, result);
        }
    }
}
function resolveBoundPropType(valueExpr, rootFieldTypes, extIfaces) {
    if (!valueExpr.startsWith('props.'))
        return undefined;
    const parts = valueExpr
        .slice(6)
        .split('.')
        .map(part => part.split('[')[0])
        .filter(Boolean);
    if (parts.length === 0)
        return undefined;
    let currentType = rootFieldTypes.get(parts[0]);
    if (!currentType || currentType === 'callback')
        return undefined;
    for (let i = 1; i < parts.length; i++) {
        const iface = extIfaces.get(currentType);
        if (!iface)
            return undefined;
        const nextType = iface.get(parts[i]);
        if (!nextType || nextType === 'callback')
            return undefined;
        currentType = nextType;
    }
    return currentType;
}
/**
 * Parse the imx.d.ts in the given directory (if present) and extract
 * all interface declarations as a map from interface name -> field name -> type.
 */
function normalizeExternalPropType(typeText) {
    const trimmed = typeText.trim().replace(/\s*\|\s*undefined$/, '');
    if (trimmed === 'number')
        return 'float';
    if (trimmed === 'boolean')
        return 'bool';
    if (trimmed === 'string')
        return 'string';
    return trimmed;
}
function loadExternalInterfaces(dir) {
    const result = new Map();
    const dtsPath = path.join(dir, 'imx.d.ts');
    if (!fs.existsSync(dtsPath))
        return result;
    const source = fs.readFileSync(dtsPath, 'utf-8');
    const sf = ts.createSourceFile('imx.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    for (const stmt of sf.statements) {
        if (ts.isInterfaceDeclaration(stmt)) {
            const ifName = stmt.name.text;
            const fields = new Map();
            for (const member of stmt.members) {
                if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
                    const fieldName = member.name.text;
                    if (!member.type) {
                        fields.set(fieldName, 'string');
                        continue;
                    }
                    if (ts.isFunctionTypeNode(member.type)) {
                        fields.set(fieldName, 'callback');
                        continue;
                    }
                    fields.set(fieldName, normalizeExternalPropType(member.type.getText(sf)));
                }
                else if (ts.isMethodSignature(member)) {
                    const mName = ts.isIdentifier(member.name) ? member.name.text : '';
                    if (mName)
                        fields.set(mName, 'callback');
                }
            }
            result.set(ifName, fields);
        }
    }
    return result;
}
