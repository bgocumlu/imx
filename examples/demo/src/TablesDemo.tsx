export function TablesDemo(props: { onClose: () => void }) {
  const [sortCount, setSortCount] = useState(0);

  return (
    <Window title="Tables Demo" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Basic Table" defaultOpen={true}>
          <Column gap={6}>
            <Text>Three-column table with Text and Button cells.</Text>
            <Table columns={["Name", "Value", "Action"]}>
              <TableRow>
                <TableCell><Text>Alpha</Text></TableCell>
                <TableCell><Text>100</Text></TableCell>
                <TableCell><Button title="Edit" onPress={() => {}} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>Beta</Text></TableCell>
                <TableCell><Text>250</Text></TableCell>
                <TableCell><Button title="Edit" onPress={() => {}} /></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>Gamma</Text></TableCell>
                <TableCell><Text>42</Text></TableCell>
                <TableCell><Button title="Edit" onPress={() => {}} /></TableCell>
              </TableRow>
            </Table>
          </Column>
        </CollapsingHeader>

        <CollapsingHeader label="Sortable Table" defaultOpen={true}>
          <Column gap={6}>
            <Text>sortable multiSortable hideable with column metadata. Sort count: {sortCount}</Text>
            <Table
              sortable
              multiSortable
              hideable
              onSort={(specs) => setSortCount(sortCount + 1)}
              columns={[
                { label: "System", fixedWidth: true, preferSortAscending: true },
                { label: "Priority", noResize: true },
                { label: "Notes", preferSortDescending: true }
              ]}
            >
              <TableRow>
                <TableCell><Text>Core</Text></TableCell>
                <TableCell><Text>High</Text></TableCell>
                <TableCell><Text>Always running</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>Network</Text></TableCell>
                <TableCell><Text>Medium</Text></TableCell>
                <TableCell><Text>On demand</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>Logger</Text></TableCell>
                <TableCell><Text>Low</Text></TableCell>
                <TableCell><Text>Background only</Text></TableCell>
              </TableRow>
            </Table>
          </Column>
        </CollapsingHeader>

        <CollapsingHeader label="Styled Table" defaultOpen={true}>
          <Column gap={6}>
            <Text>scrollX scrollY padOuterX noClip with fixed size, row/cell coloring, and column jump.</Text>
            <Table
              columns={["ID", "Label", "Status"]}
              scrollX
              scrollY
              padOuterX
              noClip
              style={{ width: 400, height: 150 }}
            >
              <TableRow>
                <TableCell><Text>001</Text></TableCell>
                <TableCell><Text>Normal row</Text></TableCell>
                <TableCell><Text>OK</Text></TableCell>
              </TableRow>
              <TableRow bgColor={[0.2, 0.15, 0.15, 1.0]}>
                <TableCell><Text>002</Text></TableCell>
                <TableCell><Text>Red-tinted row</Text></TableCell>
                <TableCell><Text>WARNING</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>003</Text></TableCell>
                <TableCell bgColor={[0.15, 0.2, 0.15, 1.0]}><Text>Green cell</Text></TableCell>
                <TableCell><Text>OK</Text></TableCell>
              </TableRow>
              <TableRow bgColor={[0.2, 0.15, 0.15, 1.0]}>
                <TableCell><Text>004</Text></TableCell>
                <TableCell><Text>Another red row</Text></TableCell>
                <TableCell><Text>ERROR</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>005</Text></TableCell>
                <TableCell><Text>Normal row</Text></TableCell>
                <TableCell columnIndex={2}><Text>Jumped to col 2</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>006</Text></TableCell>
                <TableCell><Text>More rows</Text></TableCell>
                <TableCell><Text>OK</Text></TableCell>
              </TableRow>
              <TableRow>
                <TableCell><Text>007</Text></TableCell>
                <TableCell><Text>Scroll to see</Text></TableCell>
                <TableCell><Text>OK</Text></TableCell>
              </TableRow>
            </Table>
          </Column>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
