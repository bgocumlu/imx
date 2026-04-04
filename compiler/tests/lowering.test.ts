import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/parser.js';
import { validate } from '../src/validator.js';
import { lowerComponent } from '../src/lowering.js';

function lower(source: string) {
    const parsed = parseFile('Test.tsx', source);
    expect(parsed.errors).toHaveLength(0);
    const validation = validate(parsed);
    expect(validation.errors).toHaveLength(0);
    return lowerComponent(parsed, validation);
}

describe('lowerComponent', () => {
    it('lowers a simple component with useState and Button', () => {
        const ir = lower(`
function App() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Hello">
      <Button title="Click" onPress={() => setCount(count + 1)} />
    </Window>
  );
}
        `);

        expect(ir.name).toBe('App');
        expect(ir.stateSlots).toHaveLength(1);
        expect(ir.stateSlots[0]).toMatchObject({
            name: 'count',
            setter: 'setCount',
            type: 'int',
            initialValue: '0',
            index: 0,
        });

        // body: begin_container(Window), button, end_container(Window)
        expect(ir.body.length).toBe(3);
        expect(ir.body[0]).toMatchObject({ kind: 'begin_container', tag: 'Window' });
        expect(ir.body[2]).toMatchObject({ kind: 'end_container', tag: 'Window' });

        const button = ir.body[1];
        expect(button.kind).toBe('button');
        if (button.kind === 'button') {
            expect(button.title).toBe('"Click"');
            // The action should contain count.set(count.get() + 1)
            expect(button.action.length).toBeGreaterThan(0);
            expect(button.action[0]).toContain('count.set');
            expect(button.action[0]).toContain('count.get()');
        }
    });

    it('lowers conditional rendering (show && <Text>...)', () => {
        const ir = lower(`
function App() {
  const [show, setShow] = useState(true);
  return (
    <Window title="Test">
      {show && <Text>Visible</Text>}
    </Window>
  );
}
        `);

        // body: begin_container, conditional, end_container
        expect(ir.body.length).toBe(3);
        const cond = ir.body[1];
        expect(cond.kind).toBe('conditional');
        if (cond.kind === 'conditional') {
            expect(cond.condition).toContain('show.get()');
            expect(cond.body.length).toBeGreaterThan(0);
            expect(cond.body[0].kind).toBe('text');
        }
    });

    it('lowers TextInput with buffer index', () => {
        const ir = lower(`
function App() {
  const [name, setName] = useState("");
  return (
    <Window title="Test">
      <TextInput value={name} onChange={() => setName(name)} label="Name" />
    </Window>
  );
}
        `);

        expect(ir.bufferCount).toBe(1);
        const textInput = ir.body[1];
        expect(textInput.kind).toBe('text_input');
        if (textInput.kind === 'text_input') {
            expect(textInput.bufferIndex).toBe(0);
            expect(textInput.stateVar).toBe('name');
            expect(textInput.label).toBe('"Name"');
        }
    });

    it('lowers component with props parameter', () => {
        const ir = lower(`
function Greeting(props: { name: string, age: number }) {
  return <Text>Hello {props.name}</Text>;
}
        `);

        expect(ir.name).toBe('Greeting');
        expect(ir.params).toHaveLength(2);
        expect(ir.params[0]).toMatchObject({ name: 'name', type: 'string' });
        expect(ir.params[1]).toMatchObject({ name: 'age', type: 'int' });

        expect(ir.body.length).toBe(1);
        const text = ir.body[0];
        expect(text.kind).toBe('text');
        if (text.kind === 'text') {
            expect(text.format).toContain('Hello');
            expect(text.format).toContain('%s');
            expect(text.args.length).toBeGreaterThan(0);
            expect(text.args[0]).toContain('props.name');
        }
    });

    it('lowers ternary conditional', () => {
        const ir = lower(`
function App() {
  const [on, setOn] = useState(false);
  return (
    <Window title="Test">
      {on ? <Text>On</Text> : <Text>Off</Text>}
    </Window>
  );
}
        `);

        const cond = ir.body[1];
        expect(cond.kind).toBe('conditional');
        if (cond.kind === 'conditional') {
            expect(cond.condition).toContain('on.get()');
            expect(cond.body.length).toBeGreaterThan(0);
            expect(cond.elseBody).toBeDefined();
            expect(cond.elseBody!.length).toBeGreaterThan(0);
        }
    });

    it('lowers Checkbox with bound state', () => {
        const ir = lower(`
function App() {
  const [checked, setChecked] = useState(false);
  return (
    <Window title="Test">
      <Checkbox value={checked} onChange={() => setChecked(!checked)} label="Check" />
    </Window>
  );
}
        `);

        const checkbox = ir.body[1];
        expect(checkbox.kind).toBe('checkbox');
        if (checkbox.kind === 'checkbox') {
            expect(checkbox.stateVar).toBe('checked');
            expect(checkbox.label).toBe('"Check"');
        }
    });

    it('lowers unknown JSX element as native widget', () => {
        const ir = lower(`
function App() {
  const [vol, setVol] = useState(0.5);
  return (
    <Window title="Test">
      <Knob value={vol} min={0} max={1} onChange={(v: number) => setVol(v)} />
    </Window>
  );
}
        `);

        // body: begin_container(Window), native_widget, end_container(Window)
        expect(ir.body.length).toBe(3);
        const widget = ir.body[1];
        expect(widget.kind).toBe('native_widget');
        if (widget.kind === 'native_widget') {
            expect(widget.name).toBe('Knob');
            expect(widget.props['value']).toContain('vol.get()');
            expect(widget.props['min']).toBe('0');
            expect(widget.props['max']).toBe('1');
            expect(widget.callbackProps['onChange']).toContain('std::any_cast<float>');
            expect(widget.callbackProps['onChange']).toContain('vol.set(v)');
        }
    });
});
