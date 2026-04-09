export function AdvancedDemo(props: { onClose: () => void }) {
  const [shortcutCount, setShortcutCount] = useState(0);
  const [toggle, setToggle] = useState(false);
  const [status, setStatus] = useState("Idle");

  return (
    <Window title="Advanced Demo" open={true} onClose={props.onClose}>
      <Shortcut keys="Ctrl+S" onPress={() => {
        setShortcutCount(shortcutCount + 1);
        setStatus("Ctrl+S pressed");
      }} />
      <Column gap={8}>

        <CollapsingHeader label="Keyboard Shortcuts" defaultOpen>
          <Text disabled>Press Ctrl+S anywhere to increment the counter.</Text>
          <Text>Ctrl+S count: {shortcutCount}</Text>
          <Text>Status: {status}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Custom Widgets" defaultOpen>
          <Text disabled>ToggleSwitch is a C++ widget registered via imx::register_widget().</Text>
          <Row gap={8}>
            <Text>Toggle:</Text>
            <ToggleSwitch value={toggle} onToggle={(v: boolean) => setToggle(v)} />
          </Row>
          <Text>Value: {toggle ? "ON" : "OFF"}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Item Interaction" defaultOpen>
          <Button
            title="Hover / Click me"
            onPress={() => setStatus("Button pressed")}
            tooltip="This button has a tooltip, hover and click callbacks."
            cursor="hand"
            onHover={() => setStatus("Hovering button")}
            onClicked={() => setStatus("Button clicked")}
          />
          <Text>Status: {status}</Text>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
