export function TodoItem(props: { text: string, done: boolean, onToggle: () => void, onRemove: () => void }) {
  return (
    <Row gap={8}>
      <Checkbox value={props.done} onChange={(v: boolean) => props.onToggle()} />
      <Text>{props.text}</Text>
      <Button title="x" onPress={props.onRemove} />
    </Row>
  );
}
