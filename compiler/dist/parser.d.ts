import ts from 'typescript';
export interface ParsedFile {
    sourceFile: ts.SourceFile;
    filePath: string;
    component: ts.FunctionDeclaration | null;
    errors: ParseError[];
}
export interface ParseError {
    file: string;
    line: number;
    col: number;
    message: string;
    severity?: 'error' | 'warning';
}
export declare function normalizeDisplayPath(filePath: string): string;
export declare function parseFile(filePath: string, source: string): ParsedFile;
export declare function extractImports(sourceFile: ts.SourceFile): Map<string, string>;
