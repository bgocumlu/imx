export function KanbanCard(props: { title: string, id: number }) {
  return (
    <DragDropSource type="card" payload={props.id}>
      <View style={{ padding: 6, backgroundColor: [0.22, 0.22, 0.28, 1.0] }}>
        <Text>{props.title}</Text>
      </View>
    </DragDropSource>
  );
}
