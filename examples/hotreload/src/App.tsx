export default function App(props: AppState) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Controls">
        <Column gap={8}>
          <Text>Count: {props.count}</Text>
          <Button title="Increment" onPress={props.onIncrement} />
          <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      <Window title="Hot Reload">
        <Column gap={8}>
          <Text>Run this in a second terminal to enable live reload:</Text>
          <Text wrapped={true}>{props.watchCmd}</Text>
          <Button title="Copy" onPress={props.onCopyCmd} />
        </Column>
      </Window>
      {showAbout && <Window title="About">
        <Text>Built with IMX (hot-reloadable!)</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
      </Window>}
    </DockSpace>
  );
}
