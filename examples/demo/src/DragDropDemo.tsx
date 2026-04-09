export function DragDropDemo(props: { onClose: () => void }) {
  const [dropResult, setDropResult] = useState(0);

  return (
    <Window title="Drag & Drop Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Drag & Drop with typed payloads</Text>
        <Text disabled>Drag the source button onto the target button to transfer a payload.</Text>
        <Separator />

        <Row gap={40}>
          <Column gap={4}>
            <Text>Source:</Text>
            <DragDropSource type="demo" payload={42}>
              <Button title="Drag me (payload: 42)" onPress={() => {}} />
            </DragDropSource>
          </Column>
          <Column gap={4}>
            <Text>Target:</Text>
            <DragDropTarget type="demo" onDrop={(val: number) => setDropResult(val)}>
              <Button title="Drop here" onPress={() => {}} />
            </DragDropTarget>
          </Column>
        </Row>

        <Separator />
        <Text>Last drop result: {dropResult}</Text>
      </Column>
    </Window>
  );
}
