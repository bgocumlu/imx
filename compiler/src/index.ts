import { parseArgs } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseIgxFile, extractImports } from './parser.js';
import { validate } from './validator.js';
import { lowerComponent } from './lowering.js';
import { emitComponent, emitComponentHeader, emitRoot } from './emitter.js';
import type { ImportInfo } from './emitter.js';
import type { IRComponent } from './ir.js';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { output: { type: 'string', short: 'o' } },
});

if (positionals.length === 0) {
    console.error('Usage: reimgui-compiler <input.igx|.tsx ...> -o <output-dir>');
    process.exit(1);
}

const outputDir = values.output ?? '.';
fs.mkdirSync(outputDir, { recursive: true });

let hasErrors = false;

interface CompiledComponent {
    name: string;
    stateCount: number;
    bufferCount: number;
    ir: IRComponent;
    imports: Map<string, string>;  // component name -> module specifier
    hasProps: boolean;
}

const compiled: CompiledComponent[] = [];

// Phase 1: Parse, validate, and lower all components
for (const file of positionals) {
    if (!fs.existsSync(file)) {
        console.error(`${file}:1:1 - error: file not found`);
        hasErrors = true;
        continue;
    }

    const source = fs.readFileSync(file, 'utf-8');
    const parsed = parseIgxFile(file, source);
    if (parsed.errors.length > 0) {
        parsed.errors.forEach(e => console.error(`${e.file}:${e.line}:${e.col} - error: ${e.message}`));
        hasErrors = true;
        continue;
    }

    const validation = validate(parsed);
    if (validation.errors.length > 0) {
        validation.errors.forEach(e => console.error(`${e.file}:${e.line}:${e.col} - error: ${e.message}`));
        hasErrors = true;
        continue;
    }

    const ir = lowerComponent(parsed, validation);
    const imports = extractImports(parsed.sourceFile);

    compiled.push({
        name: ir.name,
        stateCount: ir.stateSlots.length,
        bufferCount: ir.bufferCount,
        ir,
        imports,
        hasProps: ir.params.length > 0,
    });
}

if (hasErrors) process.exit(1);

// Phase 2: Build lookup of compiled components for cross-file resolution
const componentMap = new Map<string, CompiledComponent>();
for (const comp of compiled) {
    componentMap.set(comp.name, comp);
}

// Phase 3: Resolve imported component stateCount/bufferCount in IR, then emit
for (const comp of compiled) {
    // Resolve cross-file custom component info
    resolveCustomComponents(comp.ir.body, componentMap);

    // Build import info for #include directives
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

    // Emit .gen.cpp
    const cppOutput = emitComponent(comp.ir, importInfos);
    const baseName = comp.name;
    const outPath = path.join(outputDir, `${baseName}.gen.cpp`);
    fs.writeFileSync(outPath, cppOutput);
    console.log(`  ${baseName} -> ${outPath}`);

    // Emit .gen.h for components with props
    if (comp.hasProps) {
        const headerOutput = emitComponentHeader(comp.ir);
        const headerPath = path.join(outputDir, `${baseName}.gen.h`);
        fs.writeFileSync(headerPath, headerOutput);
        console.log(`  ${baseName} -> ${headerPath} (header)`);
    }
}

// Phase 4: Emit root entry point
if (compiled.length > 0) {
    const root = compiled[0];
    const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount);
    const rootPath = path.join(outputDir, 'app_root.gen.cpp');
    fs.writeFileSync(rootPath, rootOutput);
    console.log(`  -> ${rootPath} (root entry point)`);
}

console.log(`reimgui-compiler: ${compiled.length} component(s) compiled successfully.`);

/**
 * Walk IR nodes and update custom_component nodes with resolved stateCount/bufferCount
 * from the compiled component map.
 */
function resolveCustomComponents(nodes: import('./ir.js').IRNode[], map: Map<string, CompiledComponent>): void {
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
