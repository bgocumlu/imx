import { parseArgs } from 'node:util';
import * as fs from 'node:fs';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { output: { type: 'string', short: 'o' } },
});

if (positionals.length === 0) {
    console.error('Usage: reimgui-compiler <input.igx ...> -o <output-dir>');
    process.exit(1);
}

const outputDir = values.output ?? '.';
console.log(`reimgui-compiler: ${positionals.length} file(s) -> ${outputDir}/`);
