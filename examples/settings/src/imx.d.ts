// imx.d.ts — Type definitions for IMX components

interface Style {
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  backgroundColor?: [number, number, number, number];
  textColor?: [number, number, number, number];
  fontSize?: number;
}

declare function useState(initial: [number, number]): [[number, number], (value: [number, number]) => void];
declare function useState(initial: [number, number, number]): [[number, number, number], (value: [number, number, number]) => void];
declare function useState(initial: [number, number, number, number]): [[number, number, number, number], (value: [number, number, number, number]) => void];
declare function useState<T>(initial: T): [T, (value: T) => void];

interface SettingsState {
    speed: number;
    count: number;
    posX: number;
    dragVal: number;
    level: number;
    weight: number;
    mode: number;
    listChoice: number;
    size: number;
    color: number[];
    pickerColor: number[];
    enabled: boolean;
    darkMode: boolean;
    onReset: () => void;
}

interface WindowProps { title: string; open?: boolean; onClose?: () => void; noTitleBar?: boolean; noResize?: boolean; noMove?: boolean; noCollapse?: boolean; noDocking?: boolean; noScrollbar?: boolean; style?: Style; children?: any; }
interface ViewProps { style?: Style; children?: any; }
interface IndentProps { width?: number; children?: any; }
interface TextWrapProps { width: number; children?: any; }
interface RowProps { gap?: number; style?: Style; children?: any; }
interface ColumnProps { gap?: number; style?: Style; children?: any; }
interface TextProps { style?: Style; children?: any; }
interface ButtonProps { title: string; onPress: () => void; disabled?: boolean; style?: Style; }
interface SmallButtonProps { label: string; onPress: () => void; }
interface ArrowButtonProps { id: string; direction: "left" | "right" | "up" | "down"; onPress: () => void; }
interface InvisibleButtonProps { id: string; width: number; height: number; onPress: () => void; }
interface ImageButtonProps { id: string; src: string; width?: number; height?: number; onPress: () => void; }
interface TextInputProps { value: string; onChange?: (v: string) => void; label?: string; placeholder?: string; width?: number; style?: Style; }
interface CheckboxProps { value: boolean; onChange?: (v: boolean) => void; label?: string; style?: Style; }
interface SeparatorProps {}
interface PopupProps { id: string; style?: Style; children?: any; }
interface DockSpaceProps { style?: Style; children?: any; }
interface DockLayoutProps { children?: any; }
interface DockSplitProps { direction: "horizontal" | "vertical"; size: number; children?: any; }
interface DockPanelProps { children?: any; }
interface ThemeProps {
  preset: string;
  accentColor?: [number, number, number, number];
  backgroundColor?: [number, number, number, number];
  textColor?: [number, number, number, number];
  borderColor?: [number, number, number, number];
  surfaceColor?: [number, number, number, number];
  rounding?: number;
  borderSize?: number;
  spacing?: number;
  children?: any;
}
interface MainMenuBarProps { children?: any; }
interface MenuBarProps { children?: any; }
interface MenuProps { label: string; children?: any; }
interface MenuItemProps { label: string; onPress?: () => void; shortcut?: string; }
interface TableProps { columns: string[]; scrollY?: boolean; noBorders?: boolean; noRowBg?: boolean; style?: Style; children?: any; }
interface TableRowProps { key?: number | string; children?: any; }
interface TabBarProps { style?: Style; children?: any; }
interface TabItemProps { label: string; children?: any; }
interface TreeNodeProps { label: string; children?: any; }
interface CollapsingHeaderProps { label: string; children?: any; }
interface SliderFloatProps { label: string; value: number; onChange?: (v: number) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderIntProps { label: string; value: number; onChange?: (v: number) => void; min: number; max: number; width?: number; style?: Style; }
interface DragFloatProps { label: string; value: number; onChange?: (v: number) => void; speed?: number; width?: number; style?: Style; }
interface DragIntProps { label: string; value: number; onChange?: (v: number) => void; speed?: number; width?: number; style?: Style; }
interface ComboProps { label: string; value: number; onChange?: (v: number) => void; items: string[]; width?: number; style?: Style; }
interface InputIntProps { label: string; value: number; onChange?: (v: number) => void; width?: number; style?: Style; }
interface InputFloatProps { label: string; value: number; onChange?: (v: number) => void; width?: number; style?: Style; }
interface InputFloat2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; width?: number; style?: Style; }
interface InputFloat3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface InputFloat4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; width?: number; style?: Style; }
interface InputInt2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; width?: number; style?: Style; }
interface InputInt3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface InputInt4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; width?: number; style?: Style; }
interface DragFloat2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragFloat3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragFloat4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragInt2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragInt3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragInt4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface SliderFloat2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderFloat3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderFloat4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderInt2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderInt3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderInt4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface VSliderFloatProps { label: string; value: number; onChange?: (v: number) => void; width: number; height: number; min: number; max: number; style?: Style; }
interface VSliderIntProps { label: string; value: number; onChange?: (v: number) => void; width: number; height: number; min: number; max: number; style?: Style; }
interface SliderAngleProps { label: string; value: number; onChange?: (v: number) => void; min?: number; max?: number; width?: number; style?: Style; }
interface ColorEditProps { label: string; value: number[]; onChange?: (v: number[]) => void; width?: number; style?: Style; }
interface ColorEdit3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface ListBoxProps { label: string; value: number; onChange?: (v: number) => void; items: string[]; width?: number; style?: Style; }
interface ProgressBarProps { value: number; overlay?: string; style?: Style; }
interface SpacingProps {}
interface DummyProps { width: number; height: number; }
interface SameLineProps { offset?: number; spacing?: number; }
interface NewLineProps {}
interface CursorProps { x: number; y: number; }
interface TooltipProps { text: string; }
interface BulletTextProps { style?: Style; children?: any; }
interface LabelTextProps { label: string; value: string; }
interface SelectableProps { label: string; selected?: boolean; onSelect?: () => void; style?: Style; }
interface RadioProps { label: string; value: number; index: number; onChange?: (v: number) => void; style?: Style; }
interface InputTextMultilineProps { label: string; value: string; width?: number; style?: Style; }
interface ColorPickerProps { label: string; value: number[]; style?: Style; }
interface ColorPicker3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface PlotLinesProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface PlotHistogramProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface ModalProps { title: string; open?: boolean; onClose?: () => void; style?: Style; children?: any; }
interface ImageProps { src: string; embed?: boolean; width?: number; height?: number; }
interface GroupProps { style?: Style; children?: any; }
interface IDProps { scope: string | number; children?: any; }
interface DragDropSourceProps { type: string; payload: number | string; children?: any; }
interface DragDropTargetProps { type: string; onDrop: (payload: any) => void; children?: any; }
interface StyleColorProps {
  text?: [number, number, number, number];
  textDisabled?: [number, number, number, number];
  windowBg?: [number, number, number, number];
  frameBg?: [number, number, number, number];
  frameBgHovered?: [number, number, number, number];
  frameBgActive?: [number, number, number, number];
  titleBg?: [number, number, number, number];
  titleBgActive?: [number, number, number, number];
  button?: [number, number, number, number];
  buttonHovered?: [number, number, number, number];
  buttonActive?: [number, number, number, number];
  header?: [number, number, number, number];
  headerHovered?: [number, number, number, number];
  headerActive?: [number, number, number, number];
  separator?: [number, number, number, number];
  checkMark?: [number, number, number, number];
  sliderGrab?: [number, number, number, number];
  border?: [number, number, number, number];
  popupBg?: [number, number, number, number];
  tab?: [number, number, number, number];
  children?: any;
}
interface StyleVarProps {
  alpha?: number;
  windowPadding?: [number, number];
  windowRounding?: number;
  framePadding?: [number, number];
  frameRounding?: number;
  frameBorderSize?: number;
  itemSpacing?: [number, number];
  itemInnerSpacing?: [number, number];
  indentSpacing?: number;
  cellPadding?: [number, number];
  tabRounding?: number;
  children?: any;
}

// Declare components as functions so TypeScript recognizes PascalCase JSX tags
declare function Window(props: WindowProps): any;
declare function View(props: ViewProps): any;
declare function Indent(props: IndentProps): any;
declare function TextWrap(props: TextWrapProps): any;
declare function Row(props: RowProps): any;
declare function Column(props: ColumnProps): any;
declare function Text(props: TextProps): any;
declare function Button(props: ButtonProps): any;
declare function SmallButton(props: SmallButtonProps): any;
declare function ArrowButton(props: ArrowButtonProps): any;
declare function InvisibleButton(props: InvisibleButtonProps): any;
declare function ImageButton(props: ImageButtonProps): any;
declare function TextInput(props: TextInputProps): any;
declare function Checkbox(props: CheckboxProps): any;
declare function Separator(props: SeparatorProps): any;
declare function Popup(props: PopupProps): any;
declare function DockSpace(props: DockSpaceProps): any;
declare function DockLayout(props: DockLayoutProps): any;
declare function DockSplit(props: DockSplitProps): any;
declare function DockPanel(props: DockPanelProps): any;
declare function Theme(props: ThemeProps): any;
declare function MainMenuBar(props: MainMenuBarProps): any;
declare function MenuBar(props: MenuBarProps): any;
declare function Menu(props: MenuProps): any;
declare function MenuItem(props: MenuItemProps): any;
declare function Table(props: TableProps): any;
declare function TableRow(props: TableRowProps): any;
declare function TabBar(props: TabBarProps): any;
declare function TabItem(props: TabItemProps): any;
declare function TreeNode(props: TreeNodeProps): any;
declare function CollapsingHeader(props: CollapsingHeaderProps): any;
declare function SliderFloat(props: SliderFloatProps): any;
declare function SliderInt(props: SliderIntProps): any;
declare function DragFloat(props: DragFloatProps): any;
declare function DragInt(props: DragIntProps): any;
declare function Combo(props: ComboProps): any;
declare function InputInt(props: InputIntProps): any;
declare function InputFloat(props: InputFloatProps): any;
declare function InputFloat2(props: InputFloat2Props): any;
declare function InputFloat3(props: InputFloat3Props): any;
declare function InputFloat4(props: InputFloat4Props): any;
declare function InputInt2(props: InputInt2Props): any;
declare function InputInt3(props: InputInt3Props): any;
declare function InputInt4(props: InputInt4Props): any;
declare function DragFloat2(props: DragFloat2Props): any;
declare function DragFloat3(props: DragFloat3Props): any;
declare function DragFloat4(props: DragFloat4Props): any;
declare function DragInt2(props: DragInt2Props): any;
declare function DragInt3(props: DragInt3Props): any;
declare function DragInt4(props: DragInt4Props): any;
declare function SliderFloat2(props: SliderFloat2Props): any;
declare function SliderFloat3(props: SliderFloat3Props): any;
declare function SliderFloat4(props: SliderFloat4Props): any;
declare function SliderInt2(props: SliderInt2Props): any;
declare function SliderInt3(props: SliderInt3Props): any;
declare function SliderInt4(props: SliderInt4Props): any;
declare function VSliderFloat(props: VSliderFloatProps): any;
declare function VSliderInt(props: VSliderIntProps): any;
declare function SliderAngle(props: SliderAngleProps): any;
declare function ColorEdit(props: ColorEditProps): any;
declare function ColorEdit3(props: ColorEdit3Props): any;
declare function ListBox(props: ListBoxProps): any;
declare function ProgressBar(props: ProgressBarProps): any;
declare function Spacing(props: SpacingProps): any;
declare function Dummy(props: DummyProps): any;
declare function SameLine(props: SameLineProps): any;
declare function NewLine(props: NewLineProps): any;
declare function Cursor(props: CursorProps): any;
declare function Tooltip(props: TooltipProps): any;
declare function BulletText(props: BulletTextProps): any;
declare function LabelText(props: LabelTextProps): any;
declare function Selectable(props: SelectableProps): any;
declare function Radio(props: RadioProps): any;
declare function InputTextMultiline(props: InputTextMultilineProps): any;
declare function ColorPicker(props: ColorPickerProps): any;
declare function ColorPicker3(props: ColorPicker3Props): any;
declare function PlotLines(props: PlotLinesProps): any;
declare function PlotHistogram(props: PlotHistogramProps): any;
declare function Modal(props: ModalProps): any;
declare function Image(props: ImageProps): any;
declare function Group(props: GroupProps): any;
declare function ID(props: IDProps): any;
declare function StyleColor(props: StyleColorProps): any;
declare function StyleVar(props: StyleVarProps): any;
declare function DragDropSource(props: DragDropSourceProps): any;
declare function DragDropTarget(props: DragDropTargetProps): any;

interface CanvasProps { width: number; height: number; style?: Style; children?: any; }
interface DrawLineProps { p1: [number, number]; p2: [number, number]; color: [number, number, number, number]; thickness?: number; }
interface DrawRectProps { min: [number, number]; max: [number, number]; color: [number, number, number, number]; filled?: boolean; thickness?: number; rounding?: number; }
interface DrawCircleProps { center: [number, number]; radius: number; color: [number, number, number, number]; filled?: boolean; thickness?: number; }
interface DrawTextProps { pos: [number, number]; text: string; color: [number, number, number, number]; }

declare function Canvas(props: CanvasProps): any;
declare function DrawLine(props: DrawLineProps): any;
declare function DrawRect(props: DrawRectProps): any;
declare function DrawCircle(props: DrawCircleProps): any;
declare function DrawText(props: DrawTextProps): any;

interface DrawBezierCubicProps { p1: [number, number]; p2: [number, number]; p3: [number, number]; p4: [number, number]; color: [number, number, number, number]; thickness?: number; segments?: number; }
interface DrawBezierQuadraticProps { p1: [number, number]; p2: [number, number]; p3: [number, number]; color: [number, number, number, number]; thickness?: number; segments?: number; }
interface DrawPolylineProps { points: [number, number][]; color: [number, number, number, number]; thickness?: number; closed?: boolean; }
interface DrawConvexPolyFilledProps { points: [number, number][]; color: [number, number, number, number]; }
interface DrawNgonProps { center: [number, number]; radius: number; color: [number, number, number, number]; numSegments: number; thickness?: number; }
interface DrawNgonFilledProps { center: [number, number]; radius: number; color: [number, number, number, number]; numSegments: number; }
interface DrawTriangleProps { p1: [number, number]; p2: [number, number]; p3: [number, number]; color: [number, number, number, number]; filled?: boolean; thickness?: number; }
declare function DrawBezierCubic(props: DrawBezierCubicProps): any;
declare function DrawBezierQuadratic(props: DrawBezierQuadraticProps): any;
declare function DrawPolyline(props: DrawPolylineProps): any;
declare function DrawConvexPolyFilled(props: DrawConvexPolyFilledProps): any;
declare function DrawNgon(props: DrawNgonProps): any;
declare function DrawNgonFilled(props: DrawNgonFilledProps): any;
declare function DrawTriangle(props: DrawTriangleProps): any;
interface DisabledProps { disabled?: boolean; children?: any; }
interface ChildProps { id: string; width?: number; height?: number; border?: boolean; style?: Style; children?: any; }
declare function Disabled(props: DisabledProps): any;
declare function Child(props: ChildProps): any;
interface FontProps { name: string; children?: any; }
declare function Font(props: FontProps): any;

interface ToggleSwitchProps { value: boolean; onToggle: (v: boolean) => void; }
declare function ToggleSwitch(props: ToggleSwitchProps): any;

declare function resetLayout(): void;

// JSX runtime shim for react-jsx mode
declare module "imx/jsx-runtime" {
  export namespace JSX {
    type Element = any;
    interface IntrinsicElements { [tag: string]: any; }
    interface ElementChildrenAttribute { children: {}; }
  }
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: any): any;
}

