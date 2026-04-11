export function Phase14(props: { onClose: () => void }) {
  const [widthDemo, setWidthDemo] = useState(50.0);

  return (
    <Window title="Phase 14: Layout & Positioning" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Indent" defaultOpen>
          <Text disabled>Indent wraps children with manual indentation control.</Text>
          <Text>Level 0</Text>
          <Indent width={20}>
            <Text>Level 1 (indent 20)</Text>
            <Indent width={20}>
              <Text>Level 2 (indent 40 total)</Text>
            </Indent>
          </Indent>
        </CollapsingHeader>

        <CollapsingHeader label="Spacing & Dummy" defaultOpen>
          <Text disabled>Spacing adds vertical gap. Dummy is an invisible placeholder.</Text>
          <Text>Before spacing</Text>
          <Spacing />
          <Spacing />
          <Spacing />
          <Text>After 3x Spacing</Text>
          <Dummy width={100} height={30} />
          <Text>After Dummy (100x30)</Text>
        </CollapsingHeader>

        <CollapsingHeader label="SameLine & NewLine" defaultOpen>
          <Text disabled>SameLine places next item on same line. NewLine forces a break.</Text>
          <Text>Item A</Text>
          <SameLine offset={0} spacing={10} />
          <Text>Item B (SameLine)</Text>
          <SameLine spacing={20} />
          <Text>Item C (spacing 20)</Text>
          <NewLine />
          <Text>Item D (after NewLine)</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Per-Item Width" defaultOpen>
          <Text disabled>width prop on inputs sets per-item width via SetNextItemWidth.</Text>
          <SliderFloat label="Default width" value={widthDemo} onChange={setWidthDemo} min={0} max={100} />
          <SliderFloat label="Width 150" value={widthDemo} onChange={setWidthDemo} min={0} max={100} width={150} />
          <SliderFloat label="Width 250" value={widthDemo} onChange={setWidthDemo} min={0} max={100} width={250} />
        </CollapsingHeader>

        <CollapsingHeader label="TextWrap" defaultOpen>
          <Text disabled>TextWrap sets a wrapping boundary for child text.</Text>
          <TextWrap width={200}>
            <Text>This text is wrapped within a 200px boundary. Long content will flow to the next line automatically.</Text>
          </TextWrap>
        </CollapsingHeader>

        <CollapsingHeader label="Cursor Positioning" defaultOpen>
          <Text disabled>Cursor sets position within a region. Best used inside a Child.</Text>
          <Child id="cursor_demo" width={300} height={80} border={true}>
            <Cursor x={10} y={10} />
            <Text>At (10, 10)</Text>
            <Cursor x={150} y={10} />
            <Text>At (150, 10)</Text>
            <Cursor x={10} y={40} />
            <Text>At (10, 40)</Text>
            <Cursor x={150} y={40} />
            <Text>At (150, 40)</Text>
          </Child>
        </CollapsingHeader>

        <CollapsingHeader label="MainMenuBar">
          <Text disabled>MainMenuBar creates a full-screen menu bar (vs window-level MenuBar).</Text>
          <Text disabled>The MainMenuBar appears at the top of the viewport, not inside this window.</Text>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
