export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Persistence Demo">
        <Column gap={8}>
          <Text>JSON Save/Load Example</Text>
          <Separator />
          <TextInput label="Name" value={props.name} />
          <SliderFloat label="Volume" value={props.volume} min={0} max={100} />
          <Checkbox label="Dark Mode" value={props.darkMode} />
          <Separator />
          <Row gap={8}>
            <Button title="Save" onPress={props.onSave} />
            <Button title="Load" onPress={props.onLoad} />
          </Row>
        </Column>
      </Window>
    </DockSpace>
  );
}
