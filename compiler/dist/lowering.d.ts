import ts from 'typescript';
import type { ParsedFile } from './parser.js';
import type { ValidationResult } from './validator.js';
import type { IRComponent, IRStateSlot } from './ir.js';
interface LoweringContext {
    stateVars: Map<string, IRStateSlot>;
    setterMap: Map<string, string>;
    propsParam: string | null;
    propsFieldTypes: Map<string, string | 'callback'>;
    bufferIndex: number;
    mapCounter: number;
    sourceFile: ts.SourceFile;
    customComponents: Map<string, string>;
}
export declare function lowerComponent(parsed: ParsedFile, validation: ValidationResult, externalInterfaces?: Map<string, Map<string, string | 'callback'>>): IRComponent;
/**
 * Convert a TypeScript expression to C++ code string.
 */
export declare function exprToCpp(node: ts.Expression, ctx: LoweringContext): string;
export {};
