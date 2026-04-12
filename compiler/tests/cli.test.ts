import { describe, it, expect, vi } from 'vitest';
import { runCli, type CliDeps } from '../src/cli.js';

function createDeps(overrides: Partial<CliDeps> = {}): { deps: CliDeps; stdout: string[]; stderr: string[] } {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const deps: CliDeps = {
        compile: vi.fn(() => ({ success: true, componentCount: 1, errors: [], warnings: [] })),
        initProject: vi.fn(),
        addToProject: vi.fn(),
        startWatch: vi.fn(),
        promptProjectName: vi.fn(async () => 'demo'),
        promptTemplateName: vi.fn(async () => 'minimal'),
        templates: [
            { name: 'minimal', description: 'Minimal app' },
            { name: 'hotreload', description: 'Hot reload' },
        ] as any,
        version: '0.6.7',
        stdout: text => { stdout.push(text); },
        stderr: text => { stderr.push(text); },
        ...overrides,
    };
    return { deps, stdout, stderr };
}

describe('runCli', () => {
    it('prints main help with --help', async () => {
        const { deps, stdout } = createDeps();
        const code = await runCli(['--help'], deps);

        expect(code).toBe(0);
        expect(stdout.join('')).toContain('imxc - compile IMX .tsx into native Dear ImGui C++.');
        expect(stdout.join('')).toContain('Root component in explicit builds is the first .tsx input you pass.');
    });

    it('prints version with --version', async () => {
        const { deps, stdout } = createDeps();
        const code = await runCli(['--version'], deps);

        expect(code).toBe(0);
        expect(stdout.join('')).toContain('0.6.7');
    });

    it('prints subcommand help for watch --help', async () => {
        const { deps, stdout } = createDeps();
        const code = await runCli(['watch', '--help'], deps);

        expect(code).toBe(0);
        expect(stdout.join('')).toContain('Usage: imxc watch <dir> -o <output-dir> [--build <cmd>]');
    });

    it('prints a friendly error for unknown options', async () => {
        const { deps, stderr } = createDeps();
        const code = await runCli(['--wat'], deps);

        expect(code).toBe(1);
        expect(stderr.join('')).toContain("imxc: unknown option '--wat'.");
    });

    it('uses compile for explicit build commands', async () => {
        const { deps } = createDeps();
        const code = await runCli(['src/App.tsx', '-o', 'build/generated'], deps);

        expect(code).toBe(0);
        expect(deps.compile).toHaveBeenCalledWith(['src/App.tsx'], 'build/generated');
    });
});
