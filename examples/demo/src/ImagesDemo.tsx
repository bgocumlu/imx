export function ImagesDemo(props: { onClose: () => void }) {
  return (
    <Window title="Images Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Images demo — coming soon.</Text>
      </Column>
    </Window>
  );
}
