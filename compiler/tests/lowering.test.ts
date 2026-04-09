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

    it('lowers DrawLine inside Canvas', () => {
        const ir = lower(`
function App() {
  return (
    <Canvas width={200} height={100}>
      <DrawLine p1={[0, 0]} p2={[200, 100]} color={[1, 0, 0, 1]} thickness={2} />
    </Canvas>
  );
}
        `);
        expect(ir.body[0]).toMatchObject({ kind: 'begin_container', tag: 'Canvas' });
        expect(ir.body[1]).toMatchObject({ kind: 'draw_line' });
        expect(ir.body[2]).toMatchObject({ kind: 'end_container', tag: 'Canvas' });
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

    it('sets directBind for props value without onChange', () => {
        const ir = lower(`
function App(props: { speed: number }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
    </Window>
  );
}
        `);
        const slider = ir.body[1];
        expect(slider.kind).toBe('slider_float');
        if (slider.kind === 'slider_float') {
            expect(slider.directBind).toBe(true);
            expect(slider.valueExpr).toBe('props.speed');
        }
    });

    it('lowers Phase 14 layout containers', () => {
        const ir = lower(`
function App() {
  return (
    <MainMenuBar>
      <Menu label="File">
        <MenuItem label="Exit" />
      </Menu>
    </MainMenuBar>
  );
}
        `);

        expect(ir.body[0]).toMatchObject({ kind: 'begin_container', tag: 'MainMenuBar' });
        expect(ir.body[1]).toMatchObject({ kind: 'begin_container', tag: 'Menu' });
        expect(ir.body[3]).toMatchObject({ kind: 'end_container', tag: 'Menu' });
        expect(ir.body[4]).toMatchObject({ kind: 'end_container', tag: 'MainMenuBar' });
    });

    it('lowers Phase 14 layout primitives', () => {
        const ir = lower(`
function App() {
  return (
    <Window title="Layout">
      <Indent width={20}>
        <TextWrap width={220}>
          <Text>Wrapped</Text>
        </TextWrap>
      </Indent>
      <Spacing />
      <Dummy width={48} height={12} />
      <SameLine offset={16} spacing={8} />
      <NewLine />
      <Cursor x={96} y={44} />
    </Window>
  );
}
        `);

        expect(ir.body[1]).toMatchObject({ kind: 'begin_container', tag: 'Indent', props: { width: '20' } });
        expect(ir.body[2]).toMatchObject({ kind: 'begin_container', tag: 'TextWrap', props: { width: '220' } });
        expect(ir.body[4]).toMatchObject({ kind: 'end_container', tag: 'TextWrap' });
        expect(ir.body[5]).toMatchObject({ kind: 'end_container', tag: 'Indent' });
        expect(ir.body[6]).toMatchObject({ kind: 'spacing' });
        expect(ir.body[7]).toMatchObject({ kind: 'dummy', width: '48', height: '12' });
        expect(ir.body[8]).toMatchObject({ kind: 'same_line', offset: '16', spacing: '8' });
        expect(ir.body[9]).toMatchObject({ kind: 'new_line' });
        expect(ir.body[10]).toMatchObject({ kind: 'cursor', x: '96', y: '44' });
    });

    it('lowers width props for scalar, buffered, and vector inputs', () => {
        const ir = lower(`
function App() {
  const [name, setName] = useState("");
  const [speed, setSpeed] = useState(5.0);
  const [position, setPosition] = useState([1.0, 2.0, 3.0]);
  return (
    <Window title="Inputs">
      <TextInput label="Name" value={name} onChange={setName} width={180} />
      <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={10} width={140} />
      <InputFloat3 label="Position" value={position} width={220} />
    </Window>
  );
}
        `);

        expect(ir.body[1]).toMatchObject({ kind: 'text_input', width: '180' });
        expect(ir.body[2]).toMatchObject({ kind: 'slider_float', width: '140' });
        expect(ir.body[3]).toMatchObject({ kind: 'input_float_n', width: '220' });
    });

    it('lowers Phase 15 table and tree enhancements', () => {
        const ir = lower(`
function App() {
  return (
    <Window title="Phase15">
      <Table
        columns={[
          { label: "Name", defaultHide: true, preferSortAscending: true, noResize: true, fixedWidth: true },
          "Owner"
        ]}
        sortable
        hideable
        multiSortable
        noClip
        padOuterX
        scrollX
        scrollY
        onSort={(specs) => specs}
      >
        <TableRow bgColor={[0.1, 0.2, 0.3, 1.0]}>
          <TableCell columnIndex={1} bgColor={[0.2, 0.3, 0.4, 1.0]}>
            <Text>Ada</Text>
          </TableCell>
        </TableRow>
      </Table>
      <TreeNode label="Root" defaultOpen forceOpen={true} openOnArrow openOnDoubleClick>
        <TreeNode label="Leaf" leaf bullet noTreePushOnOpen />
      </TreeNode>
      <CollapsingHeader label="Details" defaultOpen forceOpen={true} closable onClose={() => {}}>
        <Text>Body</Text>
      </CollapsingHeader>
    </Window>
  );
}
        `);

        expect(ir.body[1]).toMatchObject({ kind: 'begin_table', sortable: 'true', hideable: 'true', scrollX: 'true', scrollY: 'true' });
        expect(ir.body[2]).toMatchObject({ kind: 'begin_table_row', bgColor: '0.1, 0.2, 0.3, 1' });
        expect(ir.body[3]).toMatchObject({ kind: 'begin_table_cell', columnIndex: '1', bgColor: '0.2, 0.3, 0.4, 1' });
        expect(ir.body[8]).toMatchObject({ kind: 'begin_tree_node', forceOpen: 'true', openOnArrow: 'true', openOnDoubleClick: 'true' });
        expect(ir.body[9]).toMatchObject({ kind: 'begin_tree_node', leaf: 'true', bullet: 'true', noTreePushOnOpen: 'true' });
        expect(ir.body[12]).toMatchObject({ kind: 'begin_collapsing_header', closable: 'true', forceOpen: 'true' });
    });

    it('lowers Phase 16 item interactions, context menus, and shortcuts', () => {
        const ir = lower(`
function App() {
  return (
    <Window title="Phase16">
      <Button
        title="Target"
        onPress={() => {}}
        tooltip="Hover me"
        autoFocus
        scrollToHere
        cursor="hand"
        onHover={() => {}}
        onClicked={() => {}}
        onDoubleClicked={() => {}}
      />
      <ContextMenu id="actions" target="window">
        <MenuItem label="Inspect" />
      </ContextMenu>
      <Shortcut keys="Ctrl+S" onPress={() => {}} />
    </Window>
  );
}
        `);

        const button = ir.body[1];
        expect(button.kind).toBe('button');
        if (button.kind === 'button') {
            expect(button.item).toMatchObject({
                tooltip: '"Hover me"',
                autoFocus: 'true',
                scrollToHere: 'true',
                cursor: '"hand"',
            });
            expect(button.item?.onHover).toBeDefined();
            expect(button.item?.onClicked).toBeDefined();
            expect(button.item?.onDoubleClicked).toBeDefined();
        }

        expect(ir.body[2]).toMatchObject({ kind: 'begin_container', tag: 'ContextMenu', props: { id: '"actions"', target: '"window"' } });
        expect(ir.body[3]).toMatchObject({ kind: 'menu_item', label: '"Inspect"' });
        expect(ir.body[4]).toMatchObject({ kind: 'end_container', tag: 'ContextMenu' });
        expect(ir.body[5]).toMatchObject({ kind: 'shortcut', keys: '"Ctrl+S"' });
    });
});
