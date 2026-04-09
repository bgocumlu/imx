export function AdvancedDemo(props: { onClose: () => void }) {
  const [shortcutCount, setShortcutCount] = useState(0);
  const [toggle, setToggle] = useState(false);

  return (
    <Window title="Advanced Demo" open={true} onClose={props.onClose}>
      <Shortcut keys="Ctrl+S" onPress={() => setShortcutCount(shortcutCount + 1)} />
      <Column gap={8}>

        <CollapsingHeader label="Keyboard Shortcuts" defaultOpen={true}>
          <Text disabled>Press Ctrl+S anywhere to increment the counter.</Text>
          <Text>Ctrl+S pressed: {shortcutCount} times</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Custom Widgets" defaultOpen={true}>
          <Text disabled>ToggleSwitch is a custom C++ widget registered via imx::register_widget().</Text>
          <Row gap={8}>
            <Text>Toggle:</Text>
            <ToggleSwitch value={toggle} onToggle={(v: boolean) => setToggle(v)} />
            <Text>{toggle ? "ON" : "OFF"}</Text>
          </Row>
        </CollapsingHeader>

        <CollapsingHeader label="Window Flags" defaultOpen={true}>
          <Text disabled>Windows can be created with various flags. The sub-windows below are separate ImGui windows.</Text>
          <Spacing />
          <Text>noResize + alwaysAutoResize window:</Text>
          <Window title="Fixed Window" open={true} noResize={true} alwaysAutoResize={true} width={200} height={80}>
            <Text>This window cannot be resized.</Text>
          </Window>
          <Spacing />
          <Text>Positioned window (x=200, y=200, 280x120):</Text>
          <Window title="Positioned Window" open={true} x={200} y={200} width={280} height={120} forcePosition={true} forceSize={true}>
            <Text>Forced to x=200, y=200.</Text>
            <Text>Size locked to 280x120.</Text>
          </Window>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
