import type { IRComponent } from './ir.js';
/**
 * Emit a .gen.h header for a component that has props.
 * Contains the props struct and function forward declaration.
 */
export declare function emitComponentHeader(comp: IRComponent, sourceFile?: string): string;
export interface ImportInfo {
    name: string;
    headerFile: string;
}
export declare function emitComponent(comp: IRComponent, imports?: ImportInfo[], sourceFile?: string): string;
export declare function emitRoot(rootName: string, stateCount: number, bufferCount: number, sourceFile?: string): string;
