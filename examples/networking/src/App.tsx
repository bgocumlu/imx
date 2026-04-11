export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Networking Demo">
        <Column gap={8}>
          <Text>HTTP Client Example</Text>
          <Separator />
          <TextInput label="URL" value={props.url} />
          <Button title="Fetch" onPress={props.onFetch} disabled={props.loading} />
          {props.loading && <Text color={[1, 0.8, 0, 1]}>Loading...</Text>}
          {props.response !== "" && <Text wrapped={true}>{props.response}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
