export function Phase11(props: { onClose: () => void; data: Phase11Data }) {
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState(0);

  return (
    <Window title="Phase 11: C++ Struct Binding" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Direct Pointer Binding" defaultOpen>
          <Text disabled>Props without onChange emit direct pointers to C++ struct fields.</Text>
          <SliderFloat label="Speed" value={props.data.speed} min={0} max={100} />
          <DragInt label="Count" value={props.data.count} speed={1} />
          <SliderFloat label="Volume" value={props.data.volume} min={0} max={100} />
        </CollapsingHeader>

        <CollapsingHeader label="Vector Iteration (.map)" defaultOpen>
          <Text disabled>std::vector iterated with .map() — each item bound by auto-reference.</Text>
          <Text disabled>Drag the progress sliders to write directly to C++ struct fields.</Text>
          {props.data.tasks.map((task, i) => (
            <ID scope={i}>
              <Row gap={8}>
                <Text>{task.name}</Text>
                <ProgressBar value={task.progress} style={{ width: 120 }} />
                <SliderFloat label="##progress" value={task.progress} min={0} max={1} width={100} />
              </Row>
            </ID>
          ))}
        </CollapsingHeader>

        <CollapsingHeader label="Callbacks from Struct" defaultOpen>
          <Text disabled>std::function fields in C++ struct invoked from TSX buttons.</Text>
          <Row gap={8}>
            <Button title="Add Task" onPress={props.data.add_task} />
            <Button title="Reset All" onPress={props.data.reset} />
          </Row>
        </CollapsingHeader>

        <CollapsingHeader label="useState Coexistence" defaultOpen>
          <Text disabled>useState for UI-only toggles alongside struct-bound data.</Text>
          <Checkbox value={showDetails} onChange={setShowDetails} label="Show Details" />
          {showDetails && <Column gap={2}>
            <Text disabled>The checkbox above is UI-only state (useState).</Text>
            <Text disabled>Struct-bound sliders above write directly to C++ memory.</Text>
            <Text disabled>Both coexist in the same component.</Text>
          </Column>}
          <Row gap={8}>
            <Radio label="Tasks" value={viewMode} index={0} onChange={setViewMode} />
            <Radio label="Names" value={viewMode} index={1} onChange={setViewMode} />
          </Row>
          {viewMode === 0 && props.data.tasks.map((task, i) => (
            <ID scope={i}>
              <Row gap={4}>
                <Text>{task.name}</Text>
                <ProgressBar value={task.progress} style={{ width: 80 }} />
              </Row>
            </ID>
          ))}
          {viewMode === 1 && props.data.tasks.map((task, i) => (
            <ID scope={i}>
              <Text>{task.name}</Text>
            </ID>
          ))}
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
