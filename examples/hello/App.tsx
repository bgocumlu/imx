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

  return (
    <Theme preset="dark" accentColor={[0.2, 0.5, 1.0, 1.0]} rounding={6}>
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
            <DockPanel>
              <Window title="Data" />
            </DockPanel>
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
