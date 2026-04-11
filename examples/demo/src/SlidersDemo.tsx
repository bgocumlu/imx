export function SlidersDemo(props: {}) {
  const [sf, setSf] = useState(0.5);
  const [si, setSi] = useState(50);
  const [angle, setAngle] = useState(0.0);

  const [vs0, setVs0] = useState(0.3);
  const [vs1, setVs1] = useState(0.6);
  const [vs2, setVs2] = useState(0.9);
  const [vsi0, setVsi0] = useState(30);
  const [vsi1, setVsi1] = useState(60);
  const [vsi2, setVsi2] = useState(90);

  const [df, setDf] = useState(1.0);
  const [di, setDi] = useState(5);

  const [sf2, setSf2] = useState([0.2, 0.8]);
  const [sf3, setSf3] = useState([0.2, 0.5, 0.8]);
  const [sf4, setSf4] = useState([0.1, 0.3, 0.6, 0.9]);
  const [si2, setSi2] = useState([10, 90]);
  const [si3, setSi3] = useState([10, 50, 90]);
  const [si4, setSi4] = useState([10, 30, 60, 90]);

  const [df2, setDf2] = useState([0.0, 1.0]);
  const [df3, setDf3] = useState([0.0, 0.5, 1.0]);
  const [df4, setDf4] = useState([0.0, 0.33, 0.66, 1.0]);
  const [di2, setDi2] = useState([0, 10]);
  const [di3, setDi3] = useState([0, 5, 10]);
  const [di4, setDi4] = useState([0, 3, 7, 10]);

  return (
    <TreeNode label="Sliders & Drags">

      <CollapsingHeader label="Sliders">
        <Column gap={6}>
          <SliderFloat label="Float [0..1]" value={sf} onChange={(v) => setSf(v)} min={0.0} max={1.0} width={200} />
          <Text>Value: {sf}</Text>
          <Spacing />
          <SliderInt label="Int [0..100]" value={si} onChange={(v) => setSi(v)} min={0} max={100} width={200} />
          <Text>Value: {si}</Text>
          <Spacing />
          <SliderAngle label="Angle" value={angle} onChange={(v) => setAngle(v)} min={-180} max={180} width={200} />
          <Text>Value: {angle}</Text>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Vertical Sliders">
        <Column gap={6}>
          <Text>VSliderFloat — three vertical float sliders in a row</Text>
          <Row gap={8}>
            <VSliderFloat label="A" value={vs0} onChange={(v) => setVs0(v)} min={0.0} max={1.0} width={18} height={120} />
            <VSliderFloat label="B" value={vs1} onChange={(v) => setVs1(v)} min={0.0} max={1.0} width={18} height={120} />
            <VSliderFloat label="C" value={vs2} onChange={(v) => setVs2(v)} min={0.0} max={1.0} width={18} height={120} />
          </Row>
          <Spacing />
          <Text>VSliderInt — three vertical int sliders in a row</Text>
          <Row gap={8}>
            <VSliderInt label="X" value={vsi0} onChange={(v) => setVsi0(v)} min={0} max={100} width={18} height={120} />
            <VSliderInt label="Y" value={vsi1} onChange={(v) => setVsi1(v)} min={0} max={100} width={18} height={120} />
            <VSliderInt label="Z" value={vsi2} onChange={(v) => setVsi2(v)} min={0} max={100} width={18} height={120} />
          </Row>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Drags">
        <Column gap={6}>
          <DragFloat label="Drag Float" value={df} onChange={(v) => setDf(v)} speed={0.1} width={200} />
          <Text>Value: {df}</Text>
          <Spacing />
          <DragInt label="Drag Int" value={di} onChange={(v) => setDi(v)} width={200} />
          <Text>Value: {di}</Text>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Vector Sliders">
        <Column gap={6}>
          <Text>SliderFloat2 / SliderFloat3 / SliderFloat4</Text>
          <SliderFloat2 label="Vec2 [0..1]" value={sf2} onChange={(v) => setSf2(v)} min={0.0} max={1.0} width={200} />
          <SliderFloat3 label="Vec3 [0..1]" value={sf3} onChange={(v) => setSf3(v)} min={0.0} max={1.0} width={220} />
          <SliderFloat4 label="Vec4 [0..1]" value={sf4} onChange={(v) => setSf4(v)} min={0.0} max={1.0} width={240} />
          <Spacing />
          <Text>SliderInt2 / SliderInt3 / SliderInt4</Text>
          <SliderInt2 label="IVec2 [0..100]" value={si2} onChange={(v) => setSi2(v)} min={0} max={100} width={200} />
          <SliderInt3 label="IVec3 [0..100]" value={si3} onChange={(v) => setSi3(v)} min={0} max={100} width={220} />
          <SliderInt4 label="IVec4 [0..100]" value={si4} onChange={(v) => setSi4(v)} min={0} max={100} width={240} />
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Vector Drags">
        <Column gap={6}>
          <Text>DragFloat2 / DragFloat3 / DragFloat4</Text>
          <DragFloat2 label="DFloat2" value={df2} onChange={(v) => setDf2(v)} speed={0.1} width={200} />
          <DragFloat3 label="DFloat3" value={df3} onChange={(v) => setDf3(v)} speed={0.1} width={220} />
          <DragFloat4 label="DFloat4" value={df4} onChange={(v) => setDf4(v)} speed={0.1} width={240} />
          <Spacing />
          <Text>DragInt2 / DragInt3 / DragInt4</Text>
          <DragInt2 label="DInt2" value={di2} onChange={(v) => setDi2(v)} width={200} />
          <DragInt3 label="DInt3" value={di3} onChange={(v) => setDi3(v)} width={220} />
          <DragInt4 label="DInt4" value={di4} onChange={(v) => setDi4(v)} width={240} />
        </Column>
      </CollapsingHeader>

    </TreeNode>
  );
}
