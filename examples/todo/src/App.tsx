import { TodoItem } from './TodoItem';

export default function App(props: TodoState) {
  const [filter, setFilter] = useState(0);

  return (
    <Theme preset="dark" accentColor={[0.3, 0.6, 0.9, 1.0]} backgroundColor={[0.12, 0.12, 0.15, 1.0]} textColor={[0.95, 0.95, 0.95, 1.0]} borderColor={[0.3, 0.3, 0.35, 1.0]} surfaceColor={[0.18, 0.18, 0.22, 1.0]} rounding={4}>
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={1.0}>
          <DockPanel>
            <Window title="Todo App" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <Window title="Todo App">
        <Column gap={6}>
          <AddTaskInput />

          <Text>{props.itemCount - props.doneCount} remaining, {props.doneCount} completed</Text>

          <Separator />

          <Row gap={12}>
            <Radio label="All" value={filter} index={0} onChange={setFilter} />
            <Radio label="Active" value={filter} index={1} onChange={setFilter} />
            <Radio label="Completed" value={filter} index={2} onChange={setFilter} />
          </Row>

          <Separator />

          {props.items.map((item, i) => (
            <ID scope={i} key={i}>
              {filter === 0 && <TodoItem text={item.text} done={item.done} onToggle={item.onToggle} onRemove={item.onRemove} />}
              {filter === 1 && !item.done && <TodoItem text={item.text} done={item.done} onToggle={item.onToggle} onRemove={item.onRemove} />}
              {filter === 2 && item.done && <TodoItem text={item.text} done={item.done} onToggle={item.onToggle} onRemove={item.onRemove} />}
            </ID>
          ))}

          <Separator />

          <Button title="Clear Completed" onPress={props.onClearCompleted} />
        </Column>
      </Window>
    </DockSpace>
    </Theme>
  );
}
