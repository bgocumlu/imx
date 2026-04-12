import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { compile } from './compile.js';
/**
 * Discover all .tsx files in a directory (recursive).
 */
export function discoverTsxFiles(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...discoverTsxFiles(fullPath));
        }
        else if (entry.isFile() && entry.name.endsWith('.tsx')) {
            results.push(fullPath);
        }
    }
    return results;
}
export function selectWatchCompileFiles(watchDir, discoveredFiles) {
    const files = [...discoveredFiles].sort((a, b) => a.localeCompare(b));
    const normalizedDir = path.resolve(watchDir);
    const preferredCandidates = [
        path.join(normalizedDir, 'src', 'App.tsx'),
        path.join(normalizedDir, 'App.tsx'),
    ].map(candidate => path.resolve(candidate));
    const appCandidates = files.filter(file => path.basename(file) === 'App.tsx');
    const rootFile = preferredCandidates.find(candidate => files.includes(candidate)) ??
        files[0];
    if (rootFile !== files[0]) {
        const remaining = files.filter(file => file !== rootFile);
        return { files: [rootFile, ...remaining], rootFile, appCandidates };
    }
    return { files, rootFile, appCandidates };
}
function runCompile(watchDir, outputDir, buildCmd) {
    const discoveredFiles = discoverTsxFiles(watchDir);
    if (discoveredFiles.length === 0) {
        console.log('[watch] No .tsx files found in ' + watchDir);
        return;
    }
    const selection = selectWatchCompileFiles(watchDir, discoveredFiles);
    const rootRelative = path.relative(process.cwd(), selection.rootFile).replace(/\\/g, '/');
    if (selection.appCandidates.length > 1) {
        console.warn(`[watch] multiple App.tsx candidates found; using ${rootRelative} as root`);
    }
    else {
        console.log(`[watch] root: ${rootRelative}`);
    }
    const start = performance.now();
    const result = compile(selection.files, outputDir);
    const elapsed = Math.round(performance.now() - start);
    if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.warn(w));
    }
    if (result.success) {
        console.log(`[watch] ${result.componentCount} component(s) compiled in ${elapsed}ms`);
        if (buildCmd) {
            console.log(`[watch] running: ${buildCmd}`);
            try {
                execSync(buildCmd, { stdio: 'inherit' });
                console.log('[watch] build succeeded');
            }
            catch {
                console.error('[watch] build failed');
            }
        }
    }
    else {
        result.errors.forEach(e => console.error(e));
        console.log(`[watch] compilation failed (${elapsed}ms)`);
    }
}
/**
 * Start watching a directory for .tsx changes and recompile on change.
 * If buildCmd is provided, runs it after each successful compile (for hot reload).
 */
export function startWatch(watchDir, outputDir, buildCmd) {
    console.log(`[watch] watching ${watchDir} for .tsx changes...`);
    console.log(`[watch] output: ${outputDir}`);
    if (buildCmd)
        console.log(`[watch] build: ${buildCmd}`);
    console.log('[watch] press Ctrl+C to stop\n');
    // Initial compile
    runCompile(watchDir, outputDir, buildCmd);
    // Debounce timer
    let debounceTimer = null;
    const watcher = fs.watch(watchDir, { recursive: true }, (_event, filename) => {
        if (!filename || !filename.endsWith('.tsx'))
            return;
        // Debounce: wait 100ms after last change before recompiling
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            console.log(`\n[watch] change detected: ${filename}`);
            runCompile(watchDir, outputDir, buildCmd);
        }, 100);
    });
    // Clean shutdown on Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n[watch] stopped.');
        watcher.close();
        process.exit(0);
    });
}
