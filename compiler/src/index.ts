import { parseArgs } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseIgxFile } from './parser.js';
import { validate } from './validator.js';
import { lowerComponent } from './lowering.js';
import { emitComponent, emitRoot } from './emitter.js';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { output: { type: 'string', short: 'o' } },
});

if (positionals.length === 0) {
    console.error('Usage: reimgui-compiler <input.igx ...> -o <output-dir>');
    process.exit(1);
}

const outputDir = values.output ?? '.';
fs.mkdirSync(outputDir, { recursive: true });

let hasErrors = false;
interface CompiledComponent { name: string; stateCount: number; bufferCount: number; }
const compiled: CompiledComponent[] = [];

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
    const cppOutput = emitComponent(ir);

    const baseName = path.basename(file, path.extname(file));
    const outPath = path.join(outputDir, `${baseName}.gen.cpp`);
    fs.writeFileSync(outPath, cppOutput);
    console.log(`  ${file} -> ${outPath}`);

    compiled.push({ name: ir.name, stateCount: ir.stateSlots.length, bufferCount: ir.bufferCount });
}

if (hasErrors) process.exit(1);

if (compiled.length > 0) {
    const root = compiled[0];
    const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount);
    const rootPath = path.join(outputDir, 'app_root.gen.cpp');
    fs.writeFileSync(rootPath, rootOutput);
    console.log(`  -> ${rootPath} (root entry point)`);
}

console.log(`reimgui-compiler: ${compiled.length} component(s) compiled successfully.`);
