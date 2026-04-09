export default function App() {
  const [count, setCount] = useState(0);
  const [speed, setSpeed] = useState(5.0);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Hello IMX">
        <Column gap={8}>
          <Text>Welcome to IMX</Text>
          <Text>Count: {count}</Text>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      {showAbout && <Window title="About" open={true} onClose={() => setShowAbout(false)}>
        <Text>Built with IMX — React-Native-like authoring for Dear ImGui</Text>
      </Window>}
    </DockSpace>
  );
}
