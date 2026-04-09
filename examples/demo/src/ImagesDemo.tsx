export function ImagesDemo(props: { onClose: () => void }) {
  const [clicks, setClicks] = useState(0);

  return (
    <Window title="Images Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="File-Loaded Images" defaultOpen={true}>
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

        <CollapsingHeader label="Embedded Images" defaultOpen={true}>
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

        <CollapsingHeader label="Image Button" defaultOpen={true}>
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

      </Column>
    </Window>
  );
}
