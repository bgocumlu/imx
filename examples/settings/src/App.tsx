export default function App(props: SettingsState) {
  return (
    <Theme preset="dark" accentColor={[0.4, 0.7, 0.3, 1.0]} rounding={4}>
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={1.0}>
          <DockPanel>
            <Window title="Settings" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <Window title="Settings">
        <Column gap={4}>

          <CollapsingHeader label="Transform">
            <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
            <SliderInt label="Count" value={props.count} min={0} max={10} />
            <DragFloat label="Position X" value={props.posX} speed={0.1} />
            <DragInt label="Drag Value" value={props.dragVal} speed={1} />
          </CollapsingHeader>

          <CollapsingHeader label="Input">
            <InputInt label="Level" value={props.level} />
            <InputFloat label="Weight" value={props.weight} />
          </CollapsingHeader>

          <CollapsingHeader label="Selection">
            <Combo label="Mode" value={props.mode} items={["Easy", "Medium", "Hard"]} />
            <ListBox label="Choice" value={props.listChoice} items={["Alpha", "Beta", "Gamma", "Delta"]} />
            <Separator />
            <Text>Size:</Text>
            <Radio label="Small" value={props.size} index={0} />
            <Radio label="Medium" value={props.size} index={1} />
            <Radio label="Large" value={props.size} index={2} />
          </CollapsingHeader>

          <CollapsingHeader label="Colors">
            <ColorEdit label="Color" value={props.color} />
            <ColorPicker label="Picker" value={props.pickerColor} />
          </CollapsingHeader>

          <CollapsingHeader label="Toggles">
            <Checkbox label="Enabled" value={props.enabled} />
            <Checkbox label="Dark Mode" value={props.darkMode} />
          </CollapsingHeader>

          <Separator />
          <Button title="Reset All" onPress={props.onReset} />

        </Column>
      </Window>
    </DockSpace>
    </Theme>
  );
}
