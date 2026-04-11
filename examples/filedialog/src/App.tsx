export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="File Dialog Demo">
        <Column gap={8}>
          <Text>Native File Dialogs + Drag & Drop</Text>
          <Separator />
          <Row gap={8}>
            <Button title="Open File" onPress={props.onOpen} />
            <Button title="Save File" onPress={props.onSave} />
          </Row>
          <Text>Drag & drop a file onto this window</Text>
          {props.message !== "" && <Text color={[0, 1, 0, 1]}>{props.message}</Text>}
          {props.filePath !== "" && <Text>Path: {props.filePath}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
