export function ButtonsDemo(props: { onClose: () => void }) {
  const [pressCount, setPressCount] = useState(0);
  const [lastDirection, setLastDirection] = useState("none");
  const [invisibleCount, setInvisibleCount] = useState(0);
  const [checked, setChecked] = useState(false);

  return (
    <Window title="Buttons Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Button — basic press counter" defaultOpen={true}>
          <Button title="Press Me" onPress={() => setPressCount(pressCount + 1)} />
          <Text>Pressed: {pressCount} times</Text>
        </CollapsingHeader>

        <CollapsingHeader label="SmallButton — compact variant" defaultOpen={true}>
          <SmallButton label="Small" onPress={() => {}} />
          <SameLine spacing={8} />
          <SmallButton label="Compact" onPress={() => {}} />
          <SameLine spacing={8} />
          <SmallButton label="Buttons" onPress={() => {}} />
        </CollapsingHeader>

        <CollapsingHeader label="ArrowButton — directional buttons" defaultOpen={true}>
          <Row gap={4}>
            <ArrowButton id="arrow-left" direction="left" onPress={() => setLastDirection("left")} />
            <ArrowButton id="arrow-right" direction="right" onPress={() => setLastDirection("right")} />
            <ArrowButton id="arrow-up" direction="up" onPress={() => setLastDirection("up")} />
            <ArrowButton id="arrow-down" direction="down" onPress={() => setLastDirection("down")} />
          </Row>
          <Text>Last direction: {lastDirection}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="InvisibleButton — invisible hitbox" defaultOpen={true}>
          <InvisibleButton id="invis-btn" width={200} height={30} onPress={() => setInvisibleCount(invisibleCount + 1)} />
          <Text>Click the invisible 200x30 area above. Count: {invisibleCount}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="ImageButton — clickable image" defaultOpen={true}>
          <ImageButton id="img-btn" src="image.jpg" width={48} height={48} onPress={() => {}} />
          <Text>48x48 image button (image.jpg)</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Checkbox — toggle boolean" defaultOpen={true}>
          <Checkbox label="Enable feature" value={checked} onChange={(v) => setChecked(v)} />
          <Text>Checkbox is: {checked ? "checked" : "unchecked"}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Disabled — wraps any widget" defaultOpen={true}>
          <Disabled>
            <Button title="Can't click" onPress={() => {}} />
          </Disabled>
          <Text disabled>The button above is wrapped in Disabled and cannot be clicked.</Text>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
