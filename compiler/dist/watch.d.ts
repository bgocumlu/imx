/**
 * Start watching a directory for .tsx changes and recompile on change.
 * If buildCmd is provided, runs it after each successful compile (for hot reload).
 */
export declare function startWatch(watchDir: string, outputDir: string, buildCmd?: string): void;
