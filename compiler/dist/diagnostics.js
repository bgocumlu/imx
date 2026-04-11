/**
 * Format a diagnostic error with source context, caret underline, and color.
 */
export function formatDiagnostic(error, source) {
    const lines = source.split('\n');
    const lineIdx = error.line - 1;
    // Header: file:line:col - error/warning: message
    const level = error.severity ?? 'error';
    const header = `${error.file}:${error.line}:${error.col} - ${level}: ${error.message}`;
    if (lineIdx < 0 || lineIdx >= lines.length) {
        return header;
    }
    const sourceLine = lines[lineIdx];
    const lineNum = String(error.line);
    const gutter = lineNum.length + 1;
    // Source line with gutter
    const sourceDisplay = `${' '.repeat(gutter)}|${sourceLine}`;
    // Caret underline: point from error column to end of meaningful content
    const col = error.col - 1;
    const contentEnd = sourceLine.trimEnd().length;
    const caretLen = Math.max(1, contentEnd - col);
    const caretDisplay = `${' '.repeat(gutter)}|${' '.repeat(col)}${'^'.repeat(caretLen)}`;
    return `${header}\n\n${lineNum} ${sourceDisplay}\n${' '.repeat(lineNum.length)} ${caretDisplay}`;
}
