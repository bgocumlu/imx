export function SettingGroup(props: { title: string, description: string }) {
  return (
    <CollapsingHeader label={props.title}>
      <Text style={{ textColor: [0.6, 0.6, 0.6, 1.0] }}>{props.description}</Text>
    </CollapsingHeader>
  );
}
