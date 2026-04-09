export function ThemingDemo(props: { onClose: () => void }) {
  const [preset, setPreset] = useState("dark");

  return (
    <Window title="Theming Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Theme Presets" defaultOpen={true}>
          <Text>Current preset: {preset}</Text>
          <Row gap={8}>
            <Button title="Dark" onPress={() => setPreset("dark")} />
            <Button title="Light" onPress={() => setPreset("light")} />
          </Row>
          <Theme preset={preset}>
            <Column gap={4}>
              <Text>This content uses the selected theme preset.</Text>
              <Button title="Themed Button" onPress={() => {}} />
              <SliderFloat label="Themed Slider" value={0.5} onChange={() => {}} min={0.0} max={1.0} />
              <Checkbox label="Themed Checkbox" value={true} onChange={() => {}} />
            </Column>
          </Theme>
        </CollapsingHeader>

        <CollapsingHeader label="Custom Colors" defaultOpen={true}>
          <Theme
            preset="dark"
            accentColor={[0.1, 0.6, 0.9, 1.0]}
            backgroundColor={[0.05, 0.05, 0.12, 1.0]}
            textColor={[0.9, 0.95, 1.0, 1.0]}
            borderColor={[0.2, 0.4, 0.7, 0.8]}
            surfaceColor={[0.1, 0.12, 0.2, 1.0]}
          >
            <Column gap={4}>
              <Text>Custom blue accent with dark navy background.</Text>
              <Button title="Custom Theme Button" onPress={() => {}} />
              <Checkbox label="Custom Theme Checkbox" value={false} onChange={() => {}} />
            </Column>
          </Theme>
        </CollapsingHeader>

        <CollapsingHeader label="Style Overrides" defaultOpen={true}>
          <Text>StyleColor — green buttons:</Text>
          <StyleColor
            button={[0.2, 0.8, 0.2, 1.0]}
            buttonHovered={[0.3, 0.9, 0.3, 1.0]}
            buttonActive={[0.1, 0.7, 0.1, 1.0]}
          >
            <Row gap={8}>
              <Button title="Green Button 1" onPress={() => {}} />
              <Button title="Green Button 2" onPress={() => {}} />
            </Row>
          </StyleColor>

          <Spacing />
          <Text>StyleVar — rounded frames with padding:</Text>
          <StyleVar frameRounding={8} framePadding={[10, 6]}>
            <Column gap={4}>
              <Button title="Rounded Button" onPress={() => {}} />
              <TextInput label="Rounded Input" value="" onChange={() => {}} />
            </Column>
          </StyleVar>

          <Spacing />
          <Text>ID scoping:</Text>
          <ID scope="demo">
            <Group>
              <Button title="Scoped Button A" onPress={() => {}} />
              <SameLine spacing={8} />
              <Button title="Scoped Button B" onPress={() => {}} />
            </Group>
          </ID>
        </CollapsingHeader>

        <CollapsingHeader label="Font Switching" defaultOpen={true}>
          <Text>Normal font (Inter):</Text>
          <Text>The quick brown fox jumps over the lazy dog.</Text>
          <Spacing />
          <Text>JetBrains Mono font:</Text>
          <Font name="jetbrains-mono" src="JetBrainsMono-Regular.ttf" size={15}>
            <Text>The quick brown fox jumps over the lazy dog.</Text>
            <Text>0xDEADBEEF  |  auto x = 42;</Text>
          </Font>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
