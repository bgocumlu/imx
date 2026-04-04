import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/parser.js';
import { validate } from '../src/validator.js';

describe('validate', () => {
    it('validates correct component', () => {
        const source = `function App() { const [count, setCount] = useState(0); return <Window title="Hello"><Text>Hi</Text></Window>; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.useStateCalls).toHaveLength(1);
        expect(result.useStateCalls[0]).toMatchObject({ name: 'count', setter: 'setCount', index: 0 });
    });

    it('passes unknown elements as native widgets', () => {
        const source = `function App() { return <Knob value={0} />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
    });

    it('errors on missing required prop', () => {
        const source = `function App() { return <Button />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors.some(e => e.message.includes("requires prop 'title'"))).toBe(true);
    });

    it('assigns sequential slot indices', () => {
        const source = `function App() { const [a, setA] = useState(0); const [b, setB] = useState("x"); const [c, setC] = useState(true); return <Text>Hi</Text>; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.useStateCalls[0]).toMatchObject({ name: 'a', index: 0 });
        expect(result.useStateCalls[1]).toMatchObject({ name: 'b', index: 1 });
        expect(result.useStateCalls[2]).toMatchObject({ name: 'c', index: 2 });
    });

    it('accepts imported custom components', () => {
        const source = `import { TodoItem } from './TodoItem';\nfunction App() { return <TodoItem />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
    });
});
