export interface CompileResult {
    success: boolean;
    componentCount: number;
    errors: string[];
}
/**
 * Compile a list of .tsx files and write generated C++ to outputDir.
 * Returns a result object instead of calling process.exit().
 */
export declare function compile(files: string[], outputDir: string): CompileResult;
