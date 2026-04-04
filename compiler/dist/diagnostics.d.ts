import type { ParseError } from './parser.js';
/**
 * Format a diagnostic error with source context, caret underline, and color.
 */
export declare function formatDiagnostic(error: ParseError, source: string): string;
