export function CanvasDemo(props: { onClose: () => void }) {
  return (
    <Window title="Canvas Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Canvas demo — coming soon.</Text>
      </Column>
    </Window>
  );
}
