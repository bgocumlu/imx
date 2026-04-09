export function MenusDemo(props: { onClose: () => void }) {
  const [menuAction, setMenuAction] = useState("(none)");
  const [showModal, setShowModal] = useState(false);
  const [modalResult, setModalResult] = useState("(none)");
  const [ctxStatus, setCtxStatus] = useState("(none)");

  return (
    <Window title="Menus & Popups Demo" open={true} onClose={props.onClose}>
      <MenuBar>
        <Menu label="File">
          <MenuItem label="New" shortcut="Ctrl+N" onPress={() => setMenuAction("New")} />
          <MenuItem label="Open" shortcut="Ctrl+O" onPress={() => setMenuAction("Open")} />
          <Separator />
          <MenuItem label="Save" shortcut="Ctrl+S" onPress={() => setMenuAction("Save")} />
          <Separator />
          <MenuItem label="Exit" onPress={() => setMenuAction("Exit")} />
        </Menu>
        <Menu label="Edit">
          <MenuItem label="Undo" shortcut="Ctrl+Z" onPress={() => setMenuAction("Undo")} />
          <MenuItem label="Redo" shortcut="Ctrl+Y" onPress={() => setMenuAction("Redo")} />
          <Separator />
          <MenuItem label="Cut" shortcut="Ctrl+X" onPress={() => setMenuAction("Cut")} />
          <MenuItem label="Copy" shortcut="Ctrl+C" onPress={() => setMenuAction("Copy")} />
          <MenuItem label="Paste" shortcut="Ctrl+V" onPress={() => setMenuAction("Paste")} />
        </Menu>
        <Menu label="View">
          <MenuItem label="Zoom In" shortcut="Ctrl++" onPress={() => setMenuAction("Zoom In")} />
          <MenuItem label="Zoom Out" shortcut="Ctrl+-" onPress={() => setMenuAction("Zoom Out")} />
        </Menu>
      </MenuBar>
      <Column gap={8}>

        <CollapsingHeader label="Window MenuBar" defaultOpen={true}>
          <Column gap={6}>
            <Text>This window has a built-in MenuBar (File / Edit / View).</Text>
            <Text>Use the menu bar above to trigger actions.</Text>
            <Text>Last menu action: {menuAction}</Text>
          </Column>
        </CollapsingHeader>

        <CollapsingHeader label="Modal Dialog" defaultOpen={true}>
          <Column gap={6}>
            <Text>Click the button to open a confirmation modal.</Text>
            <Button title="Open Confirm Modal" onPress={() => setShowModal(true)} />
            <Text>Modal result: {modalResult}</Text>
            <Modal title="Confirm" open={showModal} onClose={() => setShowModal(false)}>
              <Text>Are you sure you want to proceed?</Text>
              <Spacing />
              <Row gap={8}>
                <Button title="Yes" onPress={() => { setModalResult("Yes"); setShowModal(false); }} />
                <Button title="Cancel" onPress={() => { setModalResult("Cancel"); setShowModal(false); }} />
              </Row>
            </Modal>
          </Column>
        </CollapsingHeader>

        <CollapsingHeader label="Context Menus" defaultOpen={true}>
          <Column gap={6}>
            <Text>Right-click the button below for an item context menu.</Text>
            <Button title="Right-click me (item ctx)" onPress={() => {}} />
            <ContextMenu id="ctx-item">
              <MenuItem label="Copy" shortcut="Ctrl+C" onPress={() => setCtxStatus("Copy")} />
              <MenuItem label="Paste" shortcut="Ctrl+V" onPress={() => setCtxStatus("Paste")} />
              <Separator />
              <MenuItem label="Delete" onPress={() => setCtxStatus("Delete")} />
            </ContextMenu>

            <Spacing />
            <Text>Left-click the button below for a left-click context menu.</Text>
            <Button title="Left-click me (left ctx)" onPress={() => {}} />
            <ContextMenu id="ctx-left" mouseButton="left">
              <MenuItem label="Option A" onPress={() => setCtxStatus("Option A")} />
              <MenuItem label="Option B" onPress={() => setCtxStatus("Option B")} />
            </ContextMenu>

            <Spacing />
            <Text>Right-click anywhere in this window for the window context menu.</Text>
            <Text>Context menu action: {ctxStatus}</Text>
          </Column>
        </CollapsingHeader>

        <ContextMenu id="ctx-window" target="window">
          <MenuItem label="Refresh" onPress={() => setCtxStatus("Refresh")} />
          <MenuItem label="Properties" onPress={() => setCtxStatus("Properties")} />
        </ContextMenu>

      </Column>
    </Window>
  );
}
