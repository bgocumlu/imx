export function Phase18(props: { onClose: () => void }) {
  const [listSel, setListSel] = useState(0);
  const [spanSel, setSpanSel] = useState(false);
  const [rowBSel, setRowBSel] = useState(false);
  const [dblCount, setDblCount] = useState(0);

  return (
    <Window title="Phase 18: Text & Display Variants" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Text Variants" defaultOpen>
          <Text disabled>color, disabled, wrapped props on Text component.</Text>
          <Text>Normal text</Text>
          <Text color={[1.0, 0.3, 0.3, 1.0]}>Red colored text</Text>
          <Text color={[0.3, 1.0, 0.3, 1.0]}>Green colored text</Text>
          <Text color={[0.4, 0.6, 1.0, 1.0]}>Blue colored text</Text>
          <Text disabled>Disabled (grayed out) text</Text>
          <Text wrapped>This text uses the wrapped prop for automatic wrapping. When the window is narrow enough, the text will flow to the next line instead of extending beyond the visible area.</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Bullet" defaultOpen>
          <Text disabled>Bullet standalone and BulletText for bulleted lists.</Text>
          <BulletText>First bullet item</BulletText>
          <BulletText>Second bullet item</BulletText>
          <BulletText>Third bullet item</BulletText>
          <Bullet />
          <SameLine />
          <Text>Manual bullet + SameLine + Text</Text>
        </CollapsingHeader>

        <CollapsingHeader label="Selectable Enhancements" defaultOpen>
          <Text disabled>spanAllColumns, allowDoubleClick props on Selectable.</Text>
          <Table columns={["Name", "Value", "Action"]}>
            <TableRow>
              <Selectable label="Row A — spans all columns" spanAllColumns={true} selected={spanSel} onSelect={() => setSpanSel(!spanSel)} />
            </TableRow>
            <TableRow>
              <Selectable label="Row B — single column only" selected={rowBSel} onSelect={() => setRowBSel(!rowBSel)} />
              <Text>Normal</Text>
              <Text>-</Text>
            </TableRow>
          </Table>
          <Selectable label="Double-click me" allowDoubleClick={true} onDoubleClicked={() => setDblCount(dblCount + 1)} />
          <Text>Double-click count: {dblCount}</Text>
        </CollapsingHeader>

        <CollapsingHeader label="ListBox Manual Mode" defaultOpen>
          <Text disabled>ListBox with children uses BeginListBox/EndListBox for custom content.</Text>
          <ListBox label="Manual ListBox" width={200} height={100}>
            <Selectable label="Apple" selected={listSel === 0} onSelect={() => setListSel(0)} />
            <Selectable label="Banana" selected={listSel === 1} onSelect={() => setListSel(1)} />
            <Selectable label="Cherry" selected={listSel === 2} onSelect={() => setListSel(2)} />
            <Selectable label="Date" selected={listSel === 3} onSelect={() => setListSel(3)} />
            <Selectable label="Elderberry" selected={listSel === 4} onSelect={() => setListSel(4)} />
          </ListBox>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
