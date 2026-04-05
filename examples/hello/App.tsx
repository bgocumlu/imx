import { TodoItem } from './TodoItem';

export default function App() {
  const [done1, setDone1] = useState(false);
  const [done2, setDone2] = useState(false);
  const [done3, setDone3] = useState(true);
  const [showAbout, setShowAbout] = useState(false);
  const [speed, setSpeed] = useState(5.0);
  const [count, setCount] = useState(3);
  const [posX, setPosX] = useState(0.0);
  const [mode, setMode] = useState(0);
  const [level, setLevel] = useState(1);
  const [weight, setWeight] = useState(9.8);
  const [color, setColor] = useState([1.0, 0.5, 0.0, 1.0]);
  const [progress, setProgress] = useState(0.7);
  const [size, setSize] = useState(0);
  const [selected, setSelected] = useState(0);
  const [notes, setNotes] = useState("Type here...");
  const [toggle, setToggle] = useState(false);
  const [pickerColor, setPickerColor] = useState([0.2, 0.8, 0.4, 1.0]);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <Theme preset="dark" accentColor={[0.9, 0.2, 0.2, 1.0]} rounding={6}>
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={0.25}>
          <DockPanel>
            <Window title="Todos" />
          </DockPanel>
          <DockSplit direction="vertical" size={0.7}>
            <DockPanel>
              <Window title="Inspector" />
            </DockPanel>
            <DockSplit direction="horizontal" size={0.5}>
              <DockPanel>
                <Window title="Data" />
              </DockPanel>
              <DockPanel>
                <Window title="Widgets" />
              </DockPanel>
            </DockSplit>
          </DockSplit>
        </DockSplit>
      </DockLayout>
      <MenuBar>
        <Menu label="File">
          <MenuItem label="New" shortcut="Ctrl+N" />
          <MenuItem label="Open" shortcut="Ctrl+O" />
          <Separator />
          <MenuItem label="Exit" onPress={() => setShowAbout(false)} />
        </Menu>
        <Menu label="View">
          <MenuItem label="Reset Layout" onPress={resetLayout} />
        </Menu>
        <Menu label="Help">
          <MenuItem label="About" onPress={() => setShowAbout(!showAbout)} />
        </Menu>
      </MenuBar>
      <Window title="Todos">
        <Column gap={4}>
          <Text>Todo List</Text>
          <Separator />
          <TodoItem text="Build runtime" done={done1} onToggle={() => setDone1(!done1)} />
          <TodoItem text="Build renderer" done={done2} onToggle={() => setDone2(!done2)} />
          <TodoItem text="Build compiler" done={done3} onToggle={() => setDone3(!done3)} />
        </Column>
      </Window>
      <Window title="Inspector">
        <TabBar>
          <TabItem label="Properties">
            <Column gap={4}>
              <CollapsingHeader label="Transform">
                <DragFloat label="X" value={posX} onChange={setPosX} speed={0.1} />
                <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
                <SliderInt label="Count" value={count} onChange={setCount} min={0} max={10} />
                <Combo label="Mode" value={mode} onChange={setMode} items={["Easy", "Medium", "Hard"]} />
              </CollapsingHeader>
              <CollapsingHeader label="Input">
                <InputInt label="Level" value={level} onChange={setLevel} />
                <InputFloat label="Weight" value={weight} onChange={setWeight} />
              </CollapsingHeader>
              <CollapsingHeader label="Material">
                <ColorEdit label="Color" value={color} onChange={setColor} />
                <SliderFloat label="Progress" value={progress} onChange={setProgress} min={0} max={1} />
                <ProgressBar value={progress} />
              </CollapsingHeader>
            </Column>
          </TabItem>
          <TabItem label="Scene">
            <TreeNode label="Root">
              <TreeNode label="Objects">
                <Text>Cube</Text>
                <Text>Sphere</Text>
              </TreeNode>
              <TreeNode label="Lights">
                <Text>Point Light</Text>
              </TreeNode>
            </TreeNode>
          </TabItem>
        </TabBar>
      </Window>
      <Window title="Data">
        <Table columns={["Name", "Status", "Action"]}>
          <TableRow>
            <Text>Item 1</Text>
            <Text>Active</Text>
            <Button title="Edit" onPress={() => setShowAbout(false)} />
          </TableRow>
          <TableRow>
            <Text>Item 2</Text>
            <Text>Done</Text>
            <Button title="View" onPress={() => setShowAbout(false)} />
          </TableRow>
        </Table>
      </Window>
      <Window title="Widgets">
        <Column gap={4}>
          <CollapsingHeader label="Radio / Selectable">
            <Text>Size:</Text>
            <Radio label="Small" value={size} index={0} />
            <Radio label="Medium" value={size} index={1} />
            <Radio label="Large" value={size} index={2} />
            <Separator />
            <Selectable label="Option A" selected={selected === 0} onSelect={() => setSelected(0)} />
            <Selectable label="Option B" selected={selected === 1} onSelect={() => setSelected(1)} />
            <Selectable label="Option C" selected={selected === 2} onSelect={() => setSelected(2)} />
          </CollapsingHeader>
          <CollapsingHeader label="Text / Color">
            <InputTextMultiline label="Notes" value={notes} style={{ width: 300, height: 100 }} />
            <ColorPicker label="Picker" value={pickerColor} />
          </CollapsingHeader>
          <CollapsingHeader label="Display">
            <BulletText>First bullet point</BulletText>
            <BulletText>Second bullet point</BulletText>
            <LabelText label="Version" value="0.2.0" />
            <LabelText label="Components" value="52" />
            <Separator />
            <PlotLines label="FPS" values={[60, 58, 62, 55, 61, 63, 59]} style={{ width: 200, height: 50 }} />
            <PlotHistogram label="Distribution" values={[1, 3, 5, 7, 5, 3, 1]} style={{ width: 200, height: 50 }} />
            <Separator />
            <Image src="image.jpg" embed width={200} height={150} />
            <Image src="flower.jpg" width={200} height={150} />
          </CollapsingHeader>
          <Button title="Show Modal" onPress={() => setShowConfirm(true)} />
        </Column>
      </Window>
      <Window title="Batch 3 Demo">
        <StyleColor button={[0.2, 0.8, 0.2, 1.0]} buttonHovered={[0.3, 0.9, 0.3, 1.0]} buttonActive={[0.1, 0.6, 0.1, 1.0]}>
          <StyleVar frameRounding={6} framePadding={[10, 4]}>
            <Group>
              <ID scope="demo">
                <Button title="Styled Button" onPress={() => {}} />
                <DragDropSource type="demo" payload={42}>
                  <Text>Drag me</Text>
                </DragDropSource>
                <DragDropTarget type="demo" onDrop={(val: number) => {}}>
                  <Text>Drop here</Text>
                </DragDropTarget>
              </ID>
            </Group>
          </StyleVar>
        </StyleColor>
        <Text>Custom Widget:</Text>
        <ToggleSwitch value={toggle} onToggle={(v: boolean) => setToggle(v)} />
        <Disabled>
          <Button title="Disabled Button" onPress={() => {}} />
          <Text>This section is disabled</Text>
        </Disabled>
        <Child id="scrollable" width={0} height={100} border>
          <Text>Scrollable child region:</Text>
          <Text>Line 1</Text>
          <Text>Line 2</Text>
          <Text>Line 3</Text>
          <Text>Line 4</Text>
          <Text>Line 5</Text>
        </Child>
      </Window>
      <Window title="Canvas Demo">
        <Canvas width={300} height={200} style={{ backgroundColor: [0.1, 0.1, 0.1, 1.0] }}>
          <DrawLine p1={[0, 0]} p2={[300, 200]} color={[1, 0, 0, 1]} thickness={2} />
          <DrawRect min={[20, 20]} max={[120, 80]} color={[0, 1, 0, 1]} filled rounding={4} />
          <DrawCircle center={[200, 100]} radius={40} color={[0, 0.5, 1, 1]} thickness={3} />
          <DrawText pos={[10, 185]} text="Canvas Drawing" color={[1, 1, 1, 1]} />
        </Canvas>
      </Window>
      <Modal title="Confirm Action" open={showConfirm} onClose={() => setShowConfirm(false)}>
        <Text>Are you sure you want to proceed?</Text>
        <Row gap={8}>
          <Button title="Yes" onPress={() => setShowConfirm(false)} />
          <Button title="Cancel" onPress={() => setShowConfirm(false)} />
        </Row>
      </Modal>
      {showAbout && <Window title="About">
        <Column gap={8}>
          <Text>IMX v0.1</Text>
          <Text>React-Native-like authoring for Dear ImGui</Text>
          <Button title="Close" onPress={() => setShowAbout(false)} />
        </Column>
      </Window>}
    </DockSpace>
    </Theme>
  );
}
