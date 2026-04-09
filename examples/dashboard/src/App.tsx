export default function App(props: DashboardState) {
  return (
    <Theme preset="dark" accentColor={[0.2, 0.7, 0.9, 1.0]} rounding={4}>
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={0.65}>
          <DockSplit direction="vertical" size={0.55}>
            <DockPanel>
              <Window title="Metrics" />
            </DockPanel>
            <DockPanel>
              <Window title="Charts" />
            </DockPanel>
          </DockSplit>
          <DockPanel>
            <Window title="Logs" />
          </DockPanel>
        </DockSplit>
      </DockLayout>

      <Window title="Metrics">
        <Column gap={8}>
          <Row gap={16}>
            <Column gap={2}>
              <Text>CPU Usage</Text>
              <ProgressBar value={props.cpuUsage / 100} overlay={props.cpuUsage + "%"} style={{ width: 200 }} />
            </Column>
            <Column gap={2}>
              <Text>Memory Usage</Text>
              <ProgressBar value={props.memoryUsage / 100} overlay={props.memoryUsage + "%"} style={{ width: 200 }} />
            </Column>
          </Row>
          <Separator />
          <Row gap={16}>
            <LabelText label="Connections" value={props.activeConnections + ""} />
            <LabelText label="Requests/s" value={props.requestsPerSec + ""} />
          </Row>
          <Separator />
          <Button title="Reset Charts" onPress={props.onRefresh} />
        </Column>
      </Window>

      <Window title="Charts">
        <Column gap={8}>
          <PlotLines label="CPU %" values={props.cpuHistory} overlay="CPU" style={{ width: 400, height: 80 }} />
          <PlotLines label="Memory %" values={props.memHistory} overlay="Memory" style={{ width: 400, height: 80 }} />
          <PlotHistogram label="Requests/s" values={props.requestHistory} style={{ width: 400, height: 80 }} />
        </Column>
      </Window>

      <Window title="Logs">
        <Column gap={4}>
          <Button title="Clear Logs" onPress={props.onClearLogs} />
          <Table
            columns={[
              { label: "Time", fixedWidth: true, preferSortDescending: true },
              { label: "Level", noResize: true },
              { label: "Message", preferSortAscending: true },
            ]}
            sortable
            hideable
            multiSortable
            padOuterX
            noClip
            onSort={props.onSortLogs}
          >
            {props.logs.map((log, i) => (
              <TableRow bgColor={log.level === "ERROR" ? [0.24, 0.12, 0.12, 1.0] : log.level === "WARN" ? [0.20, 0.16, 0.10, 1.0] : [0.12, 0.16, 0.20, 1.0]}>
                <Text>{log.timestamp}</Text>
                <TableCell bgColor={log.level === "ERROR" ? [0.35, 0.12, 0.12, 1.0] : log.level === "WARN" ? [0.32, 0.22, 0.10, 1.0] : [0.14, 0.22, 0.28, 1.0]}>
                  <Text>{log.level}</Text>
                </TableCell>
                <Text>{log.message}</Text>
              </TableRow>
            ))}
          </Table>
        </Column>
      </Window>
    </DockSpace>
    </Theme>
  );
}
