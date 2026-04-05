export default function App(props: AppState) {
  return (
    <Theme preset="dark"
      backgroundColor={[0.1, 0.105, 0.11, 1.0]}
      surfaceColor={[0.15, 0.15, 0.151, 1.0]}
      borderColor={[0.25, 0.25, 0.26, 1.0]}
      accentColor={[0.28, 0.28, 0.29, 1.0]}
      textColor={[0.9, 0.9, 0.9, 1.0]}
      rounding={2}
    >
      <Window title="GPA Calculator" noResize noMove noCollapse>
        <Row style={{ gap: 8 }}>
          <Button title="+" onPress={props.onAddCourse} />
          <Button title="-" onPress={props.onRemoveCourse} />
          <Text>Courses: {props.courses.length}</Text>
        </Row>
        <Table columns={["Credit", "Grade"]}>
          {props.courses.map((course, i) => (
            <TableRow key={i}>
              <DragFloat label={"##k" + i} value={course.credit} speed={0.5} />
              <Combo label={"##g" + i} value={course.grade_index}
                     items={["A (4.0)", "A- (3.7)", "B+ (3.3)", "B (3.0)", "B- (2.7)", "C+ (2.3)", "C (2.0)", "C- (1.7)", "D+ (1.3)", "D (1.0)", "F (0.0)"]} />
            </TableRow>
          ))}
        </Table>
        <Separator />
        <Text>GPA: {props.gpa}</Text>
      </Window>
    </Theme>
  );
}
