import { LayoutDemo } from './LayoutDemo';
import { TextDemo } from './TextDemo';
import { InputsDemo } from './InputsDemo';
import { SlidersDemo } from './SlidersDemo';
import { ButtonsDemo } from './ButtonsDemo';
import { ColorDemo } from './ColorDemo';
import { TablesDemo } from './TablesDemo';
import { TreesDemo } from './TreesDemo';
import { MenusDemo } from './MenusDemo';
import { DragDropDemo } from './DragDropDemo';
import { CanvasDemo } from './CanvasDemo';
import { ThemingDemo } from './ThemingDemo';
import { ImagesDemo } from './ImagesDemo';
import { AdvancedDemo } from './AdvancedDemo';

export default function App(props: DemoState) {
  return (
    <Font name="inter-ui" src="Inter-Regular.ttf" size={16} embed>
    <DockSpace>
      <Window title="IMX Demo">
        <Column gap={4}>
          <Text>IMX Component Reference</Text>
          <Text disabled>All components in one scrollable window.</Text>
          <Separator />
          <LayoutDemo />
          <TextDemo />
          <InputsDemo />
          <SlidersDemo />
          <ButtonsDemo />
          <ColorDemo />
          <TablesDemo data={props.table} />
          <TreesDemo />
          <MenusDemo />
          <DragDropDemo />
          <CanvasDemo />
          <ThemingDemo />
          <ImagesDemo />
          <AdvancedDemo />
        </Column>
      </Window>
    </DockSpace>
    </Font>
  );
}
