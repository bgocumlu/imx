import { KanbanCard } from './KanbanCard';

export default function App(props: KanbanState) {
  return (
    <Theme preset="dark" accentColor={[0.6, 0.4, 0.9, 1.0]} rounding={6}>
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={1.0}>
          <DockPanel>
            <Window title="Kanban Board" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <Window title="Kanban Board">
        <Column gap={8}>
          <Row gap={16}>
            {props.columns.map((col, ci) => (
              <ID scope={ci} key={ci}>
                <Column gap={4} style={{ minWidth: 200 }}>
                  <Text style={{ fontSize: 16 }}>{col.name}</Text>
                  <Separator />
                  {col.cards.map((card, i) => (
                    <ID scope={i} key={i}>
                      <KanbanCard title={card.title} id={card.id} />
                    </ID>
                  ))}
                  <DragDropTarget type="card" onDrop={(cardId: number) => {}}>
                    <View style={{ minHeight: 30, backgroundColor: [0.15, 0.15, 0.2, 1.0] }}>
                      <Text style={{ textColor: [0.5, 0.5, 0.5, 1.0] }}>Drop here</Text>
                    </View>
                  </DragDropTarget>
                  <Button title="+ Add Card" onPress={col.onAdd} />
                </Column>
              </ID>
            ))}
          </Row>
          <Separator />
          <Button title="Clear All" onPress={props.onClearAll} />
        </Column>
      </Window>
    </DockSpace>
    </Theme>
  );
}
