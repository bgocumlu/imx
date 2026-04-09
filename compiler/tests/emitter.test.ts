import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { parseFile } from '../src/parser.js';
import { validate } from '../src/validator.js';
import { lowerComponent } from '../src/lowering.js';
import { emitComponent, emitComponentHeader, emitRoot } from '../src/emitter.js';
import { compile as compileFiles, resolveDragDropTypes } from '../src/compile.js';

function compile(source: string, sourceFile?: string): string {
    const parsed = parseFile('Test.tsx', source);
    expect(parsed.errors).toHaveLength(0);
    const validation = validate(parsed);
    expect(validation.errors).toHaveLength(0);
    const ir = lowerComponent(parsed, validation);
    resolveDragDropTypes(ir.body);
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
        expect(output).toContain('GreetingProps& props');
        expect(output).not.toContain('const GreetingProps& props');
        expect(output).toContain('imx::renderer::text(');

        // The struct is in the header
        const header = compileHeader(source);
        expect(header).toContain('struct GreetingProps');
        expect(header).toContain('std::string name;');
        expect(header).toContain('int age;');
        expect(header).toContain('void Greeting_render(imx::RenderContext& ctx, GreetingProps& props);');
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

    it('emits Modal with open and onClose', () => {
        const output = compile(`
function App() {
  const [show, setShow] = useState(false);
  return (
    <Window title="Test">
      <Modal title="Confirm" open={show} onClose={() => setShow(false)}>
        <Text>Are you sure?</Text>
      </Modal>
    </Window>
  );
}
        `);
        expect(output).toContain('imx::renderer::begin_modal("Confirm", show.get(), &modal_closed)');
        expect(output).toContain('if (modal_closed)');
        expect(output).toContain('show.set(false)');
        expect(output).toContain('imx::renderer::end_modal()');
    });

    it('emits Group with BeginGroup/EndGroup', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Group>
        <Text>Hello</Text>
      </Group>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginGroup()');
        expect(output).toContain('imx::renderer::text("Hello")');
        expect(output).toContain('ImGui::EndGroup()');
    });

    it('emits ID with PushID/PopID', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <ID scope="player1">
        <Text>Player 1</Text>
      </ID>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::PushID("player1")');
        expect(output).toContain('imx::renderer::text("Player 1")');
        expect(output).toContain('ImGui::PopID()');
    });

    it('emits StyleColor with struct-based overrides', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <StyleColor button={[1, 0, 0, 1]} text={[1, 1, 1, 1]}>
        <Button title="Red" onPress={() => {}} />
      </StyleColor>
    </Window>
  );
}
        `);
        expect(output).toContain('imx::StyleColorOverrides');
        expect(output).toContain('.button = ImVec4(');
        expect(output).toContain('.text = ImVec4(');
        expect(output).toContain('begin_style_color(');
        expect(output).toContain('end_style_color()');
    });

    it('emits StyleVar with float and vec2 overrides', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <StyleVar frameRounding={8} framePadding={[12, 6]}>
        <Button title="Styled" onPress={() => {}} />
      </StyleVar>
    </Window>
  );
}
        `);
        expect(output).toContain('imx::StyleVarOverrides');
        expect(output).toContain('.frame_rounding = 8.0F');
        expect(output).toContain('.frame_padding = ImVec2(');
        expect(output).toContain('begin_style_var(');
        expect(output).toContain('end_style_var()');
    });

    it('emits mutable reference for root component with props', () => {
        const output = compile(`
function App(props: { speed: number }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
    </Window>
  );
}
        `);
        // Should use non-const reference for props (mutable binding)
        expect(output).toContain('AppProps& props');
        expect(output).not.toContain('const AppProps& props');
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

    it('emits Image with file path', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><Image src="logo.png" width={100} height={50} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::image("logo.png", 100.0f, 50.0f)');
    });

    it('emits Image with embed mode', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><Image src="logo.png" embed width={100} height={50} /></Window>;
}
        `);
        expect(output).toContain('#include "logo_png.embed.h"');
        expect(output).toContain('imx::renderer::image_embedded("logo_png", logo_png_data, logo_png_size, 100.0f, 50.0f)');
    });

    it('emits DragDropSource with payload', () => {
        const output = compile(`
function App() {
  const [id, setId] = useState(42);
  return (
    <Window title="Test">
      <DragDropSource type="item" payload={id}>
        <Text>Drag me</Text>
      </DragDropSource>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginGroup()');
        expect(output).toContain('imx::renderer::text("Drag me")');
        expect(output).toContain('ImGui::EndGroup()');
        expect(output).toContain('BeginDragDropSource(ImGuiDragDropFlags_SourceAllowNullID)');
        expect(output).toContain('SetDragDropPayload("item"');
        expect(output).toContain('EndDragDropSource()');
    });

    it('emits DragDropTarget with onDrop callback', () => {
        const output = compile(`
function App() {
  const [dropped, setDropped] = useState(0);
  return (
    <Window title="Test">
      <DragDropTarget type="item" onDrop={(val: number) => setDropped(val)}>
        <Text>Drop here</Text>
      </DragDropTarget>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginGroup()');
        expect(output).toContain('ImGui::EndGroup()');
        expect(output).toContain('BeginDragDropTarget()');
        expect(output).toContain('AcceptDragDropPayload("item")');
        expect(output).toContain('dropped.set(');
        expect(output).toContain('EndDragDropTarget()');
    });

    it('emits Canvas with begin/end', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Canvas width={300} height={200}>
        <DrawLine p1={[0, 0]} p2={[300, 200]} color={[1, 0, 0, 1]} thickness={2} />
      </Canvas>
    </Window>
  );
}
        `);
        expect(output).toContain('begin_canvas(');
        expect(output).toContain('draw_line(');
        expect(output).toContain('end_canvas()');
    });

    it('emits DrawRect with filled flag', () => {
        const output = compile(`
function App() {
  return (
    <Canvas width={100} height={100}>
      <DrawRect min={[10, 10]} max={[90, 90]} color={[0, 1, 0, 1]} filled rounding={4} />
    </Canvas>
  );
}
        `);
        expect(output).toContain('draw_rect(');
        expect(output).toContain('true');
    });

    it('emits DrawCircle and DrawText', () => {
        const output = compile(`
function App() {
  return (
    <Canvas width={200} height={200}>
      <DrawCircle center={[100, 100]} radius={50} color={[0, 0, 1, 1]} />
      <DrawText pos={[10, 10]} text="Hello" color={[1, 1, 1, 1]} />
    </Canvas>
  );
}
        `);
        expect(output).toContain('draw_circle(');
        expect(output).toContain('draw_text(');
    });

    it('emits Disabled with BeginDisabled/EndDisabled', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Disabled>
        <Button title="Nope" onPress={() => {}} />
      </Disabled>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginDisabled(true)');
        expect(output).toContain('imx::renderer::button("Nope")');
        expect(output).toContain('ImGui::EndDisabled()');
    });

    it('emits Child with BeginChild/EndChild', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Child id="scroll" width={200} height={300} border>
        <Text>Scrollable</Text>
      </Child>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginChild("scroll"');
        expect(output).toContain('200.0F');
        expect(output).toContain('300.0F');
        expect(output).toContain('true');
        expect(output).toContain('ImGui::EndChild()');
    });

    it('emits direct pointer binding for props without onChange', () => {
        const output = compile(`
function App(props: { speed: number, muted: boolean }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
      <Checkbox label="Muted" value={props.muted} />
    </Window>
  );
}
        `);
        expect(output).toContain('&props.speed');
        expect(output).toContain('&props.muted');
        // Should NOT contain temp variable pattern
        expect(output).not.toContain('float val = props.speed');
        expect(output).not.toContain('bool val = props.muted');
    });

    it('emits render_root with state parameter when root has props', () => {
        const parsed = parseFile('Test.tsx', `
function App(props: { speed: number }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
    </Window>
  );
}
        `);
        expect(parsed.errors).toHaveLength(0);
        const validation = validate(parsed);
        expect(validation.errors).toHaveLength(0);
        const ir = lowerComponent(parsed, validation);
        const root = emitRoot(ir.name, ir.stateSlots.length, ir.bufferCount, undefined, ir.params.length > 0 ? ir.name + 'Props' : undefined);
        expect(root).toContain('render_root(Runtime& runtime, AppProps& state)');
        expect(root).toContain('App_render(ctx, state)');
    });

    it('emits auto& reference in .map() loop for direct binding', () => {
        const output = compile(`
function App(props: { items: number[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <Text key={i}>{item}</Text>
      ))}
    </Window>
  );
}
        `);
        expect(output).toContain('auto& item = props.items[_map_idx_0]');
        expect(output).toMatch(/size_t i = _map_idx_0/);
    });

    it('emits TextInput with direct struct binding', () => {
        const output = compile(`
function App(props: { name: string }) {
  return (
    <Window title="Test">
      <TextInput value={props.name} label="Name" />
    </Window>
  );
}
        `);

        expect(output).toContain('buf.sync_from(props.name)');
        expect(output).toContain('imx::renderer::text_input("Name"');
        expect(output).toContain('props.name = buf.value()');
        expect(output).not.toContain('.get()');
        expect(output).not.toContain('.set(');
    });

    it('emits TextInput with onChange callback', () => {
        const output = compile(`
function App(props: { name: string, onNameChange: (v: string) => void }) {
  return (
    <Window title="Test">
      <TextInput value={props.name} onChange={(v: string) => props.onNameChange(v)} label="Name" />
    </Window>
  );
}
        `);

        expect(output).toContain('buf.sync_from(props.name)');
        expect(output).toContain('imx::renderer::text_input("Name"');
        expect(output).toContain('onNameChange');
        expect(output).not.toContain('props.name = buf.value()');
    });

    it('emits unique loop counters for nested maps', () => {
        const output = compile(`
function App(props: { groups: { items: number[] }[] }) {
  return (
    <Window title="Test">
      {props.groups.map((group, i) => (
        <View>
          {group.items.map((item, i) => (
            <Text>{item}</Text>
          ))}
        </View>
      ))}
    </Window>
  );
}
        `);

        expect(output).toContain('_map_idx_0');
        expect(output).toContain('_map_idx_1');
        expect(output).toMatch(/size_t i = _map_idx_0/);
        expect(output).toMatch(/size_t i = _map_idx_1/);
    });

    it('emits DragDrop payload type matching target onDrop annotation', () => {
        const output = compile(`
function App(props: { items: { id: number, name: string }[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <DragDropSource type="item" payload={item.id}>
          <Text>{item.name}</Text>
        </DragDropSource>
      ))}
      <DragDropTarget type="item" onDrop={(id: number) => {}}>
        <Text>Drop here</Text>
      </DragDropTarget>
    </Window>
  );
}
        `);

        // Default for number is float — but verify the pipeline connects source to target
        expect(output).toContain('float _dd_payload');
    });

    it('emits DragDrop boolean payload when target uses boolean type', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <DragDropSource type="flag" payload={true}>
        <Text>Drag</Text>
      </DragDropSource>
      <DragDropTarget type="flag" onDrop={(v: boolean) => {}}>
        <Text>Drop here</Text>
      </DragDropTarget>
    </Window>
  );
}
        `);

        expect(output).toContain('bool _dd_payload');
        expect(output).not.toContain('float _dd_payload');
    });
});

function compileMultiFiles(files: Record<string, string>): Record<string, string> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imx-test-'));
    const outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });

    const paths: string[] = [];
    for (const [name, content] of Object.entries(files)) {
        const filePath = path.join(tmpDir, name);
        fs.writeFileSync(filePath, content);
        paths.push(filePath);
    }

    compileFiles(paths, outDir);

    const result: Record<string, string> = {};
    for (const file of fs.readdirSync(outDir)) {
        result[file] = fs.readFileSync(path.join(outDir, file), 'utf-8');
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return result;
}

describe('custom component pointer propagation', () => {
    it('emits pointer props for custom components with direct binding', () => {
        const files = compileMultiFiles({
            'App.tsx': `
import { TodoItem } from './TodoItem';
export default function App(props: { items: { done: boolean, text: string }[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <TodoItem done={item.done} text={item.text} />
      ))}
    </Window>
  );
}`,
            'TodoItem.tsx': `
export function TodoItem(props: { done: boolean, text: string }) {
  return (
    <Row>
      <Checkbox value={props.done} />
      <Text>{props.text}</Text>
    </Row>
  );
}`
        });

        const header = files['TodoItem.gen.h'] ?? '';
        const todoCpp = files['TodoItem.gen.cpp'] ?? '';
        const appCpp = files['App.gen.cpp'] ?? '';

        // Props struct should have bool* for bound prop
        expect(header).toContain('bool* done');

        // Call site should pass address
        expect(appCpp).toContain('&item.done');

        // Inside TodoItem, checkbox uses pointer directly (no extra &)
        expect(todoCpp).toContain('props.done');
        // Text for non-bound prop should NOT dereference
        expect(todoCpp).not.toContain('(*props.text)');
    });

    it('dereferences bound props in conditional expressions', () => {
        const files = compileMultiFiles({
            'App.tsx': `
import { StatusItem } from './StatusItem';
export default function App(props: { items: { active: boolean }[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <StatusItem active={item.active} />
      ))}
    </Window>
  );
}`,
            'StatusItem.tsx': `
export function StatusItem(props: { active: boolean }) {
  return (
    <View>
      {props.active && <Text>Active</Text>}
      <Checkbox value={props.active} />
    </View>
  );
}`
        });

        const todoCpp = files['StatusItem.gen.cpp'] ?? '';

        // Conditional should dereference: (*props.active)
        expect(todoCpp).toContain('(*props.active)');
        // Checkbox directBind should use &*props.active (identity for pointer)
        expect(todoCpp).toContain('&*props.active');
    });

    it('chains pointer props through 3 levels of components', () => {
        const files = compileMultiFiles({
            'App.tsx': `
import { Panel } from './Panel';
export default function App(props: { items: { done: boolean }[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <Panel done={item.done} />
      ))}
    </Window>
  );
}`,
            'Panel.tsx': `
import { Toggle } from './Toggle';
export function Panel(props: { done: boolean }) {
  return (
    <View>
      <Toggle done={props.done} />
    </View>
  );
}`,
            'Toggle.tsx': `
export function Toggle(props: { done: boolean }) {
  return <Checkbox value={props.done} />;
}`
        });

        const toggleH = files['Toggle.gen.h'] ?? '';
        const panelH = files['Panel.gen.h'] ?? '';
        const panelCpp = files['Panel.gen.cpp'] ?? '';
        const appCpp = files['App.gen.cpp'] ?? '';

        // Toggle has bool* done (leaf component with directBind)
        expect(toggleH).toContain('bool* done');
        // Panel also has bool* done (passes through to Toggle which needs pointer)
        expect(panelH).toContain('bool* done');
        // App passes &item.done to Panel
        expect(appCpp).toContain('&item.done');
        // Panel passes props.done through to Toggle (already a pointer, &* is identity)
        expect(panelCpp).toContain('p.done = &*props.done');
        // Should NOT double-address (&props.done would be bool**)
        expect(panelCpp).not.toContain('= &props.done');
    });

    it('emits Font with PushFont/PopFont', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Font name="custom">
        <Text>Hello</Text>
      </Font>
    </Window>
  );
}
        `);
        expect(output).toContain('begin_font("custom")');
        expect(output).toContain('end_font()');
    });
});
