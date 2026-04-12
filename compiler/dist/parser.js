import ts from 'typescript';
import * as path from 'node:path';
function formatError(sourceFile, node, message) {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return { file: sourceFile.fileName, line: line + 1, col: character + 1, message };
}
export function normalizeDisplayPath(filePath) {
    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(process.cwd(), absolutePath);
    const displayPath = relativePath &&
        !relativePath.startsWith('..') &&
        !path.isAbsolute(relativePath)
        ? relativePath
        : absolutePath;
    return displayPath.replace(/\\/g, '/');
}
export function parseFile(filePath, source) {
    const displayPath = normalizeDisplayPath(filePath);
    const sourceFile = ts.createSourceFile(displayPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const errors = [];
    let component = null;
    for (const stmt of sourceFile.statements) {
        if (ts.isFunctionDeclaration(stmt) && stmt.name) {
            if (component !== null) {
                errors.push(formatError(sourceFile, stmt, 'Only one component function per file is supported'));
            }
            else {
                component = stmt;
            }
        }
        else if (ts.isInterfaceDeclaration(stmt)) {
            // allowed
        }
        else if (ts.isImportDeclaration(stmt)) {
            // allowed
        }
        else {
            errors.push(formatError(sourceFile, stmt, `Unsupported top-level statement: ${ts.SyntaxKind[stmt.kind]}`));
        }
    }
    if (!component && errors.length === 0) {
        errors.push({ file: displayPath, line: 1, col: 1, message: 'No component function found in file' });
    }
    return { sourceFile, filePath: path.resolve(filePath), component, errors };
}
export function extractImports(sourceFile) {
    const imports = new Map();
    for (const stmt of sourceFile.statements) {
        if (ts.isImportDeclaration(stmt) && stmt.importClause) {
            const moduleSpecifier = stmt.moduleSpecifier.text;
            const bindings = stmt.importClause.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) {
                for (const spec of bindings.elements) {
                    imports.set(spec.name.text, moduleSpecifier);
                }
            }
        }
    }
    return imports;
}
