import { describe, it, expect, vi } from 'vitest';

describe('cli entrypoint', () => {
    it('sets process.exitCode instead of forcing an immediate exit', async () => {
        vi.resetModules();

        const runCli = vi.fn(async () => 0);
        vi.doMock('../src/cli.js', () => ({ runCli }));

        const originalArgv = process.argv;
        const originalExitCode = process.exitCode;
        const exitSpy = vi.spyOn(process, 'exit');
        process.argv = ['node', 'imxc', 'watch', 'src', '-o', 'build/generated'];
        process.exitCode = undefined;

        try {
            await import('../src/index.ts');
            expect(runCli).toHaveBeenCalledWith(['watch', 'src', '-o', 'build/generated']);
            expect(process.exitCode).toBe(0);
            expect(exitSpy).not.toHaveBeenCalled();
        } finally {
            process.argv = originalArgv;
            process.exitCode = originalExitCode;
            exitSpy.mockRestore();
        }
    });
});
