export function MenusDemo(props: {}) {
  const [showModal, setShowModal] = useState(false);
  const [modalResult, setModalResult] = useState("(none)");
  const [ctxStatus, setCtxStatus] = useState("(none)");

  return (
    <TreeNode label="Menus & Popups">

      <CollapsingHeader label="Menu Bar">
        <Column gap={6}>
          <Text disabled>MenuBar is a window-level component — must be a direct child of Window.</Text>
          <Text disabled>See the phases app (Phase 17) or standalone examples for a working MenuBar.</Text>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Modal Dialog">
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

      <CollapsingHeader label="Context Menus">
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
          <Text>Context menu action: {ctxStatus}</Text>
        </Column>
      </CollapsingHeader>

    </TreeNode>
  );
}
