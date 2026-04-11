export function Phase17(props: { onClose: () => void; data: Phase17Data }) {
  const [showModal, setShowModal] = useState(false);
  const [showEscModal, setShowEscModal] = useState(false);
  const [comboVal, setComboVal] = useState(0);
  const [manualSel, setManualSel] = useState(0);
  const [manualPreview, setManualPreview] = useState("Alpha");

  return (
    <Window title="Phase 17: Window & Popup Control" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Window Flags" defaultOpen>
          <Text disabled>Boolean props control ImGuiWindowFlags on windows.</Text>
          <Window title="Auto-Resize" alwaysAutoResize={true} noCollapse={true}>
            <Text>This window auto-resizes to fit content.</Text>
            <Text>It cannot be collapsed.</Text>
          </Window>
        </CollapsingHeader>

        <CollapsingHeader label="Window Position & Size" defaultOpen>
          <Text disabled>x, y, width, height props with positioning.</Text>
          <Window title="Positioned" x={600} y={400} width={200} height={100} noResize={true}>
            <Text>Placed at (600, 400)</Text>
            <Text>Size: 200x100</Text>
          </Window>
        </CollapsingHeader>

        <CollapsingHeader label="Size Constraints & bgAlpha" defaultOpen>
          <Text disabled>minWidth/maxWidth/bgAlpha control window appearance.</Text>
          <Window title="Constrained" minWidth={200} maxWidth={400} minHeight={80} bgAlpha={0.7}>
            <Text>Min 200, Max 400 wide.</Text>
            <Text>70% background alpha.</Text>
          </Window>
        </CollapsingHeader>

        <CollapsingHeader label="Modal" defaultOpen>
          <Text disabled>Modal dialog. Close via X button or Close button.</Text>
          <Row gap={8}>
            <Button title="Open Modal" onPress={() => setShowModal(true)} />
            <Button title="Open Modal (+ Escape)" onPress={() => setShowEscModal(true)} />
          </Row>
          <Modal title="Example Modal" open={showModal} onClose={() => setShowModal(false)} alwaysAutoResize={true}>
            <Text>This is a modal dialog.</Text>
            <Text>Close with X button or the button below.</Text>
            <Button title="Close" onPress={() => setShowModal(false)} />
          </Modal>
          <Modal title="Modal with Escape" open={showEscModal} onClose={() => setShowEscModal(false)} alwaysAutoResize={true}>
            <Shortcut keys="Escape" onPress={() => setShowEscModal(false)} />
            <Text>This modal added Escape support via Shortcut.</Text>
            <Text>Press Escape, X, or the button to close.</Text>
            <Button title="Close" onPress={() => setShowEscModal(false)} />
          </Modal>
        </CollapsingHeader>

        <CollapsingHeader label="Manual Combo" defaultOpen>
          <Text disabled>Combo with children uses BeginCombo/EndCombo mode.</Text>
          <Combo label="Simple" value={comboVal} onChange={setComboVal} items={["One", "Two", "Three"]} />
          <Combo label="Manual" preview={manualPreview}>
            <Selectable label="Alpha" selected={manualSel === 0} onSelect={() => { setManualSel(0); setManualPreview("Alpha"); }} />
            <Selectable label="Beta" selected={manualSel === 1} onSelect={() => { setManualSel(1); setManualPreview("Beta"); }} />
            <Selectable label="Gamma" selected={manualSel === 2} onSelect={() => { setManualSel(2); setManualPreview("Gamma"); }} />
          </Combo>
        </CollapsingHeader>

        <CollapsingHeader label="MultiSelect (Struct Binding)" defaultOpen>
          <Text disabled>boxSelect for drag selection. Bool array + callback in C++ struct.</Text>
          <DragInt label="Selected count" value={props.data.ms_selection_count} speed={0} />
          <MultiSelect
            boxSelect={true}
            clearOnClickVoid={true}
            selectionSize={6}
            itemsCount={6}
            onSelectionChange={() => props.data.apply_selection(0)}
          >
            <Selectable label="Item Alpha" selected={props.data.ms_selected[0]} selectionIndex={0} />
            <Selectable label="Item Beta" selected={props.data.ms_selected[1]} selectionIndex={1} />
            <Selectable label="Item Gamma" selected={props.data.ms_selected[2]} selectionIndex={2} />
            <Selectable label="Item Delta" selected={props.data.ms_selected[3]} selectionIndex={3} />
            <Selectable label="Item Epsilon" selected={props.data.ms_selected[4]} selectionIndex={4} />
            <Selectable label="Item Zeta" selected={props.data.ms_selected[5]} selectionIndex={5} />
          </MultiSelect>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
