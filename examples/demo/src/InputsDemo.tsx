export function InputsDemo(props: {}) {
  const [textVal, setTextVal] = useState("Hello IMX");
  const [multilineVal, setMultilineVal] = useState("Line one\nLine two\nLine three");
  const [intVal, setIntVal] = useState(42);
  const [floatVal, setFloatVal] = useState(3.14);

  const [f2, setF2] = useState([1.0, 2.0]);
  const [f3, setF3] = useState([1.0, 2.0, 3.0]);
  const [f4, setF4] = useState([1.0, 2.0, 3.0, 4.0]);
  const [i2, setI2] = useState([10, 20]);
  const [i3, setI3] = useState([10, 20, 30]);
  const [i4, setI4] = useState([10, 20, 30, 40]);

  const [comboSimple, setComboSimple] = useState(0);
  const [comboManual, setComboManual] = useState(0);
  const [listSimple, setListSimple] = useState(0);
  const [listManual, setListManual] = useState(0);

  const [radioVal, setRadioVal] = useState(0);

  const [sel0, setSel0] = useState(false);
  const [sel1, setSel1] = useState(false);
  const [sel2, setSel2] = useState(false);

  return (
    <TreeNode label="Inputs">

      <CollapsingHeader label="Text Inputs">
        <Column gap={6}>
          <TextInput label="Name" value={textVal} onChange={(v) => setTextVal(v)} />
          <Text>Value: {textVal}</Text>
          <Spacing />
          <InputTextMultiline label="Notes" value={multilineVal} style={{ width: 300, height: 80 }} />
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Numeric Inputs">
        <Column gap={6}>
          <InputInt label="Count" value={intVal} onChange={(v) => setIntVal(v)} />
          <Text>Int value: {intVal}</Text>
          <Spacing />
          <InputFloat label="Rate" value={floatVal} onChange={(v) => setFloatVal(v)} />
          <Text>Float value: {floatVal}</Text>
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Vector Inputs">
        <Column gap={6}>
          <Text>InputFloat2 / InputFloat3 / InputFloat4</Text>
          <InputFloat2 label="Vec2" value={f2} onChange={(v) => setF2(v)} />
          <InputFloat3 label="Vec3" value={f3} onChange={(v) => setF3(v)} />
          <InputFloat4 label="Vec4" value={f4} onChange={(v) => setF4(v)} />
          <Spacing />
          <Text>InputInt2 / InputInt3 / InputInt4</Text>
          <InputInt2 label="IVec2" value={i2} onChange={(v) => setI2(v)} />
          <InputInt3 label="IVec3" value={i3} onChange={(v) => setI3(v)} />
          <InputInt4 label="IVec4" value={i4} onChange={(v) => setI4(v)} />
        </Column>
      </CollapsingHeader>

      <CollapsingHeader label="Selection Widgets">
        <Column gap={6}>

          <Text>Combo — simple mode (items array)</Text>
          <Combo label="Fruit" value={comboSimple} onChange={(v) => setComboSimple(v)} items={["Apple", "Banana", "Cherry"]} />
          <Text>Selected index: {comboSimple}</Text>

          <Spacing />
          <Text>Combo — manual mode (children)</Text>
          <Combo label="Pick one" preview="Select...">
            <Selectable label="Option A" selected={comboManual === 0} onSelect={() => setComboManual(0)} />
            <Selectable label="Option B" selected={comboManual === 1} onSelect={() => setComboManual(1)} />
            <Selectable label="Option C" selected={comboManual === 2} onSelect={() => setComboManual(2)} />
          </Combo>
          <Text>Manual combo index: {comboManual}</Text>

          <Spacing />
          <Text>ListBox — simple mode (items array)</Text>
          <ListBox label="Color" value={listSimple} onChange={(v) => setListSimple(v)} items={["Red", "Green", "Blue"]} />
          <Text>Selected index: {listSimple}</Text>

          <Spacing />
          <Text>ListBox — manual mode (children)</Text>
          <ListBox label="##manual-lb" width={200} height={100}>
            <Selectable label="Row Alpha" selected={listManual === 0} onSelect={() => setListManual(0)} />
            <Selectable label="Row Beta" selected={listManual === 1} onSelect={() => setListManual(1)} />
            <Selectable label="Row Gamma" selected={listManual === 2} onSelect={() => setListManual(2)} />
          </ListBox>
          <Text>Manual listbox index: {listManual}</Text>

          <Spacing />
          <Text>Radio — three choices share one value</Text>
          <Row gap={8}>
            <Radio label="One" value={radioVal} index={0} onChange={(v) => setRadioVal(v)} />
            <Radio label="Two" value={radioVal} index={1} onChange={(v) => setRadioVal(v)} />
            <Radio label="Three" value={radioVal} index={2} onChange={(v) => setRadioVal(v)} />
          </Row>
          <Text>Radio value: {radioVal}</Text>

          <Spacing />
          <Text>Selectable — various flags</Text>
          <Selectable label="Normal selectable" selected={sel0} onSelect={() => setSel0(!sel0)} />
          <Selectable label="Span all columns (spanAllColumns)" selected={sel1} onSelect={() => setSel1(!sel1)} spanAllColumns={true} />
          <Selectable label="Double-click to toggle (allowDoubleClick)" selected={sel2} allowDoubleClick={true} onDoubleClicked={() => setSel2(!sel2)} />

        </Column>
      </CollapsingHeader>

    </TreeNode>
  );
}
