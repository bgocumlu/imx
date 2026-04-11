import * as readline from 'node:readline';

export interface TemplateInfo {
    name: string;
    description: string;
    generate: (projectDir: string, projectName: string) => void;
}

export const TEMPLATES: TemplateInfo[] = [];

export function registerTemplate(info: TemplateInfo): void {
    TEMPLATES.push(info);
}

// --- Shared template strings ---

export const GITIGNORE = `build/
node_modules/
*.ini
.cache/
`;

export const APP_TSX = `export default function App(props: AppState) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Controls">
        <Column gap={8}>
          <Text>Count: {props.count}</Text>
          <Button title="Increment" onPress={props.onIncrement} />
          <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      {showAbout && <Window title="About">
        <Text>Built with IMX</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
      </Window>}
    </DockSpace>
  );
}
`;

export const IMX_DTS_PREFIX = `// imx.d.ts — Type definitions for IMX components

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

type MouseCursor =
  | "none"
  | "arrow"
  | "text"
  | "textInput"
  | "resizeAll"
  | "resizeNS"
  | "resizeEW"
  | "resizeNESW"
  | "resizeNWSE"
  | "hand"
  | "wait"
  | "progress"
  | "notAllowed";

interface ItemInteractionProps {
  onHover?: () => void;
  onActive?: () => void;
  onFocused?: () => void;
  onClicked?: () => void;
  onDoubleClicked?: () => void;
  tooltip?: string;
  autoFocus?: boolean;
  scrollToHere?: boolean;
  cursor?: MouseCursor;
}

`;

export const IMX_DTS_SUFFIX = `
interface WindowProps { title: string; open?: boolean; onClose?: () => void; noTitleBar?: boolean; noResize?: boolean; noMove?: boolean; noCollapse?: boolean; noDocking?: boolean; noScrollbar?: boolean; noBackground?: boolean; alwaysAutoResize?: boolean; noNavFocus?: boolean; noNav?: boolean; noDecoration?: boolean; noInputs?: boolean; noScrollWithMouse?: boolean; horizontalScrollbar?: boolean; alwaysVerticalScrollbar?: boolean; alwaysHorizontalScrollbar?: boolean; x?: number; y?: number; width?: number; height?: number; forcePosition?: boolean; forceSize?: boolean; minWidth?: number; minHeight?: number; maxWidth?: number; maxHeight?: number; bgAlpha?: number; noViewport?: boolean; viewportAlwaysOnTop?: boolean; style?: Style; children?: any; }
interface ViewProps { style?: Style; children?: any; }
interface IndentProps { width?: number; children?: any; }
interface TextWrapProps { width: number; children?: any; }
interface RowProps { gap?: number; style?: Style; children?: any; }
interface ColumnProps { gap?: number; style?: Style; children?: any; }
interface TextProps { color?: number[]; disabled?: boolean; wrapped?: boolean; style?: Style; children?: any; }
interface ButtonProps extends ItemInteractionProps { title: string; onPress: () => void; disabled?: boolean; style?: Style; }
interface SmallButtonProps extends ItemInteractionProps { label: string; onPress: () => void; }
interface ArrowButtonProps extends ItemInteractionProps { id: string; direction: "left" | "right" | "up" | "down"; onPress: () => void; }
interface InvisibleButtonProps extends ItemInteractionProps { id: string; width: number; height: number; onPress: () => void; }
interface ImageButtonProps extends ItemInteractionProps { id: string; src: string; width?: number; height?: number; onPress: () => void; }
interface TextInputProps extends ItemInteractionProps { value: string; onChange?: (v: string) => void; label?: string; placeholder?: string; width?: number; style?: Style; }
interface CheckboxProps extends ItemInteractionProps { value: boolean; onChange?: (v: boolean) => void; label?: string; style?: Style; }
interface SeparatorProps {}
interface PopupProps { id: string; style?: Style; children?: any; }
interface ContextMenuProps { id?: string; target?: "item" | "window"; mouseButton?: "left" | "right" | "middle"; children?: any; }
interface MultiSelectProps { singleSelect?: boolean; noSelectAll?: boolean; noRangeSelect?: boolean; noAutoSelect?: boolean; noAutoClear?: boolean; boxSelect?: boolean; boxSelect2d?: boolean; boxSelectNoScroll?: boolean; clearOnClickVoid?: boolean; selectionSize?: number; itemsCount?: number; onSelectionChange?: (io: any) => void; children?: any; }
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
interface MenuItemProps extends ItemInteractionProps { label: string; onPress?: () => void; shortcut?: string; }
interface ImGuiTableColumnSortSpecs { ColumnIndex: number; SortOrder: number; SortDirection: number; }
interface ImGuiTableSortSpecs { Specs: ImGuiTableColumnSortSpecs[]; SpecsCount: number; SpecsDirty: boolean; }
interface TableColumn { label: string; defaultHide?: boolean; preferSortAscending?: boolean; preferSortDescending?: boolean; noResize?: boolean; fixedWidth?: boolean; }
interface TableProps { columns: (string | TableColumn)[]; sortable?: boolean; onSort?: (specs: ImGuiTableSortSpecs) => void; hideable?: boolean; multiSortable?: boolean; noClip?: boolean; padOuterX?: boolean; scrollX?: boolean; scrollY?: boolean; noBorders?: boolean; noRowBg?: boolean; style?: Style; children?: any; }
interface TableRowProps { key?: number | string; bgColor?: [number, number, number, number]; children?: any; }
interface TableCellProps { columnIndex?: number; bgColor?: [number, number, number, number]; children?: any; }
interface TabBarProps { style?: Style; children?: any; }
interface TabItemProps { label: string; children?: any; }
interface TreeNodeProps extends ItemInteractionProps { label: string; defaultOpen?: boolean; forceOpen?: boolean; openOnArrow?: boolean; openOnDoubleClick?: boolean; leaf?: boolean; bullet?: boolean; noTreePushOnOpen?: boolean; children?: any; }
interface CollapsingHeaderProps extends ItemInteractionProps { label: string; defaultOpen?: boolean; forceOpen?: boolean; closable?: boolean; onClose?: () => void; children?: any; }
interface SliderFloatProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderIntProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; min: number; max: number; width?: number; style?: Style; }
interface DragFloatProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; speed?: number; width?: number; style?: Style; }
interface DragIntProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; speed?: number; width?: number; style?: Style; }
interface ComboProps extends ItemInteractionProps { label: string; value?: number; onChange?: (v: number) => void; items?: string[]; preview?: string; noArrowButton?: boolean; noPreview?: boolean; heightSmall?: boolean; heightLarge?: boolean; heightRegular?: boolean; width?: number; style?: Style; children?: any; }
interface InputIntProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; width?: number; style?: Style; }
interface InputFloatProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; width?: number; style?: Style; }
interface InputFloat2Props extends ItemInteractionProps { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; width?: number; style?: Style; }
interface InputFloat3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface InputFloat4Props extends ItemInteractionProps { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; width?: number; style?: Style; }
interface InputInt2Props extends ItemInteractionProps { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; width?: number; style?: Style; }
interface InputInt3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface InputInt4Props extends ItemInteractionProps { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; width?: number; style?: Style; }
interface DragFloat2Props extends ItemInteractionProps { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragFloat3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragFloat4Props extends ItemInteractionProps { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragInt2Props extends ItemInteractionProps { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragInt3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface DragInt4Props extends ItemInteractionProps { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; speed?: number; width?: number; style?: Style; }
interface SliderFloat2Props extends ItemInteractionProps { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderFloat3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderFloat4Props extends ItemInteractionProps { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderInt2Props extends ItemInteractionProps { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderInt3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface SliderInt4Props extends ItemInteractionProps { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; min: number; max: number; width?: number; style?: Style; }
interface VSliderFloatProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; width: number; height: number; min: number; max: number; style?: Style; }
interface VSliderIntProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; width: number; height: number; min: number; max: number; style?: Style; }
interface SliderAngleProps extends ItemInteractionProps { label: string; value: number; onChange?: (v: number) => void; min?: number; max?: number; width?: number; style?: Style; }
interface ColorEditProps extends ItemInteractionProps { label: string; value: number[]; onChange?: (v: number[]) => void; width?: number; style?: Style; }
interface ColorEdit3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface ListBoxProps extends ItemInteractionProps { label: string; value?: number; onChange?: (v: number) => void; items?: string[]; width?: number; height?: number; style?: Style; children?: any; }
interface ProgressBarProps { value: number; overlay?: string; style?: Style; }
interface SpacingProps {}
interface DummyProps { width: number; height: number; }
interface SameLineProps { offset?: number; spacing?: number; }
interface NewLineProps {}
interface CursorProps { x: number; y: number; }
interface TooltipProps { text: string; }
interface ShortcutProps { keys: string; onPress: () => void; }
interface BulletTextProps { style?: Style; children?: any; }
interface BulletProps { style?: Style; }
interface LabelTextProps { label: string; value: string; }
interface SelectableProps extends ItemInteractionProps { label: string; selected?: boolean; onSelect?: () => void; selectionIndex?: number; spanAllColumns?: boolean; allowDoubleClick?: boolean; dontClosePopups?: boolean; style?: Style; }
interface RadioProps extends ItemInteractionProps { label: string; value: number; index: number; onChange?: (v: number) => void; style?: Style; }
interface InputTextMultilineProps extends ItemInteractionProps { label: string; value: string; width?: number; style?: Style; }
interface ColorPickerProps extends ItemInteractionProps { label: string; value: number[]; style?: Style; }
interface ColorPicker3Props extends ItemInteractionProps { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; width?: number; style?: Style; }
interface PlotLinesProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface PlotHistogramProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface ModalProps { title: string; open?: boolean; onClose?: () => void; noTitleBar?: boolean; noResize?: boolean; noMove?: boolean; noScrollbar?: boolean; noCollapse?: boolean; alwaysAutoResize?: boolean; noBackground?: boolean; horizontalScrollbar?: boolean; style?: Style; children?: any; }
interface ImageProps { src: string; embed?: boolean; width?: number; height?: number; }
interface GroupProps { style?: Style; children?: any; }
interface IDProps { scope: string | number; children?: any; }
interface DragDropSourceProps { type: string; payload: number | string; children?: any; }
interface DragDropTargetProps { type: string; onDrop: (payload: any) => void; children?: any; }
interface CanvasProps { width: number; height: number; style?: Style; children?: any; }
interface DrawLineProps { p1: [number, number]; p2: [number, number]; color: [number, number, number, number]; thickness?: number; }
interface DrawRectProps { min: [number, number]; max: [number, number]; color: [number, number, number, number]; filled?: boolean; thickness?: number; rounding?: number; }
interface DrawCircleProps { center: [number, number]; radius: number; color: [number, number, number, number]; filled?: boolean; thickness?: number; }
interface DrawTextProps { pos: [number, number]; text: string; color: [number, number, number, number]; }
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
declare function ContextMenu(props: ContextMenuProps): any;
declare function MultiSelect(props: MultiSelectProps): any;
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
declare function TableCell(props: TableCellProps): any;
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
declare function Shortcut(props: ShortcutProps): any;
declare function BulletText(props: BulletTextProps): any;
declare function Bullet(props: BulletProps): any;
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
declare function StyleVar(props: StyleVarProps): any;
declare function DragDropSource(props: DragDropSourceProps): any;
declare function DragDropTarget(props: DragDropTargetProps): any;
interface DisabledProps { disabled?: boolean; children?: any; }
interface ChildProps { id: string; width?: number; height?: number; border?: boolean; style?: Style; children?: any; }
declare function Disabled(props: DisabledProps): any;
declare function Child(props: ChildProps): any;
interface FontProps { name: string; src?: string; size?: number; embed?: boolean; children?: any; }
declare function Font(props: FontProps): any;

declare function resetLayout(): void;

// --- Custom native widgets ---
// Declare your C++ registered widgets here for type checking:
//
// interface KnobProps {
//     value: number;
//     onChange: (value: number) => void;
//     min: number;
//     max: number;
//     width?: number;
//     height?: number;
// }
// declare function Knob(props: KnobProps): any;

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
`;

export function buildImxDts(appStateInterface: string): string {
    return IMX_DTS_PREFIX + appStateInterface + '\n' + IMX_DTS_SUFFIX;
}

export const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "imx",
    "strict": false,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.tsx", "src/imx.d.ts"]
}
`;

export function cmakeTemplate(projectName: string, repoUrl: string): string {
    return `cmake_minimum_required(VERSION 3.25)
project(${projectName} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
set(FETCHCONTENT_QUIET OFF)

FetchContent_Declare(
    imx
    GIT_REPOSITORY ${repoUrl}
    GIT_TAG main
    GIT_SHALLOW TRUE
    GIT_PROGRESS TRUE
)
message(STATUS "Fetching IMX (includes ImGui + GLFW)...")
FetchContent_MakeAvailable(imx)

include(ImxCompile)

imx_compile_tsx(GENERATED
    SOURCES src/App.tsx
    OUTPUT_DIR \${CMAKE_BINARY_DIR}/generated
)

add_executable(${projectName}
    src/main.cpp
    \${GENERATED}
)
set_target_properties(${projectName} PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
target_link_libraries(${projectName} PRIVATE imx::renderer)
target_include_directories(${projectName} PRIVATE \${CMAKE_BINARY_DIR}/generated \${CMAKE_CURRENT_SOURCE_DIR}/src)

# Copy public/ assets to output directory
add_custom_command(TARGET ${projectName} POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy_directory
        \${CMAKE_CURRENT_SOURCE_DIR}/public
        $<TARGET_FILE_DIR:${projectName}>
    COMMENT "Copying public/ assets"
)
`;
}

export async function promptProjectName(): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.on('close', () => { if (!answered) process.exit(0); });
    return new Promise((resolve) => {
        rl.question('Project name: ', (answer) => {
            answered = true;
            rl.close();
            const name = answer.trim();
            if (!name) {
                console.error('Error: project name cannot be empty.');
                process.exit(1);
            }
            resolve(name);
        });
    });
}

export async function promptTemplateName(): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.on('close', () => { if (!answered) process.exit(0); });
    return new Promise((resolve) => {
        console.log('Select a template:');
        console.log('');
        TEMPLATES.forEach((t, i) => {
            console.log(`  ${i + 1}. ${t.name} — ${t.description}`);
        });
        console.log('');
        rl.question('Template (number or name, comma-separated to combine): ', (answer) => {
            answered = true;
            rl.close();
            const input = answer.trim();

            // Check for comma-separated
            if (input.includes(',')) {
                const parts = input.split(',').map(s => s.trim());
                const resolved: string[] = [];
                for (const part of parts) {
                    const num = parseInt(part, 10);
                    if (!isNaN(num) && num >= 1 && num <= TEMPLATES.length) {
                        resolved.push(TEMPLATES[num - 1].name);
                    } else {
                        const found = TEMPLATES.find(t => t.name === part);
                        if (found) {
                            resolved.push(found.name);
                        } else {
                            console.error(`Error: unknown template "${part}".`);
                            process.exit(1);
                        }
                    }
                }
                resolve(resolved.join(','));
                return;
            }

            // Single value — existing logic
            const byNumber = parseInt(input, 10);
            if (!isNaN(byNumber) && byNumber >= 1 && byNumber <= TEMPLATES.length) {
                resolve(TEMPLATES[byNumber - 1].name);
                return;
            }
            const byName = TEMPLATES.find(t => t.name === input);
            if (byName) {
                resolve(byName.name);
                return;
            }
            console.error(`Error: unknown template "${input}".`);
            process.exit(1);
        });
    });
}
