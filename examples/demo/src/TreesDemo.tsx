export function TreesDemo(props: {}) {
  const [treeForced, setTreeForced] = useState(false);
  const [showSection, setShowSection] = useState(true);

  return (
    <TreeNode label="Trees">

      <CollapsingHeader label="Basic Trees">
        <Column gap={4}>
          <Text>Basic nested TreeNode hierarchy.</Text>
          <TreeNode label="Fruits">
            <TreeNode label="Citrus">
              <Text>Lemon</Text>
              <Text>Orange</Text>
            </TreeNode>
            <TreeNode label="Berries">
              <Text>Strawberry</Text>
              <Text>Blueberry</Text>
            </TreeNode>
          </TreeNode>
          <TreeNode label="Vegetables">
            <Text>Carrot</Text>
            <Text>Broccoli</Text>
          </TreeNode>
          <TreeNode label="defaultOpen — auto-expanded" defaultOpen={true}>
            <Text>This node starts open</Text>
            <Text>No interaction needed</Text>
          </TreeNode>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Tree Flags">
        <Column gap={4}>
          <Text>openOnArrow — only expand by clicking the arrow.</Text>
          <TreeNode label="Arrow-only expand" openOnArrow={true}>
            <Text>Expanded via arrow click</Text>
          </TreeNode>
          <Spacing />
          <Text>openOnDoubleClick — expand by double-clicking the label.</Text>
          <TreeNode label="Double-click to expand" openOnDoubleClick={true}>
            <Text>Expanded via double-click</Text>
          </TreeNode>
          <Spacing />
          <Text>leaf + bullet + noTreePushOnOpen — bullet-style leaf nodes.</Text>
          <TreeNode label="Parent node">
            <TreeNode label="Leaf item A" leaf={true} bullet={true} noTreePushOnOpen={true} />
            <TreeNode label="Leaf item B" leaf={true} bullet={true} noTreePushOnOpen={true} />
            <TreeNode label="Leaf item C" leaf={true} bullet={true} noTreePushOnOpen={true} />
          </TreeNode>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Programmatic Control">
        <Column gap={6}>
          <Text>Checkbox drives forceOpen on the tree node.</Text>
          <Checkbox
            label="Force tree open"
            value={treeForced}
            onChange={(v) => setTreeForced(v)}
          />
          <TreeNode label="Programmatically controlled node" defaultOpen={true} forceOpen={treeForced}>
            <Text>I am forced open when checkbox is checked.</Text>
            <Text>I can still be collapsed when unchecked.</Text>
          </TreeNode>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Collapsing Headers">
        <Column gap={4}>
          <Text>Basic CollapsingHeader:</Text>
          <CollapsingHeader label="Section A">
            <Text>Content inside Section A</Text>
          </CollapsingHeader>
          <Spacing />
          <Text>CollapsingHeader with defaultOpen:</Text>
          <CollapsingHeader label="Section B — starts open" defaultOpen={true}>
            <Text>This section starts expanded.</Text>
          </CollapsingHeader>
          <Spacing />
          <Text>CollapsingHeader with closable + onClose (hides when X is clicked):</Text>
          {showSection && (
            <CollapsingHeader
              label="Closable Section"
              closable={true}
              onClose={() => setShowSection(false)}
            >
              <Text>Click the X button to dismiss this section.</Text>
            </CollapsingHeader>
          )}
          {!showSection && (
            <Button title="Restore Closable Section" onPress={() => setShowSection(true)} />
          )}
        </Column>
      </CollapsingHeader>

    </TreeNode>
  );
}
