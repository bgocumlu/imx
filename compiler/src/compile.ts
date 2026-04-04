import * as fs from 'node:fs';
import * as path from 'node:path';
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

        const ir = lowerComponent(parsed, validation);
        const imports = extractImports(parsed.sourceFile);

        compiled.push({
            name: ir.name,
            sourceFile: path.basename(file),
            sourcePath: file,
            stateCount: ir.stateSlots.length,
            bufferCount: ir.bufferCount,
            ir,
            imports,
            hasProps: ir.params.length > 0,
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

        const cppOutput = emitComponent(comp.ir, importInfos, comp.sourceFile);
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

        if (comp.hasProps) {
            const headerOutput = emitComponentHeader(comp.ir, comp.sourceFile);
            const headerPath = path.join(outputDir, `${baseName}.gen.h`);
            fs.writeFileSync(headerPath, headerOutput);
            console.log(`  ${baseName} -> ${headerPath} (header)`);
        }
    }

    // Phase 4: Emit root entry point
    if (compiled.length > 0) {
        const root = compiled[0];
        const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount, root.sourceFile);
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
