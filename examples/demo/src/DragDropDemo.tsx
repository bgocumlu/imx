export function DragDropDemo(props: { onClose: () => void }) {
  return (
    <Window title="Drag & Drop Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Drag & Drop demo — coming soon.</Text>
      </Column>
    </Window>
  );
}
