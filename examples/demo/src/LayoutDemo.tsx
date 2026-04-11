export function LayoutDemo(props: {}) {
  return (
    <TreeNode label="Layout">

      <CollapsingHeader label="Row — side-by-side items">
        <Row gap={8}>
          <Button title="Alpha" onPress={() => {}} />
          <Button title="Beta" onPress={() => {}} />
          <Button title="Gamma" onPress={() => {}} />
        </Row>
      </CollapsingHeader>

      <CollapsingHeader label="Column — stacked items">
        <Column gap={6}>
          <Text>First item</Text>
          <Text>Second item</Text>
          <Text>Third item</Text>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="View — generic container">
        <View>
          <Text>Wrapped inside a View</Text>
          <Text>Another line inside the View</Text>
        </View>
      </CollapsingHeader>

      <CollapsingHeader label="SameLine — manual inline placement">
        <Text>Label:</Text>
        <SameLine spacing={10} />
        <Button title="Inline Button" onPress={() => {}} />
      </CollapsingHeader>

      <CollapsingHeader label="NewLine / Spacing / Dummy">
        <Text>Before NewLine</Text>
        <NewLine />
        <Text>After NewLine (new line forced)</Text>
        <Spacing />
        <Text>After Spacing (extra vertical gap)</Text>
        <Dummy width={100} height={50} />
        <Text>After Dummy (invisible 100x50 placeholder)</Text>
      </CollapsingHeader>

      <CollapsingHeader label="Indent">
        <Text>Not indented</Text>
        <Indent width={20}>
          <Text>Indented by 20px</Text>
          <Text>Also indented</Text>
        </Indent>
        <Text>Back to normal indent</Text>
      </CollapsingHeader>

      <CollapsingHeader label="Child — scrollable region">
        <Child id="scroll-demo" width={300} height={120} border>
          <Text>Line 1 inside scrollable Child</Text>
          <Text>Line 2 inside scrollable Child</Text>
          <Text>Line 3 inside scrollable Child</Text>
          <Text>Line 4 inside scrollable Child</Text>
          <Text>Line 5 inside scrollable Child</Text>
          <Text>Line 6 inside scrollable Child</Text>
          <Text>Line 7 inside scrollable Child</Text>
          <Text>Line 8 — scroll down to see more</Text>
        </Child>
      </CollapsingHeader>

      <CollapsingHeader label="Cursor — manual absolute positioning">
        <Child id="cursor-demo" width={300} height={80} border>
          <Cursor x={10} y={10} />
          <Text>Placed at (10, 10)</Text>
          <Cursor x={150} y={40} />
          <Text>Placed at (150, 40)</Text>
        </Child>
      </CollapsingHeader>

    </TreeNode>
  );
}
