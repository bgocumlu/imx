export function Phase15(props: { onClose: () => void; data: Phase15Data }) {
  const [showHeader, setShowHeader] = useState(true);
  const [treeOpen, setTreeOpen] = useState(true);

  return (
    <Window title="Phase 15: Table & Tree Enhancements" open={true} onClose={props.onClose}>
      <Column gap={8}>

        <CollapsingHeader label="Sortable Table" defaultOpen>
          <Text disabled>Click column headers to sort. Row/cell bgColor highlights status.</Text>
          <Table
            columns={[
              { label: "Name", preferSortAscending: true },
              { label: "Score", preferSortDescending: true },
              { label: "Status", noResize: true, fixedWidth: true }
            ]}
            sortable={true}
            hideable={true}
            onSort={(specs: ImGuiTableSortSpecs) => {
              props.data.sort_rows(specs.Specs[0].ColumnIndex, specs.Specs[0].SortDirection);
            }}
          >
            {props.data.rows.map((row, i) => (
              <TableRow key={i} bgColor={row.status === "Fail" ? [0.25, 0.1, 0.1, 1.0] : [0.0, 0.0, 0.0, 0.0]}>
                <Text>{row.name}</Text>
                <Text>{row.score}</Text>
                <TableCell bgColor={row.status === "Pass" ? [0.1, 0.3, 0.1, 1.0] : row.status === "Warn" ? [0.3, 0.2, 0.1, 1.0] : [0.35, 0.1, 0.1, 1.0]}>
                  <Text>{row.status}</Text>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </CollapsingHeader>

        <CollapsingHeader label="Scrollable Table" defaultOpen>
          <Text disabled>scrollX, scrollY flags for large tables with fixed viewport.</Text>
          <Table
            columns={["A", "B", "C", "D", "E"]}
            scrollX={true}
            scrollY={true}
            style={{ height: 100 }}
          >
            <TableRow><Text>1</Text><Text>2</Text><Text>3</Text><Text>4</Text><Text>5</Text></TableRow>
            <TableRow><Text>6</Text><Text>7</Text><Text>8</Text><Text>9</Text><Text>10</Text></TableRow>
            <TableRow><Text>11</Text><Text>12</Text><Text>13</Text><Text>14</Text><Text>15</Text></TableRow>
            <TableRow><Text>16</Text><Text>17</Text><Text>18</Text><Text>19</Text><Text>20</Text></TableRow>
            <TableRow><Text>21</Text><Text>22</Text><Text>23</Text><Text>24</Text><Text>25</Text></TableRow>
          </Table>
        </CollapsingHeader>

        <CollapsingHeader label="Advanced TreeNode" defaultOpen>
          <Text disabled>TreeNode flags: defaultOpen, openOnArrow, leaf, bullet.</Text>
          <TreeNode label="Root (defaultOpen)" defaultOpen>
            <TreeNode label="Branch (openOnArrow)" openOnArrow>
              <TreeNode label="Leaf A" leaf>
                <Text>Leaf content A</Text>
              </TreeNode>
              <TreeNode label="Leaf B" leaf>
                <Text>Leaf content B</Text>
              </TreeNode>
            </TreeNode>
            <TreeNode label="Bullet node" bullet>
              <Text>Bullet styled node</Text>
            </TreeNode>
          </TreeNode>
        </CollapsingHeader>

        <CollapsingHeader label="Closable CollapsingHeader" defaultOpen>
          <Text disabled>closable prop adds an X button. onClose callback fires when closed.</Text>
          {showHeader && <CollapsingHeader label="Closable Section" closable onClose={() => setShowHeader(false)} defaultOpen>
            <Text>This section can be closed with the X button.</Text>
          </CollapsingHeader>}
          {!showHeader && <Column gap={4}>
            <Text disabled>Section was closed.</Text>
            <Button title="Restore" onPress={() => setShowHeader(true)} />
          </Column>}
        </CollapsingHeader>

        <CollapsingHeader label="Programmatic Tree Control" defaultOpen>
          <Text disabled>forceOpen prop controls tree open state programmatically.</Text>
          <Checkbox value={treeOpen} onChange={setTreeOpen} label="Force open" />
          <TreeNode label="Controlled node" forceOpen={treeOpen}>
            <Text>This node is controlled by the checkbox above.</Text>
          </TreeNode>
        </CollapsingHeader>

      </Column>
    </Window>
  );
}
