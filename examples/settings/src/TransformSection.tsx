export function TransformSection(props: { value: TransformSettings }) {
  return (
    <Column gap={4}>
      <Text>Nested struct binding into a child component.</Text>
      <SliderFloat label="Speed" value={props.value.speed} min={0} max={100} />
      <SliderInt label="Count" value={props.value.count} min={0} max={10} />
      <DragFloat label="Position X" value={props.value.posX} speed={0.1} />
      <DragInt label="Drag Value" value={props.value.dragVal} speed={1} />
    </Column>
  );
}
