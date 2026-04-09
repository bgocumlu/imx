import { TransformSection } from './TransformSection';
import { AppearanceSection } from './AppearanceSection';

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
            <TransformSection value={props.transform} />
          </CollapsingHeader>

          <CollapsingHeader label="Input">
            <InputInt label="Level" value={props.input.level} />
            <InputFloat label="Weight" value={props.input.weight} />
          </CollapsingHeader>

          <CollapsingHeader label="Selection">
            <Combo label="Mode" value={props.selection.mode} items={["Easy", "Medium", "Hard"]} />
            <ListBox label="Choice" value={props.selection.listChoice} items={["Alpha", "Beta", "Gamma", "Delta"]} />
            <Separator />
            <Text>Size:</Text>
            <Radio label="Small" value={props.selection.size} index={0} />
            <Radio label="Medium" value={props.selection.size} index={1} />
            <Radio label="Large" value={props.selection.size} index={2} />
          </CollapsingHeader>

          <CollapsingHeader label="Colors">
            <AppearanceSection value={props.appearance} />
          </CollapsingHeader>

          <CollapsingHeader label="Toggles">
            <Checkbox label="Enabled" value={props.toggles.enabled} />
            <Checkbox label="Dark Mode" value={props.toggles.darkMode} />
          </CollapsingHeader>

          <Separator />
          <Button title="Reset All" onPress={props.onReset} />

        </Column>
      </Window>
    </DockSpace>
    </Theme>
  );
}
