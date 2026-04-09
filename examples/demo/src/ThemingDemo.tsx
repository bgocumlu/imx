export function ThemingDemo(props: { onClose: () => void }) {
  return (
    <Window title="Theming Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Theming demo — coming soon.</Text>
      </Column>
    </Window>
  );
}
