import { describe, it, expect } from 'vitest';
import { parseFile } from '../src/parser.js';
import { validate } from '../src/validator.js';
import { lowerComponent } from '../src/lowering.js';
import { emitComponent, emitComponentHeader, emitRoot } from '../src/emitter.js';

function compile(source: string, sourceFile?: string): string {
    const parsed = parseFile('Test.tsx', source);
    expect(parsed.errors).toHaveLength(0);
    const validation = validate(parsed);
    expect(validation.errors).toHaveLength(0);
    const ir = lowerComponent(parsed, validation);
    return emitComponent(ir, undefined, sourceFile);
}

function compileHeader(source: string): string {
    const parsed = parseFile('Test.tsx', source);
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

        expect(output).toContain('#include <imx/runtime.h>');
        expect(output).toContain('#include <imx/renderer.h>');
        expect(output).toContain('void App_render(imx::RenderContext& ctx)');
        expect(output).toContain('use_state<int>(0, 0)');
        expect(output).toContain('begin_window("Hello", 0)');
        expect(output).toContain('imx::renderer::button("Click")');
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
        expect(output).toContain('imx::renderer::text("Visible")');
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
        expect(output).toContain('imx::renderer::text(');

        // The struct is in the header
        const header = compileHeader(source);
        expect(header).toContain('struct GreetingProps');
        expect(header).toContain('std::string name;');
        expect(header).toContain('int age;');
        expect(header).toContain('void Greeting_render(imx::RenderContext& ctx, const GreetingProps& props);');
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
        expect(output).toContain('imx::renderer::text_input("Name"');
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
        expect(output).toContain('imx::renderer::checkbox("Check", &val)');
        expect(output).toContain('checked.set(val)');
    });
    it('emits Theme with preset and overrides', () => {
        const output = compile(`
function App() {
  return (
    <Theme preset="dark" accentColor={[0.2, 0.5, 1.0, 1.0]} rounding={6}>
      <DockSpace>
        <Window title="Test">
          <Text>Hello</Text>
        </Window>
      </DockSpace>
    </Theme>
  );
}
        `);

        expect(output).toContain('imx::renderer::begin_theme(');
        expect(output).toContain('"dark"');
        expect(output).toContain('accent_color = ImVec4(');
        expect(output).toContain('rounding =');
        expect(output).toContain('imx::renderer::end_theme()');
    });

    it('emits DockLayout with setup function and conditional', () => {
        const output = compile(`
function App() {
  return (
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={0.25}>
          <DockPanel>
            <Window title="Left" />
          </DockPanel>
          <DockPanel>
            <Window title="Right" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <Window title="Left"><Text>L</Text></Window>
      <Window title="Right"><Text>R</Text></Window>
    </DockSpace>
  );
}
        `);

        expect(output).toContain('static bool g_layout_applied = false');
        expect(output).toContain('static bool g_reset_layout = false');
        expect(output).toContain('void imx_reset_layout()');
        expect(output).toContain('g_reset_layout = true');
        expect(output).toContain('App_setup_dock_layout(ImGuiID dockspace_id)');
        expect(output).toContain('DockBuilderRemoveNode');
        expect(output).toContain('DockBuilderSplitNode');
        expect(output).toContain('DockBuilderDockWindow("Left"');
        expect(output).toContain('DockBuilderDockWindow("Right"');
        expect(output).toContain('DockBuilderFinish');
        expect(output).toContain('DockBuilderGetNode(dock_id)');
        expect(output).toContain('IsSplitNode()');
        expect(output).toContain('#include <imgui_internal.h>');
    });

    it('emits native widget with WidgetArgs dispatch', () => {
        const output = compile(`
function App() {
  const [vol, setVol] = useState(0.5);
  return (
    <Window title="Test">
      <Knob value={vol} min={0} max={1} onChange={(v: number) => setVol(v)} />
    </Window>
  );
}
        `);

        expect(output).toContain('imx::WidgetArgs _wa("Knob##nw_0")');
        expect(output).toContain('_wa.set("value", vol.get())');
        expect(output).toContain('_wa.set("min", 0)');
        expect(output).toContain('_wa.set("max", 1)');
        expect(output).toContain('_wa.set_callback("onChange"');
        expect(output).toContain('std::any_cast<float>(_v)');
        expect(output).toContain('vol.set(');
        expect(output).toContain('imx::call_widget("Knob", _wa)');
    });

    it('emits native widget void callback', () => {
        const output = compile(`
function App() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Test">
      <MyButton onPress={() => setCount(count + 1)} />
    </Window>
  );
}
        `);

        expect(output).toContain('imx::WidgetArgs _wa("MyButton##nw_0")');
        expect(output).toContain('_wa.set_callback("onPress"');
        expect(output).toContain('[&](std::any)');
        expect(output).toContain('count.set(count.get() + 1)');
        expect(output).toContain('imx::call_widget("MyButton", _wa)');
    });

    it('emits resetLayout as imx_reset_layout', () => {
        const output = compile(`
function App() {
  return (
    <DockSpace>
      <MenuBar>
        <Menu label="View">
          <MenuItem label="Reset" onPress={resetLayout} />
        </Menu>
      </MenuBar>
      <Window title="Main"><Text>Content</Text></Window>
    </DockSpace>
  );
}
        `);

        expect(output).toContain('imx_reset_layout()');
    });

    it('emits BulletText', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><BulletText>Hello world</BulletText></Window>;
}
        `);
        expect(output).toContain('imx::renderer::bullet_text("Hello world")');
    });

    it('emits LabelText', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><LabelText label="Name" value="John" /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::label_text("Name", "John")');
    });

    it('emits Selectable with onSelect', () => {
        const output = compile(`
function App() {
  const [sel, setSel] = useState(0);
  return <Window title="Test"><Selectable label="A" selected={sel === 0} onSelect={() => setSel(0)} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::selectable("A"');
        expect(output).toContain('sel.set(0)');
    });

    it('emits Radio with state binding', () => {
        const output = compile(`
function App() {
  const [size, setSize] = useState(0);
  return (
    <Window title="Test">
      <Radio label="Small" value={size} index={0} />
      <Radio label="Large" value={size} index={1} />
    </Window>
  );
}
        `);
        expect(output).toContain('imx::renderer::radio("Small", &val, 0)');
        expect(output).toContain('imx::renderer::radio("Large", &val, 1)');
        expect(output).toContain('size.set(val)');
    });

    it('emits InputTextMultiline with state binding', () => {
        const output = compile(`
function App() {
  const [notes, setNotes] = useState("");
  return <Window title="Test"><InputTextMultiline label="Notes" value={notes} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::text_input_multiline("Notes", buf)');
        expect(output).toContain('buf.sync_from(notes.get())');
        expect(output).toContain('notes.set(buf.value())');
    });

    it('emits ColorPicker with state binding', () => {
        const output = compile(`
function App() {
  const [col, setCol] = useState([1.0, 0.0, 0.0, 1.0]);
  return <Window title="Test"><ColorPicker label="Color" value={col} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::color_picker("Color", val.data())');
        expect(output).toContain('col.set(val)');
    });

    it('emits PlotLines with array values', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><PlotLines label="FPS" values={[60, 58, 62]} /></Window>;
}
        `);
        expect(output).toContain('float _plot_0[] = {60.0f, 58.0f, 62.0f}');
        expect(output).toContain('imx::renderer::plot_lines("FPS", _plot_0, 3');
    });

    it('emits PlotHistogram with overlay', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><PlotHistogram label="Dist" values={[1, 3, 5]} overlay="avg" /></Window>;
}
        `);
        expect(output).toContain('float _plot_0[] = {1.0f, 3.0f, 5.0f}');
        expect(output).toContain('imx::renderer::plot_histogram("Dist", _plot_0, 3, "avg"');
    });
});

describe('source location comments', () => {
    it('emits file banner when sourceFile is provided', () => {
        const output = compile(`
function App() {
  return <Window title="Hello"><Text>Hi</Text></Window>;
}
        `, 'App.tsx');

        expect(output).toContain('// Generated from App.tsx by imxc');
    });

    it('emits per-element source location comments', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Hello">
      <Button title="Click" onPress={() => {}} />
    </Window>
  );
}
        `, 'App.tsx');

        expect(output).toContain('// Test.tsx:4 <Window>');
        expect(output).toContain('// Test.tsx:5 <Button>');
    });

    it('does not emit banner when sourceFile is omitted', () => {
        const output = compile(`
function App() {
  return <Window title="X"><Text>Y</Text></Window>;
}
        `);

        expect(output).not.toContain('// Generated from');
    });
});

describe('emitRoot', () => {
    it('emits root entry point function', () => {
        const output = emitRoot('App', 2, 1);

        expect(output).toContain('#include <imx/runtime.h>');
        expect(output).toContain('void App_render(imx::RenderContext& ctx);');
        expect(output).toContain('namespace imx {');
        expect(output).toContain('void render_root(Runtime& runtime)');
        expect(output).toContain('runtime.begin_frame()');
        expect(output).toContain('ctx.begin_instance("App", 0, 2, 1)');
        expect(output).toContain('App_render(ctx)');
        expect(output).toContain('ctx.end_instance()');
        expect(output).toContain('runtime.end_frame()');
        expect(output).toContain('} // namespace imx');
    });
});
