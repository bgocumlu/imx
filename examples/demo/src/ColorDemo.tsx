export function ColorDemo(props: { onClose: () => void }) {
  const [editRgba, setEditRgba] = useState([0.8, 0.2, 0.2, 1.0]);
  const [editRgb, setEditRgb] = useState([0.2, 0.6, 0.8, 1.0]);
  const [pickerRgba, setPickerRgba] = useState([0.2, 0.8, 0.4, 1.0]);
  const [pickerRgb, setPickerRgb] = useState([0.7, 0.4, 0.9, 1.0]);

  return (
    <Window title="Color Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Color Editors" defaultOpen={true}>
          <Column gap={6}>
            <Text>ColorEdit — RGBA (4-component)</Text>
            <ColorEdit label="RGBA Color" value={editRgba} onChange={(v) => setEditRgba(v)} />
            <Spacing />
            <Text>ColorEdit3 — RGB only (3-component)</Text>
            <ColorEdit3 label="RGB Color" value={editRgb} onChange={(v) => setEditRgb(v)} />
          </Column>
        </CollapsingHeader>

        <CollapsingHeader label="Color Pickers" defaultOpen={true}>
          <Column gap={6}>
            <Text>ColorPicker — RGBA (4-component)</Text>
            <ColorPicker label="RGBA Picker" value={pickerRgba} />
            <Spacing />
            <Text>ColorPicker3 — RGB only (3-component)</Text>
            <ColorPicker3 label="RGB Picker" value={pickerRgb} onChange={(v) => setPickerRgb(v)} />
          </Column>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
