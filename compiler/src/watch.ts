import * as fs from 'node:fs';
import * as path from 'node:path';
import { compile } from './compile.js';

/**
 * Discover all .tsx files in a directory (recursive).
 */
function discoverTsxFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...discoverTsxFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
            results.push(fullPath);
        }
    }
    return results;
}

function runCompile(watchDir: string, outputDir: string): void {
    const files = discoverTsxFiles(watchDir);
    if (files.length === 0) {
        console.log('[watch] No .tsx files found in ' + watchDir);
        return;
    }

    const start = performance.now();
    const result = compile(files, outputDir);
    const elapsed = Math.round(performance.now() - start);

    if (result.success) {
        console.log(`[watch] ${result.componentCount} component(s) compiled in ${elapsed}ms`);
    } else {
        result.errors.forEach(e => console.error(e));
        console.log(`[watch] compilation failed (${elapsed}ms)`);
    }
}

/**
 * Start watching a directory for .tsx changes and recompile on change.
 */
export function startWatch(watchDir: string, outputDir: string): void {
    console.log(`[watch] watching ${watchDir} for .tsx changes...`);
    console.log(`[watch] output: ${outputDir}`);
    console.log('[watch] press Ctrl+C to stop\n');

    // Initial compile
    runCompile(watchDir, outputDir);

    // Debounce timer
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const watcher = fs.watch(watchDir, { recursive: true }, (_event: string, filename: string | null) => {
        if (!filename || !filename.endsWith('.tsx')) return;

        // Debounce: wait 100ms after last change before recompiling
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log(`\n[watch] change detected: ${filename}`);
            runCompile(watchDir, outputDir);
        }, 100);
    });

    // Clean shutdown on Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n[watch] stopped.');
        watcher.close();
        process.exit(0);
    });
}
