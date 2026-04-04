import { describe, it, expect } from 'vitest';
import { formatDiagnostic } from '../src/diagnostics.js';

describe('formatDiagnostic', () => {
    it('shows source line and caret for a simple error', () => {
        const source = `function App() {\n  return <Slider />;\n}`;
        const error = { file: 'App.tsx', line: 2, col: 10, message: 'Unknown component: <Slider>' };
        const output = formatDiagnostic(error, source);

        expect(output).toContain('App.tsx:2:10 - error: Unknown component: <Slider>');
        expect(output).toContain('return <Slider />');
        expect(output).toContain('^');
    });

    it('handles single-character errors', () => {
        const source = `x`;
        const error = { file: 'Test.tsx', line: 1, col: 1, message: 'bad' };
        const output = formatDiagnostic(error, source);

        expect(output).toContain('Test.tsx:1:1 - error: bad');
        expect(output).toContain('^');
    });

    it('handles out-of-bounds line gracefully', () => {
        const source = `line1\nline2`;
        const error = { file: 'Test.tsx', line: 99, col: 1, message: 'gone' };
        const output = formatDiagnostic(error, source);

        // Just the header, no source context
        expect(output).toBe('Test.tsx:99:1 - error: gone');
    });
});
