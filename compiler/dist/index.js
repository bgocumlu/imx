#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as path from 'node:path';
import { initProject } from './init.js';
import { compile } from './compile.js';
import { startWatch } from './watch.js';
// Handle `imxc init [dir]` subcommand
if (process.argv[2] === 'init') {
    const dir = process.argv[3] ?? '.';
    const absDir = path.resolve(dir);
    initProject(absDir, path.basename(absDir));
    process.exit(0);
}
// Handle `imxc watch <dir> -o <output-dir>` subcommand
if (process.argv[2] === 'watch') {
    const watchDir = process.argv[3];
    if (!watchDir) {
        console.error('Usage: imxc watch <dir> -o <output-dir>');
        process.exit(1);
    }
    const { values } = parseArgs({
        args: process.argv.slice(4),
        allowPositionals: false,
        options: { output: { type: 'string', short: 'o' } },
    });
    const outputDir = values.output ?? '.';
    startWatch(path.resolve(watchDir), path.resolve(outputDir));
}
else {
    // Default: build command
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: { output: { type: 'string', short: 'o' } },
    });
    if (positionals.length === 0) {
        console.error('Usage: imxc <input.tsx ...> -o <output-dir>');
        console.error('       imxc init [project-dir]');
        console.error('       imxc watch <dir> -o <output-dir>');
        process.exit(1);
    }
    const outputDir = values.output ?? '.';
    const result = compile(positionals, outputDir);
    if (!result.success) {
        result.errors.forEach(e => console.error(e));
        process.exit(1);
    }
    console.log(`imxc: ${result.componentCount} component(s) compiled successfully.`);
}
