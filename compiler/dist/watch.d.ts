/**
 * Discover all .tsx files in a directory (recursive).
 */
export declare function discoverTsxFiles(dir: string): string[];
export interface WatchCompileSelection {
    files: string[];
    rootFile: string;
    appCandidates: string[];
}
export declare function selectWatchCompileFiles(watchDir: string, discoveredFiles: string[]): WatchCompileSelection;
/**
 * Start watching a directory for .tsx changes and recompile on change.
 * If buildCmd is provided, runs it after each successful compile (for hot reload).
 */
export declare function startWatch(watchDir: string, outputDir: string, buildCmd?: string): void;
