export function TextDemo(props: {}) {
  return (
    <TreeNode label="Text">

      <CollapsingHeader label="Plain Text">
        <Text>Normal text</Text>
      </CollapsingHeader>

      <CollapsingHeader label="Colored Text">
        <Text color={[1.0, 0.3, 0.3, 1.0]}>Red colored text</Text>
        <Text color={[0.3, 1.0, 0.5, 1.0]}>Green colored text</Text>
        <Text color={[0.4, 0.7, 1.0, 1.0]}>Blue colored text</Text>
      </CollapsingHeader>

      <CollapsingHeader label="Disabled Text">
        <Text disabled>Grayed out / disabled text</Text>
      </CollapsingHeader>

      <CollapsingHeader label="Wrapped Text">
        <Text wrapped>This is a long paragraph that will automatically wrap to the next line when it exceeds the available width. IMX makes it easy to display multi-line text content.</Text>
      </CollapsingHeader>

      <CollapsingHeader label="Colored + Wrapped Text">
        <Text color={[1.0, 0.8, 0.3, 1.0]} wrapped>This golden colored text also wraps automatically across multiple lines, demonstrating that color and wrapping can be combined on a single Text element.</Text>
      </CollapsingHeader>

      <CollapsingHeader label="BulletText">
        <BulletText>First bullet point</BulletText>
        <BulletText>Second bullet point</BulletText>
        <BulletText>Third bullet point</BulletText>
      </CollapsingHeader>

      <CollapsingHeader label="Bullet + SameLine + Text">
        <Bullet />
        <SameLine spacing={4} />
        <Text>Standalone bullet with text placed via SameLine</Text>
      </CollapsingHeader>

      <CollapsingHeader label="LabelText">
        <LabelText label="Version" value="1.0.0" />
        <LabelText label="Platform" value="Windows 11" />
        <LabelText label="Framework" value="Dear ImGui" />
      </CollapsingHeader>

    </TreeNode>
  );
}
