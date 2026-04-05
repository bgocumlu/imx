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
          <Table columns={["Time", "Level", "Message"]}>
            {props.logs.map((log, i) => (
              <TableRow>
                <Text>{log.timestamp}</Text>
                <Text>{log.level}</Text>
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
