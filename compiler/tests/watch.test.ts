import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import { selectWatchCompileFiles } from '../src/watch.js';

describe('selectWatchCompileFiles', () => {
    it('prefers src/App.tsx as the watch root', () => {
        const watchDir = path.resolve('project');
        const selection = selectWatchCompileFiles(watchDir, [
            path.join(watchDir, 'src', 'Zed.tsx'),
            path.join(watchDir, 'src', 'App.tsx'),
            path.join(watchDir, 'AaaRootTrap.tsx'),
        ].map(file => path.resolve(file)));

        expect(selection.rootFile.replace(/\\/g, '/')).toBe(path.join(watchDir, 'src', 'App.tsx').replace(/\\/g, '/'));
        expect(selection.files[0].replace(/\\/g, '/')).toBe(path.join(watchDir, 'src', 'App.tsx').replace(/\\/g, '/'));
    });

    it('falls back to App.tsx at the watch root', () => {
        const watchDir = path.resolve('project');
        const selection = selectWatchCompileFiles(watchDir, [
            path.join(watchDir, 'Sidebar.tsx'),
            path.join(watchDir, 'App.tsx'),
        ].map(file => path.resolve(file)));

        expect(selection.rootFile.replace(/\\/g, '/')).toBe(path.join(watchDir, 'App.tsx').replace(/\\/g, '/'));
    });

    it('falls back to the first file alphabetically', () => {
        const watchDir = path.resolve('project');
        const selection = selectWatchCompileFiles(watchDir, [
            path.join(watchDir, 'zeta.tsx'),
            path.join(watchDir, 'alpha.tsx'),
        ].map(file => path.resolve(file)));

        expect(path.basename(selection.rootFile)).toBe('alpha.tsx');
    });
});
