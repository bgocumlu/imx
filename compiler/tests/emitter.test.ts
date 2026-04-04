import { describe, it, expect } from 'vitest';
import { parseIgxFile } from '../src/parser.js';
import { validate } from '../src/validator.js';
import { lowerComponent } from '../src/lowering.js';
import { emitComponent, emitComponentHeader, emitRoot } from '../src/emitter.js';

function compile(source: string): string {
    const parsed = parseIgxFile('Test.igx', source);
    expect(parsed.errors).toHaveLength(0);
    const validation = validate(parsed);
    expect(validation.errors).toHaveLength(0);
    const ir = lowerComponent(parsed, validation);
    return emitComponent(ir);
}

function compileHeader(source: string): string {
    const parsed = parseIgxFile('Test.igx', source);
    expect(parsed.errors).toHaveLength(0);
    const validation = validate(parsed);
    expect(validation.errors).toHaveLength(0);
    const ir = lowerComponent(parsed, validation);
    return emitComponentHeader(ir);
}

describe('emitComponent', () => {
    it('emits a simple component with state and button', () => {
        const output = compile(`
function App() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Hello">
      <Button title="Click" onPress={() => setCount(count + 1)} />
    </Window>
  );
}
        `);

        expect(output).toContain('#include <reimgui/runtime.h>');
        expect(output).toContain('#include <reimgui/renderer.h>');
        expect(output).toContain('void App_render(reimgui::RenderContext& ctx)');
        expect(output).toContain('use_state<int>(0, 0)');
        expect(output).toContain('begin_window("Hello")');
        expect(output).toContain('reimgui::renderer::button("Click")');
        expect(output).toContain('count.set(count.get() + 1)');
        expect(output).toContain('end_window()');
    });

    it('emits conditional rendering', () => {
        const output = compile(`
function App() {
  const [show, setShow] = useState(true);
  return (
    <Window title="Test">
      {show && <Text>Visible</Text>}
    </Window>
  );
}
        `);

        expect(output).toContain('if (show.get())');
        expect(output).toContain('reimgui::renderer::text("Visible")');
    });

    it('emits component with props struct', () => {
        const source = `
function Greeting(props: { name: string, age: number }) {
  return <Text>Hello {props.name}</Text>;
}
        `;

        // The .gen.cpp now includes its own .gen.h instead of inlining the struct
        const output = compile(source);
        expect(output).toContain('#include "Greeting.gen.h"');
        expect(output).toContain('const GreetingProps& props');
        expect(output).toContain('reimgui::renderer::text(');

        // The struct is in the header
        const header = compileHeader(source);
        expect(header).toContain('struct GreetingProps');
        expect(header).toContain('std::string name;');
        expect(header).toContain('int age;');
        expect(header).toContain('void Greeting_render(reimgui::RenderContext& ctx, const GreetingProps& props);');
    });

    it('emits ternary conditional with else', () => {
        const output = compile(`
function App() {
  const [on, setOn] = useState(false);
  return (
    <Window title="Test">
      {on ? <Text>On</Text> : <Text>Off</Text>}
    </Window>
  );
}
        `);

        expect(output).toContain('if (on.get())');
        expect(output).toContain('} else {');
        expect(output).toContain('"On"');
        expect(output).toContain('"Off"');
    });

    it('emits TextInput with buffer sync pattern', () => {
        const output = compile(`
function App() {
  const [name, setName] = useState("");
  return (
    <Window title="Test">
      <TextInput value={name} onChange={() => setName(name)} label="Name" />
    </Window>
  );
}
        `);

        expect(output).toContain('ctx.get_buffer(0)');
        expect(output).toContain('sync_from(name.get())');
        expect(output).toContain('reimgui::renderer::text_input("Name"');
        expect(output).toContain('name.set(buf.value())');
    });

    it('emits Checkbox with temp bool pattern', () => {
        const output = compile(`
function App() {
  const [checked, setChecked] = useState(false);
  return (
    <Window title="Test">
      <Checkbox value={checked} onChange={() => setChecked(!checked)} label="Check" />
    </Window>
  );
}
        `);

        expect(output).toContain('bool val = checked.get()');
        expect(output).toContain('reimgui::renderer::checkbox("Check", &val)');
        expect(output).toContain('checked.set(val)');
    });
});

describe('emitRoot', () => {
    it('emits root entry point function', () => {
        const output = emitRoot('App', 2, 1);

        expect(output).toContain('#include <reimgui/runtime.h>');
        expect(output).toContain('void App_render(reimgui::RenderContext& ctx);');
        expect(output).toContain('namespace reimgui {');
        expect(output).toContain('void render_root(Runtime& runtime)');
        expect(output).toContain('runtime.begin_frame()');
        expect(output).toContain('ctx.begin_instance("App", 0, 2, 1)');
        expect(output).toContain('App_render(ctx)');
        expect(output).toContain('ctx.end_instance()');
        expect(output).toContain('runtime.end_frame()');
        expect(output).toContain('} // namespace reimgui');
    });
});
