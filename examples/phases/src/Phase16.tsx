export function Phase16(props: { onClose: () => void }) {
  const [status, setStatus] = useState("Idle");
  const [shortcutCount, setShortcutCount] = useState(0);
  const [selItem, setSelItem] = useState(false);

  return (
    <Window title="Phase 16: Interaction & State Queries" open={true} onClose={props.onClose}>
      <Shortcut keys="Ctrl+D" onPress={() => setShortcutCount(shortcutCount + 1)} />
      <Column gap={8}>

        <CollapsingHeader label="Item State Callbacks" defaultOpen>
          <Text disabled>onHover, onClicked, onDoubleClicked, cursor, tooltip.</Text>
          <Button
            title="Hover or click me"
            onPress={() => setStatus("Button pressed")}
            tooltip="This button has a tooltip"
            cursor="hand"
            onHover={() => setStatus("Hovering button")}
            onClicked={() => setStatus("Button clicked")}
            onDoubleClicked={() => setStatus("Double-clicked!")}
          />
          <Text disabled>Selectable is a clickable list item — click to toggle highlight.</Text>
          <Selectable
            label="Selectable (click to toggle)"
            selected={selItem}
            onSelect={() => { setSelItem(!selItem); setStatus("Selectable toggled"); }}
            onHover={() => setStatus("Hovering selectable")}
            tooltip="Selectable tooltip"
          />
          <Text>Status: {status}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Item Context Menu" defaultOpen>
          <Text disabled>ContextMenu as sibling — right-click the item above it.</Text>
          <Button title="Right-click this button" onPress={() => setStatus("Button pressed")} />
          <ContextMenu>
            <MenuItem label="Button Action A" onPress={() => setStatus("Button: Action A")} />
            <MenuItem label="Button Action B" onPress={() => setStatus("Button: Action B")} />
          </ContextMenu>
          <Selectable label="Right-click this selectable" onSelect={() => setStatus("Selectable clicked")} />
          <ContextMenu>
            <MenuItem label="Selectable Copy" onPress={() => setStatus("Selectable: Copy")} />
            <MenuItem label="Selectable Delete" onPress={() => setStatus("Selectable: Delete")} />
          </ContextMenu>
        </CollapsingHeader>

        <CollapsingHeader label="Window Context Menu" defaultOpen>
          <Text disabled>target="window" — right-click anywhere in this child region.</Text>
          <Child id="ctx_area" width={300} height={60} border={true}>
            <Text>Right-click anywhere in this box</Text>
            <ContextMenu target="window">
              <MenuItem label="Window Action" onPress={() => setStatus("Window context")} />
              <MenuItem label="Reset" onPress={() => setStatus("Idle")} />
            </ContextMenu>
          </Child>
        </CollapsingHeader>

        <CollapsingHeader label="Keyboard Shortcut" defaultOpen>
          <Text disabled>Shortcut component listens for key chords globally.</Text>
          <Text>Press Ctrl+D anywhere. Count: {shortcutCount}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Mouse Cursor" defaultOpen>
          <Text disabled>cursor prop changes the mouse cursor on hover.</Text>
          <Row gap={8}>
            <Button title="Hand" onPress={() => {}} cursor="hand" tooltip="cursor=hand" />
            <Button title="Text" onPress={() => {}} cursor="text" tooltip="cursor=text" />
            <Button title="ResizeEW" onPress={() => {}} cursor="resizeEW" tooltip="cursor=resizeEW" />
            <Button title="NotAllowed" onPress={() => {}} cursor="notAllowed" tooltip="cursor=notAllowed" />
          </Row>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
