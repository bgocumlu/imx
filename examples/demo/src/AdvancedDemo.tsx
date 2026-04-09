export function AdvancedDemo(props: { onClose: () => void }) {
  return (
    <Window title="Advanced Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>
        <Text>Advanced demo — coming soon.</Text>
        <Text disabled>Will include MultiSelect, ToggleSwitch, and more.</Text>
      </Column>
    </Window>
  );
}
