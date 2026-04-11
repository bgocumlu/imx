import { Phase11 } from './Phase11';
import { Phase12 } from './Phase12';

export default function App(props: PhasesState) {
  const [showPhase11, setShowPhase11] = useState(false);
  const [showPhase12, setShowPhase12] = useState(false);
  const [showPhase13, setShowPhase13] = useState(false);
  const [showPhase14, setShowPhase14] = useState(false);
  const [showPhase15, setShowPhase15] = useState(false);
  const [showPhase16, setShowPhase16] = useState(false);
  const [showPhase17, setShowPhase17] = useState(false);
  const [showPhase18, setShowPhase18] = useState(false);

  return (
    <Font name="inter-ui" src="Inter-Regular.ttf" size={16} embed>
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={0.22}>
          <DockPanel>
            <Window title="Phase Showcase" />
          </DockPanel>
          <DockPanel>
            <Window title="Phase Content" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <Window title="Phase Showcase">
        <Column gap={4}>
          <Text>IMX Phase Showcase</Text>
          <Text disabled>Select a phase to open its demo window.</Text>
          <Text disabled>Phase files are added incrementally.</Text>
          <Separator />
          <Button title="Phase 11: C++ Struct Binding" onPress={() => setShowPhase11(!showPhase11)} />
          <Button title="Phase 12: Struct Binding Fixes" onPress={() => setShowPhase12(!showPhase12)} />
          <Button title="Phase 13: Font & Input Expansion" onPress={() => setShowPhase13(!showPhase13)} />
          <Button title="Phase 14: Layout & Positioning" onPress={() => setShowPhase14(!showPhase14)} />
          <Button title="Phase 15: Table & Tree Enhancements" onPress={() => setShowPhase15(!showPhase15)} />
          <Button title="Phase 16: Interaction & State Queries" onPress={() => setShowPhase16(!showPhase16)} />
          <Button title="Phase 17: Window & Popup Control" onPress={() => setShowPhase17(!showPhase17)} />
          <Button title="Phase 18: Text & Display Variants" onPress={() => setShowPhase18(!showPhase18)} />
        </Column>
      </Window>
      <Window title="Phase Content">
        <Text disabled>Select a phase from the left panel.</Text>
      </Window>
      {showPhase11 && <Phase11
        onClose={() => setShowPhase11(false)}
        data={props.phase11}
      />}
      {showPhase12 && <Phase12
        onClose={() => setShowPhase12(false)}
        data={props.phase12}
      />}
    </DockSpace>
    </Font>
  );
}
