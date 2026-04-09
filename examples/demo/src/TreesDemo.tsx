export function TreesDemo(props: { onClose: () => void }) {
  return (
    <Window title="Trees Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Trees demo — coming soon.</Text>
      </Column>
    </Window>
  );
}
