import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
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

    it('warns on unknown component (not error)', () => {
        const source = `function App() { return <Knob value={0} />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].message).toContain("Unknown component '<Knob>' --");
        expect(result.warnings[0].severity).toBe('warning');
    });

    it('no warning for imported custom component', () => {
        const source = `import { Sidebar } from './Sidebar';\nfunction App() { return <Sidebar />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    it('no warning for native widget declared in imx.d.ts', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imx-validator-'));
        fs.writeFileSync(path.join(tmpDir, 'imx.d.ts'), `
interface KnobProps { value: number; }
declare function Knob(props: KnobProps): any;
`);

        const parsed = parseFile(path.join(tmpDir, 'App.tsx'), `function App() { return <Knob value={0} />; }`);
        const result = validate(parsed);

        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('warns on .map() without ID wrapper', () => {
        const source = `function App() { const items = [1,2]; return <Window title="T">{items.map((item) => <Text>hi</Text>)}</Window>; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.some(w => w.message.includes('<ID scope'))).toBe(true);
    });

    it('no warning on .map() with ID wrapper', () => {
        const source = `function App() { const items = [1,2]; return <Window title="T">{items.map((item, i) => <ID scope={i}><Text>hi</Text></ID>)}</Window>; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.filter(w => w.message.includes('<ID scope'))).toHaveLength(0);
    });

    it('no warning on .map() with TableRow (self-scoping)', () => {
        const source = `function App() { const rows = [1,2]; return <Table columns={["A"]}>{rows.map((r, i) => <TableRow><Text>hi</Text></TableRow>)}</Table>; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings.filter(w => w.message.includes('<ID scope'))).toHaveLength(0);
    });
});
