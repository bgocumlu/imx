// reimgui.d.ts — Type definitions for ReImGui components

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

declare function useState<T>(initial: T): [T, (value: T) => void];

// Component prop interfaces
interface WindowProps { title: string; style?: Style; children?: any; }
interface ViewProps { style?: Style; children?: any; }
interface RowProps { gap?: number; style?: Style; children?: any; }
interface ColumnProps { gap?: number; style?: Style; children?: any; }
interface TextProps { style?: Style; children?: any; }
interface ButtonProps { title: string; onPress: () => void; disabled?: boolean; style?: Style; }
interface TextInputProps { value: string; onChange: (v: string) => void; label?: string; placeholder?: string; style?: Style; }
interface CheckboxProps { value: boolean; onChange: (v: boolean) => void; label?: string; style?: Style; }
interface SeparatorProps {}
interface PopupProps { id: string; style?: Style; children?: any; }
interface DockSpaceProps { style?: Style; children?: any; }
interface DockLayoutProps { children?: any; }
interface DockSplitProps { direction: "horizontal" | "vertical"; size: number; children?: any; }
interface DockPanelProps { children?: any; }
interface ThemeProps {
  preset: "dark" | "light" | "classic";
  accentColor?: [number, number, number, number];
  windowBg?: [number, number, number, number];
  textColor?: [number, number, number, number];
  rounding?: number;
  borderSize?: number;
  spacing?: number;
  children?: any;
}
interface MenuBarProps { children?: any; }
interface MenuProps { label: string; children?: any; }
interface MenuItemProps { label: string; onPress?: () => void; shortcut?: string; }
interface TableProps { columns: string[]; style?: Style; children?: any; }
interface TableRowProps { children?: any; }
interface TabBarProps { style?: Style; children?: any; }
interface TabItemProps { label: string; children?: any; }
interface TreeNodeProps { label: string; children?: any; }
interface CollapsingHeaderProps { label: string; children?: any; }
interface SliderFloatProps { label: string; value: number; onChange: (v: number) => void; min: number; max: number; style?: Style; }
interface SliderIntProps { label: string; value: number; onChange: (v: number) => void; min: number; max: number; style?: Style; }
interface DragFloatProps { label: string; value: number; onChange: (v: number) => void; speed?: number; style?: Style; }
interface DragIntProps { label: string; value: number; onChange: (v: number) => void; speed?: number; style?: Style; }
interface ComboProps { label: string; value: number; onChange: (v: number) => void; items: string[]; style?: Style; }
interface InputIntProps { label: string; value: number; onChange: (v: number) => void; style?: Style; }
interface InputFloatProps { label: string; value: number; onChange: (v: number) => void; style?: Style; }
interface ColorEditProps { label: string; value: number[]; onChange: (v: number[]) => void; style?: Style; }
interface ListBoxProps { label: string; value: number; onChange: (v: number) => void; items: string[]; style?: Style; }
interface ProgressBarProps { value: number; overlay?: string; style?: Style; }
interface TooltipProps { text: string; }

// Declare components as functions so TypeScript recognizes PascalCase JSX tags
declare function Window(props: WindowProps): any;
declare function View(props: ViewProps): any;
declare function Row(props: RowProps): any;
declare function Column(props: ColumnProps): any;
declare function Text(props: TextProps): any;
declare function Button(props: ButtonProps): any;
declare function TextInput(props: TextInputProps): any;
declare function Checkbox(props: CheckboxProps): any;
declare function Separator(props: SeparatorProps): any;
declare function Popup(props: PopupProps): any;
declare function DockSpace(props: DockSpaceProps): any;
declare function DockLayout(props: DockLayoutProps): any;
declare function DockSplit(props: DockSplitProps): any;
declare function DockPanel(props: DockPanelProps): any;
declare function Theme(props: ThemeProps): any;
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
declare function ColorEdit(props: ColorEditProps): any;
declare function ListBox(props: ListBoxProps): any;
declare function ProgressBar(props: ProgressBarProps): any;
declare function Tooltip(props: TooltipProps): any;

declare function resetLayout(): void;

// JSX runtime shim for react-jsx mode
declare module "reimgui/jsx-runtime" {
  export namespace JSX {
    type Element = any;
    interface IntrinsicElements { [tag: string]: any; }
    interface ElementChildrenAttribute { children: {}; }
  }
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: any): any;
}
