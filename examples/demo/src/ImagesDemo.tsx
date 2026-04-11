export function ImagesDemo(props: {}) {
  const [clicks, setClicks] = useState(0);

  return (
    <TreeNode label="Images">

      <CollapsingHeader label="File-Loaded Images">
        <Text disabled>Loaded at runtime from the exe directory (public/ assets are copied there).</Text>
        <Row gap={16}>
          <Column gap={4}>
            <Text>flower.jpg</Text>
            <Image src="flower.jpg" width={200} height={150} />
          </Column>
          <Column gap={4}>
            <Text>image.jpg</Text>
            <Image src="image.jpg" width={200} height={150} />
          </Column>
        </Row>
      </CollapsingHeader>

      <CollapsingHeader label="Embedded Images">
        <Text disabled>Baked into the binary at compile time via stb_image embed.</Text>
        <Row gap={16}>
          <Column gap={4}>
            <Text>flower.jpg (embedded)</Text>
            <Image src="flower.jpg" embed width={200} height={150} />
          </Column>
          <Column gap={4}>
            <Text>image.jpg (embedded)</Text>
            <Image src="image.jpg" embed width={200} height={150} />
          </Column>
        </Row>
      </CollapsingHeader>

      <CollapsingHeader label="Image Button">
        <Text disabled>ImageButton renders an image as a clickable button.</Text>
        <ImageButton
          id="img-btn"
          src="image.jpg"
          width={64}
          height={64}
          onPress={() => setClicks(clicks + 1)}
        />
        <Text>Button clicked: {clicks} times</Text>
      </CollapsingHeader>

    </TreeNode>
  );
}
