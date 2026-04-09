export function AppearanceSection(props: { value: AppearanceSettings }) {
  return (
    <Column gap={4}>
      <ColorEdit label="Color" value={props.value.color} />
      <ColorPicker label="Picker" value={props.value.pickerColor} />
    </Column>
  );
}
