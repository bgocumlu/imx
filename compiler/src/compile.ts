import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';
import { parseFile, extractImports } from './parser.js';
import { validate } from './validator.js';
import { lowerComponent } from './lowering.js';
import { emitComponent, emitComponentHeader, emitRoot } from './emitter.js';
import { formatDiagnostic } from './diagnostics.js';
import type { ImportInfo } from './emitter.js';
import type { IRComponent, IRNode, IRImage } from './ir.js';

interface CompiledComponent {
    name: string;
    sourceFile: string;
    sourcePath: string;
    stateCount: number;
    bufferCount: number;
    ir: IRComponent;
    imports: Map<string, string>;
    hasProps: boolean;
    boundProps: Set<string>;
}

export interface CompileResult {
    success: boolean;
    componentCount: number;
    errors: string[];
}

/**
 * Compile a list of .tsx files and write generated C++ to outputDir.
 * Returns a result object instead of calling process.exit().
 */
export function compile(files: string[], outputDir: string): CompileResult {
    fs.mkdirSync(outputDir, { recursive: true });

    let hasErrors = false;
    const errorMessages: string[] = [];
    const compiled: CompiledComponent[] = [];

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
        if (validation.errors.length > 0) {
            validation.errors.forEach(e => errorMessages.push(formatDiagnostic(e, source)));
            hasErrors = true;
            continue;
        }

        // Load external interface definitions from imx.d.ts in the same directory
        const externalInterfaces = loadExternalInterfaces(path.dirname(path.resolve(file)));

        const ir = lowerComponent(parsed, validation, externalInterfaces);
        const imports = extractImports(parsed.sourceFile);

        compiled.push({
            name: ir.name,
            sourceFile: path.basename(file),
            sourcePath: file,
            stateCount: ir.stateSlots.length,
            bufferCount: ir.bufferCount,
            ir,
            imports,
            hasProps: ir.params.length > 0 || !!ir.namedPropsType,
            boundProps: new Set<string>(),
        });
    }

    if (hasErrors) {
        return { success: false, componentCount: 0, errors: errorMessages };
    }

    // Phase 2: Build lookup of compiled components for cross-file resolution
    const componentMap = new Map<string, CompiledComponent>();
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
            if (comp.ir.namedPropsType) continue;
            const before = comp.boundProps.size;
            propagateBoundProps(comp.ir.body, comp.boundProps, componentMap);
            if (comp.boundProps.size > before) changed = true;
        }
    }

    // Build boundProps map for cross-component emitter use
    const boundPropsMap = new Map<string, Set<string>>();
    for (const comp of compiled) {
        boundPropsMap.set(comp.name, comp.boundProps);
    }
    const sharedPropsType = compiled.find(c => c.ir.namedPropsType)?.ir.namedPropsType;

    for (const comp of compiled) {
        const importInfos: ImportInfo[] = [];
        for (const [importedName] of comp.imports) {
            const importedComp = componentMap.get(importedName);
            if (importedComp && importedComp.hasProps) {
                importInfos.push({
                    name: importedName,
                    headerFile: `${importedName}.gen.h`,
                });
            }
        }

        const cppOutput = emitComponent(comp.ir, importInfos, comp.sourceFile, comp.boundProps, boundPropsMap);
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

        // Only generate a header for inline props (not for named interface types —
        // those are declared in the user's main.cpp)
        if (comp.hasProps && !comp.ir.namedPropsType) {
            const headerOutput = emitComponentHeader(comp.ir, comp.sourceFile, comp.boundProps, sharedPropsType);
            const headerPath = path.join(outputDir, `${baseName}.gen.h`);
            fs.writeFileSync(headerPath, headerOutput);
            console.log(`  ${baseName} -> ${headerPath} (header)`);
        }
    }

    // Phase 4: Emit root entry point
    if (compiled.length > 0) {
        const root = compiled[0];
        // Use namedPropsType if available (e.g. "AppState"), else ComponentNameProps for inline props
        const isNamedPropsType = !!root.ir.namedPropsType;
        const propsType = root.ir.namedPropsType
            ? root.ir.namedPropsType
            : root.hasProps ? root.name + 'Props' : undefined;
        const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount, root.sourceFile, propsType, isNamedPropsType);
        const rootPath = path.join(outputDir, 'app_root.gen.cpp');
        fs.writeFileSync(rootPath, rootOutput);
        console.log(`  -> ${rootPath} (root entry point)`);
    }

    return { success: true, componentCount: compiled.length, errors: [] };
}

function resolveCustomComponents(nodes: IRNode[], map: Map<string, CompiledComponent>): void {
    for (const node of nodes) {
        if (node.kind === 'custom_component') {
            const target = map.get(node.name);
            if (target) {
                node.stateCount = target.stateCount;
                node.bufferCount = target.bufferCount;
            }
        } else if (node.kind === 'conditional') {
            resolveCustomComponents(node.body, map);
            if (node.elseBody) resolveCustomComponents(node.elseBody, map);
        } else if (node.kind === 'list_map') {
            resolveCustomComponents(node.body, map);
        }
    }
}

export function resolveDragDropTypes(nodes: IRNode[]): void {
    const typeMap = new Map<string, string>();
    collectDragDropTypes(nodes, typeMap);
    applyDragDropTypes(nodes, typeMap);
}

function collectDragDropTypes(nodes: IRNode[], typeMap: Map<string, string>): void {
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'DragDropTarget') {
            const onDrop = node.props['onDrop'] ?? '';
            const parts = onDrop.split('|');
            if (parts.length >= 3) {
                const cppType = parts[0];
                const typeStr = node.props['type'] ?? '';
                const key = typeStr.replace(/^"|"$/g, '');
                if (key) typeMap.set(key, cppType);
            }
        } else if (node.kind === 'conditional') {
            collectDragDropTypes(node.body, typeMap);
            if (node.elseBody) collectDragDropTypes(node.elseBody, typeMap);
        } else if (node.kind === 'list_map') {
            collectDragDropTypes(node.body, typeMap);
        }
    }
}

function applyDragDropTypes(nodes: IRNode[], typeMap: Map<string, string>): void {
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'DragDropSource') {
            const typeStr = node.props['type'] ?? '';
            const key = typeStr.replace(/^"|"$/g, '');
            const cppType = typeMap.get(key);
            if (cppType) {
                node.props['_payloadType'] = cppType;
            }
        } else if (node.kind === 'conditional') {
            applyDragDropTypes(node.body, typeMap);
            if (node.elseBody) applyDragDropTypes(node.elseBody, typeMap);
        } else if (node.kind === 'list_map') {
            applyDragDropTypes(node.body, typeMap);
        }
    }
}

function collectEmbedImages(nodes: IRNode[]): IRImage[] {
    const images: IRImage[] = [];
    for (const node of nodes) {
        if (node.kind === 'image' && node.embed && node.embedKey) {
            images.push(node as IRImage);
        } else if (node.kind === 'conditional') {
            images.push(...collectEmbedImages(node.body));
            if (node.elseBody) images.push(...collectEmbedImages(node.elseBody));
        } else if (node.kind === 'list_map') {
            images.push(...collectEmbedImages(node.body));
        }
    }
    return images;
}

function generateEmbedHeaders(images: IRImage[], sourceDir: string, outputDir: string): void {
    for (const img of images) {
        if (!img.embedKey) continue;

        const rawSrc = img.src.replace(/^"|"$/g, '');
        const imagePath = path.resolve(sourceDir, rawSrc);
        const headerPath = path.join(outputDir, `${img.embedKey}.embed.h`);

        // Mtime caching: skip if header exists and is newer than image
        if (fs.existsSync(headerPath) && fs.existsSync(imagePath)) {
            const imgStat = fs.statSync(imagePath);
            const hdrStat = fs.statSync(headerPath);
            if (hdrStat.mtimeMs >= imgStat.mtimeMs) {
                continue; // Header is up to date
            }
        }

        if (!fs.existsSync(imagePath)) {
            console.warn(`  warning: embedded image not found: ${imagePath}`);
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

function detectBoundProps(nodes: IRNode[]): Set<string> {
    const bound = new Set<string>();
    walkNodesForBinding(nodes, bound);
    return bound;
}

function propagateBoundProps(nodes: IRNode[], bound: Set<string>, componentMap: Map<string, CompiledComponent>): void {
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
        } else if (node.kind === 'conditional') {
            propagateBoundProps(node.body, bound, componentMap);
            if (node.elseBody) propagateBoundProps(node.elseBody, bound, componentMap);
        } else if (node.kind === 'list_map') {
            propagateBoundProps(node.body, bound, componentMap);
        }
    }
}

function walkNodesForBinding(nodes: IRNode[], bound: Set<string>): void {
    for (const node of nodes) {
        if ('directBind' in node && (node as any).directBind && 'valueExpr' in node) {
            const expr = (node as any).valueExpr as string;
            if (expr && expr.startsWith('props.')) {
                const propName = expr.slice(6).split('.')[0].split('[')[0];
                bound.add(propName);
            }
        }
        if (node.kind === 'conditional') {
            walkNodesForBinding(node.body, bound);
            if (node.elseBody) walkNodesForBinding(node.elseBody, bound);
        } else if (node.kind === 'list_map') {
            walkNodesForBinding(node.body, bound);
        }
    }
}

/**
 * Parse the imx.d.ts in the given directory (if present) and extract
 * all interface declarations as a map from interface name -> field name -> type.
 */
function normalizeExternalPropType(typeText: string): string | 'callback' {
    const trimmed = typeText.trim().replace(/\s*\|\s*undefined$/, '');
    if (trimmed === 'number') return 'float';
    if (trimmed === 'boolean') return 'bool';
    if (trimmed === 'string') return 'string';
    return trimmed;
}

function loadExternalInterfaces(dir: string): Map<string, Map<string, string | 'callback'>> {
    const result = new Map<string, Map<string, string | 'callback'>>();
    const dtsPath = path.join(dir, 'imx.d.ts');
    if (!fs.existsSync(dtsPath)) return result;

    const source = fs.readFileSync(dtsPath, 'utf-8');
    const sf = ts.createSourceFile('imx.d.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    for (const stmt of sf.statements) {
        if (ts.isInterfaceDeclaration(stmt)) {
            const ifName = stmt.name.text;
            const fields = new Map<string, string | 'callback'>();
            for (const member of stmt.members) {
                if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
                    const fieldName = member.name.text;
                    if (!member.type) { fields.set(fieldName, 'string'); continue; }
                    if (ts.isFunctionTypeNode(member.type)) { fields.set(fieldName, 'callback'); continue; }
                    fields.set(fieldName, normalizeExternalPropType(member.type.getText(sf)));
                } else if (ts.isMethodSignature(member)) {
                    const mName = ts.isIdentifier(member.name) ? member.name.text : '';
                    if (mName) fields.set(mName, 'callback');
                }
            }
            result.set(ifName, fields);
        }
    }
    return result;
}
