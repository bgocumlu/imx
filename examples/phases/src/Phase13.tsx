export function Phase13(props: { onClose: () => void }) {
  const [float2, setFloat2] = useState([0.5, 0.5] as [number, number]);
  const [int3, setInt3] = useState([1, 2, 3] as [number, number, number]);
  const [slider3, setSlider3] = useState([0.2, 0.5, 0.8] as [number, number, number]);
  const [drag2, setDrag2] = useState([10.0, 20.0] as [number, number]);
  const [vFloat, setVFloat] = useState(0.5);
  const [vInt, setVInt] = useState(3);
  const [angle, setAngle] = useState(45.0);
  const [arrowDir, setArrowDir] = useState(0);
  const [invisCount, setInvisCount] = useState(0);
  const [color3, setColor3] = useState([0.8, 0.3, 0.2] as [number, number, number]);
  const [pickerColor, setPickerColor] = useState([0.2, 0.6, 0.9] as [number, number, number]);

  return (
    <Window title="Phase 13: Font & Input Expansion" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Font Loading" defaultOpen>
          <Text disabled>Font component wraps PushFont/PopFont for per-subtree font selection.</Text>
          <Text>Default font (Inter)</Text>
          <Font name="mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
            <Text>Monospace font (JetBrains Mono, embedded)</Text>
          </Font>
          <Text>Back to default font</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Vector Inputs" defaultOpen>
          <Text disabled>Multi-component value editing: InputFloat2, InputInt3, etc.</Text>
          <InputFloat2 label="Position" value={float2} onChange={setFloat2} />
          <InputInt3 label="RGB int" value={int3} onChange={setInt3} />
        </CollapsingHeader>

        <CollapsingHeader label="Vector Sliders & Drags" defaultOpen>
          <Text disabled>SliderFloat3, DragFloat2, and variants.</Text>
          <SliderFloat3 label="Color HSL" value={slider3} onChange={setSlider3} min={0} max={1} />
          <DragFloat2 label="Offset" value={drag2} onChange={setDrag2} speed={0.5} />
        </CollapsingHeader>

        <CollapsingHeader label="Vertical Sliders & Angle" defaultOpen>
          <Text disabled>VSliderFloat, VSliderInt (vertical), SliderAngle (degrees).</Text>
          <Row gap={12}>
            <VSliderFloat label="##vf" value={vFloat} onChange={setVFloat} width={30} height={100} min={0} max={1} />
            <VSliderInt label="##vi" value={vInt} onChange={setVInt} width={30} height={100} min={0} max={10} />
          </Row>
          <SliderAngle label="Rotation" value={angle} onChange={setAngle} />
        </CollapsingHeader>

        <CollapsingHeader label="Button Variants" defaultOpen>
          <Text disabled>SmallButton, ArrowButton, InvisibleButton.</Text>
          <Row gap={8}>
            <SmallButton label="Small" onPress={() => setArrowDir(0)} />
            <ArrowButton id="arr_l" direction="left" onPress={() => setArrowDir(0)} />
            <ArrowButton id="arr_r" direction="right" onPress={() => setArrowDir(1)} />
            <ArrowButton id="arr_u" direction="up" onPress={() => setArrowDir(2)} />
            <ArrowButton id="arr_d" direction="down" onPress={() => setArrowDir(3)} />
          </Row>
          <InvisibleButton id="invis" width={80} height={20} onPress={() => setInvisCount(invisCount + 1)} />
          <Text disabled>Invisible button clicked: {invisCount} times</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Color Variants (RGB)" defaultOpen>
          <Text disabled>ColorEdit3 and ColorPicker3 — RGB without alpha channel.</Text>
          <ColorEdit3 label="Edit RGB" value={color3} onChange={setColor3} />
          <ColorPicker3 label="Pick RGB" value={pickerColor} onChange={setPickerColor} />
        </CollapsingHeader>

        <CollapsingHeader label="Advanced Drawing">
          <Text disabled>Bezier curves, polylines, ngons, triangles on Canvas.</Text>
          <Canvas width={300} height={180}>
            <DrawBezierCubic p1={[10, 80]} p2={[60, 10]} p3={[140, 150]} p4={[190, 80]} color={[0.4, 0.8, 1.0, 1.0]} thickness={2} />
            <DrawPolyline points={[[200, 20], [240, 80], [280, 30], [260, 120]]} color={[1.0, 0.6, 0.2, 1.0]} thickness={2} closed={true} />
            <DrawNgonFilled center={[60, 140]} radius={25} color={[0.3, 0.9, 0.4, 0.7]} numSegments={6} />
            <DrawTriangle p1={[120, 120]} p2={[160, 170]} p3={[100, 170]} color={[0.9, 0.3, 0.6, 1.0]} filled={true} />
          </Canvas>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
