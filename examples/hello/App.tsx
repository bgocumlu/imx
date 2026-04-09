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
  const [phaseVector, setPhaseVector] = useState([12.0, 48.0, 96.0]);
  const [phaseDrag, setPhaseDrag] = useState([32.0, 18.0]);
  const [phaseSlider, setPhaseSlider] = useState([8, 16, 24, 32]);
  const [phaseBlend, setPhaseBlend] = useState(0.55);
  const [phaseAngle, setPhaseAngle] = useState(0.0);
  const [phaseRgb, setPhaseRgb] = useState([0.3, 0.75, 0.95]);
  const [phaseClicks, setPhaseClicks] = useState(0);
  const [phaseArrow, setPhaseArrow] = useState("Idle");
  const [phaseAlias, setPhaseAlias] = useState("right dock");
  const [phaseWrapWidth, setPhaseWrapWidth] = useState(220);
  const [phaseCursorX, setPhaseCursorX] = useState(92);
  const [phaseCursorY, setPhaseCursorY] = useState(54);

  return (
    <Theme preset="dark" accentColor={[0.9, 0.2, 0.2, 1.0]} backgroundColor={[0.12, 0.12, 0.15, 1.0]} textColor={[0.95, 0.95, 0.95, 1.0]} borderColor={[0.3, 0.3, 0.35, 1.0]} surfaceColor={[0.18, 0.18, 0.22, 1.0]} rounding={6}>
    <MainMenuBar>
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
    </MainMenuBar>
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
            <DockSplit direction="horizontal" size={0.45}>
              <DockPanel>
                <Window title="Data" />
              </DockPanel>
              <DockSplit direction="vertical" size={0.4}>
                <DockPanel>
                  <Window title="Widgets" />
                </DockPanel>
                <DockSplit direction="horizontal" size={0.5}>
                  <DockPanel>
                    <Window title="Phase 13" />
                  </DockPanel>
                  <DockPanel>
                    <Window title="Phase 14" />
                  </DockPanel>
                </DockSplit>
              </DockSplit>
            </DockSplit>
          </DockSplit>
        </DockSplit>
      </DockLayout>
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
      <Window title="Phase 13">
        <Column gap={8}>
          <Font name="jetbrains-mono">
            <Text>Phase 13 showcase: expanded inputs and advanced canvas drawing.</Text>
          </Font>
          <Text>Custom font loaded from `public/JetBrainsMono-Regular.ttf`.</Text>
          <CollapsingHeader label="Vector Inputs">
            <InputFloat3 label="Position" value={phaseVector} />
            <DragFloat2 label="Bezier Handle" value={phaseDrag} speed={0.1} />
            <SliderInt4 label="Padding" value={phaseSlider} min={0} max={64} />
          </CollapsingHeader>
          <CollapsingHeader label="Button Variants">
            <Row gap={8}>
              <SmallButton label="Ping" onPress={() => setPhaseClicks(phaseClicks + 1)} />
              <ArrowButton id="phase13-left" direction="left" onPress={() => setPhaseArrow("Left")} />
              <ArrowButton id="phase13-right" direction="right" onPress={() => setPhaseArrow("Right")} />
              <ArrowButton id="phase13-up" direction="up" onPress={() => setPhaseArrow("Up")} />
              <ArrowButton id="phase13-down" direction="down" onPress={() => setPhaseArrow("Down")} />
            </Row>
            <Text>Last arrow: {phaseArrow}</Text>
            <Text>InvisibleButton hitbox below:</Text>
            <InvisibleButton id="phase13-hitbox" width={220} height={32} onPress={() => setPhaseClicks(phaseClicks + 1)} />
            <Text>Variant clicks: {phaseClicks}</Text>
          </CollapsingHeader>
          <CollapsingHeader label="Sliders + Color">
            <Row gap={16}>
              <VSliderFloat label="Blend" value={phaseBlend} onChange={setPhaseBlend} min={0} max={1} width={18} height={120} />
              <Column gap={6}>
                <SliderAngle label="Angle" value={phaseAngle} onChange={setPhaseAngle} min={-180} max={180} />
                <ColorEdit3 label="Tint" value={phaseRgb} />
              </Column>
            </Row>
          </CollapsingHeader>
          <CollapsingHeader label="Advanced Canvas">
            <Canvas width={320} height={200} style={{ backgroundColor: [0.08, 0.08, 0.1, 1.0] }}>
              <DrawBezierCubic p1={[18, 154]} p2={[80, 20]} p3={[160, 186]} p4={[240, 60]} color={[0.25, 0.9, 0.85, 1.0]} thickness={3} />
              <DrawTriangle p1={[36, 54]} p2={[144, 162]} p3={[240, 42]} color={[1.0, 0.65, 0.2, 1.0]} thickness={2} />
              <DrawNgon center={[274, 132]} radius={34} color={[0.95, 0.3, 0.55, 1.0]} numSegments={7} thickness={2} />
              <DrawText pos={[12, 180]} text="Bezier / Triangle / Ngon" color={[1, 1, 1, 1]} />
            </Canvas>
          </CollapsingHeader>
        </Column>
      </Window>
      <Window title="Phase 14">
        <Column gap={8}>
          <Font name="jetbrains-mono">
            <Text>Phase 14 showcase: layout primitives and per-item width control.</Text>
          </Font>
          <Text>Phase 14 closes the remaining layout gap with raw ImGui: inline flow, indentation, wrapping, cursor placement, and explicit widths.</Text>
          <CollapsingHeader label="Inline Flow">
            <Button title="Ping" onPress={() => setPhaseClicks(phaseClicks + 1)} />
            <SameLine spacing={8} />
            <SmallButton label="Nudge" onPress={() => setPhaseClicks(phaseClicks + 1)} />
            <SameLine spacing={12} />
            <Text>Clicks: {phaseClicks}</Text>
            <NewLine />
            <Spacing />
            <Text>Dummy reserves space without drawing anything:</Text>
            <Text>Left</Text>
            <SameLine spacing={6} />
            <Dummy width={28} height={0} />
            <SameLine spacing={6} />
            <Text>Right</Text>
          </CollapsingHeader>
          <CollapsingHeader label="Indent + Wrap">
            <SliderInt label="Wrap Width" value={phaseWrapWidth} onChange={setPhaseWrapWidth} min={140} max={320} width={180} />
            <Spacing />
            <Indent width={20}>
              <TextWrap width={phaseWrapWidth}>
                <Text>Indented notes wrap against an explicit boundary, which is useful for log panes, callouts, help text, and inspector sidebars.</Text>
              </TextWrap>
            </Indent>
          </CollapsingHeader>
          <CollapsingHeader label="Input Width">
            <TextInput label="Alias" value={phaseAlias} onChange={setPhaseAlias} width={180} />
            <InputFloat label="Weight" value={weight} onChange={setWeight} width={110} />
            <InputFloat3 label="Position" value={phaseVector} width={220} />
            <DragFloat2 label="Bezier Handle" value={phaseDrag} speed={0.1} width={170} />
            <SliderInt4 label="Padding" value={phaseSlider} min={0} max={64} width={220} />
            <SliderFloat label="Blend" value={phaseBlend} onChange={setPhaseBlend} min={0} max={1} width={180} />
            <SliderAngle label="Angle" value={phaseAngle} onChange={setPhaseAngle} min={-180} max={180} width={180} />
            <ColorEdit3 label="Tint" value={phaseRgb} width={160} />
          </CollapsingHeader>
          <CollapsingHeader label="Cursor Placement">
            <Row gap={12}>
              <SliderInt label="X" value={phaseCursorX} onChange={setPhaseCursorX} min={0} max={220} width={140} />
              <SliderInt label="Y" value={phaseCursorY} onChange={setPhaseCursorY} min={0} max={100} width={140} />
            </Row>
            <Child id="phase14-cursor" width={300} height={160} border>
              <Text>Cursor repositions the next item inside this child region.</Text>
              <Cursor x={phaseCursorX} y={phaseCursorY} />
              <ArrowButton id="phase14-arrow" direction="right" onPress={() => setPhaseArrow("Cursor button")} />
              <Cursor x={phaseCursorX + 30} y={phaseCursorY - 2} />
              <Text>{phaseAlias}</Text>
            </Child>
            <Text>Last placement action: {phaseArrow}</Text>
          </CollapsingHeader>
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
