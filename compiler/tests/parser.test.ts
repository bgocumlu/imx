import { describe, it, expect } from 'vitest';
import { parseFile, extractImports } from '../src/parser.js';

describe('parseFile', () => {
    it('parses a simple component', () => {
        const source = `function App() { return <Window title="Hello"><Text>Hi</Text></Window>; }`;
        const result = parseFile('App.tsx', source);
        expect(result.errors).toHaveLength(0);
        expect(result.component).not.toBeNull();
        expect(result.component!.name!.text).toBe('App');
    });

    it('parses component with props', () => {
        const source = `function Greeting(props: { name: string }) { return <Text>Hello {props.name}</Text>; }`;
        const result = parseFile('Greeting.tsx', source);
        expect(result.errors).toHaveLength(0);
    });

    it('errors on no function', () => {
        const source = `const x = 42;`;
        const result = parseFile('Bad.tsx', source);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('errors on multiple functions', () => {
        const source = `function A() { return <Text>A</Text>; }\nfunction B() { return <Text>B</Text>; }`;
        const result = parseFile('Multi.tsx', source);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('Only one component');
    });

    it('allows imports', () => {
        const source = `import { TodoItem } from './TodoItem';\nfunction App() { return <TodoItem />; }`;
        const result = parseFile('App.tsx', source);
        expect(result.errors).toHaveLength(0);
    });
});

describe('extractImports', () => {
    it('extracts named imports', () => {
        const source = `import { TodoItem } from './TodoItem';\nimport { Header, Footer } from './Layout';\nfunction App() { return <Text>Hi</Text>; }`;
        const result = parseFile('App.tsx', source);
        const imports = extractImports(result.sourceFile);
        expect(imports.get('TodoItem')).toBe('./TodoItem');
        expect(imports.get('Header')).toBe('./Layout');
        expect(imports.get('Footer')).toBe('./Layout');
    });
});
