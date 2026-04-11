export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Async Demo">
        <Column gap={8}>
          <Text>Background Task Example</Text>
          <Separator />
          <Button
            title="Fetch Data"
            onPress={props.onFetchData}
            disabled={props.loading}
          />
          {props.loading && <Text color={[1, 0.8, 0, 1]}>Loading...</Text>}
          {props.result !== "" && <Text color={[0, 1, 0, 1]}>Result: {props.result}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
