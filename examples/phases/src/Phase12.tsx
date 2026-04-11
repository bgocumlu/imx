export function Phase12(props: { onClose: () => void; data: Phase12Data }) {
  return (
    <Window title="Phase 12: Struct Binding Fixes" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="TextInput Struct Binding" defaultOpen>
          <Text disabled>TextInput with struct string field — no onChange, directBind syncs each frame.</Text>
          <TextInput label="Username" value={props.data.username} />
          <InputTextMultiline label="Notes" value={props.data.notes} width={300} />
        </CollapsingHeader>

        <CollapsingHeader label="Deep Pointer Propagation" defaultOpen>
          <Text disabled>3-deep struct access: props.data.inner.field through pointer chain.</Text>
          <SliderFloat label="Brightness" value={props.data.inner.brightness} min={0} max={1} />
          <DragInt label="Priority" value={props.data.inner.priority} speed={1} />
        </CollapsingHeader>

        <CollapsingHeader label="DragDrop Typed Payloads" defaultOpen>
          <Text disabled>Drag items between pools — type string matches source to target.</Text>
          <Row gap={16}>
            <Column gap={4}>
              <Text>Pool A</Text>
              <Separator />
              {props.data.pool_a.map((item, i) => (
                <ID scope={i}>
                  <DragDropSource type="item" payload={item.id}>
                    <View style={{ padding: 4, backgroundColor: [0.22, 0.22, 0.28, 1.0] }}>
                      <Text>{item.label}</Text>
                    </View>
                  </DragDropSource>
                </ID>
              ))}
              <DragDropTarget type="item" onDrop={(id: number) => props.data.move_to_a(id)}>
                <View style={{ minHeight: 30, backgroundColor: [0.15, 0.15, 0.2, 1.0] }}>
                  <Text disabled>Drop here</Text>
                </View>
              </DragDropTarget>
            </Column>
            <Column gap={4}>
              <Text>Pool B</Text>
              <Separator />
              {props.data.pool_b.map((item, i) => (
                <ID scope={i}>
                  <DragDropSource type="item" payload={item.id}>
                    <View style={{ padding: 4, backgroundColor: [0.22, 0.28, 0.22, 1.0] }}>
                      <Text>{item.label}</Text>
                    </View>
                  </DragDropSource>
                </ID>
              ))}
              <DragDropTarget type="item" onDrop={(id: number) => props.data.move_to_b(id)}>
                <View style={{ minHeight: 30, backgroundColor: [0.15, 0.15, 0.2, 1.0] }}>
                  <Text disabled>Drop here</Text>
                </View>
              </DragDropTarget>
            </Column>
          </Row>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
