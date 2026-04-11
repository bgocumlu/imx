import ts from 'typescript';
import type { ParsedFile, ParseError } from './parser.js';
export interface ValidationResult {
    errors: ParseError[];
    warnings: ParseError[];
    customComponents: Map<string, string>;
    useStateCalls: UseStateInfo[];
}
export interface UseStateInfo {
    name: string;
    setter: string;
    initializer: ts.Expression;
    index: number;
}
export declare function validate(parsed: ParsedFile): ValidationResult;
