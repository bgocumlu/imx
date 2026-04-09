export function TablesDemo(props: { onClose: () => void }) {
  return (
    <Window title="Tables Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Tables demo — coming soon.</Text>
      </Column>
    </Window>
  );
}
