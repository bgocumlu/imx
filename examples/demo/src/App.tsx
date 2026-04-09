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
  const [showLayout, setShowLayout] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showTrees, setShowTrees] = useState(false);
  const [showMenus, setShowMenus] = useState(false);
  const [showDragDrop, setShowDragDrop] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showTheming, setShowTheming] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Font name="inter-ui" src="Inter-Regular.ttf" size={16}>
    <DockSpace>
      <Window title="IMX Demo">
        <Column gap={4}>
          <Text>Component Demos</Text>
          <Text disabled>Click a button to open a demo window.</Text>
          <Separator />
          <Button title="Layout" onPress={() => setShowLayout(!showLayout)} />
          <Button title="Text" onPress={() => setShowText(!showText)} />
          <Button title="Inputs" onPress={() => setShowInputs(!showInputs)} />
          <Button title="Sliders & Drags" onPress={() => setShowSliders(!showSliders)} />
          <Button title="Buttons" onPress={() => setShowButtons(!showButtons)} />
          <Button title="Color" onPress={() => setShowColor(!showColor)} />
          <Button title="Tables" onPress={() => setShowTables(!showTables)} />
          <Button title="Trees" onPress={() => setShowTrees(!showTrees)} />
          <Button title="Menus & Popups" onPress={() => setShowMenus(!showMenus)} />
          <Button title="Drag & Drop" onPress={() => setShowDragDrop(!showDragDrop)} />
          <Button title="Canvas" onPress={() => setShowCanvas(!showCanvas)} />
          <Button title="Theming" onPress={() => setShowTheming(!showTheming)} />
          <Button title="Images" onPress={() => setShowImages(!showImages)} />
          <Button title="Advanced" onPress={() => setShowAdvanced(!showAdvanced)} />
        </Column>
      </Window>
      {showLayout && <LayoutDemo onClose={() => setShowLayout(false)} />}
      {showText && <TextDemo onClose={() => setShowText(false)} />}
      {showInputs && <InputsDemo onClose={() => setShowInputs(false)} />}
      {showSliders && <SlidersDemo onClose={() => setShowSliders(false)} />}
      {showButtons && <ButtonsDemo onClose={() => setShowButtons(false)} />}
      {showColor && <ColorDemo onClose={() => setShowColor(false)} />}
      {showTables && <TablesDemo onClose={() => setShowTables(false)} />}
      {showTrees && <TreesDemo onClose={() => setShowTrees(false)} />}
      {showMenus && <MenusDemo onClose={() => setShowMenus(false)} />}
      {showDragDrop && <DragDropDemo onClose={() => setShowDragDrop(false)} />}
      {showCanvas && <CanvasDemo onClose={() => setShowCanvas(false)} />}
      {showTheming && <ThemingDemo onClose={() => setShowTheming(false)} />}
      {showImages && <ImagesDemo onClose={() => setShowImages(false)} />}
      {showAdvanced && <AdvancedDemo onClose={() => setShowAdvanced(false)} />}
    </DockSpace>
    </Font>
  );
}
