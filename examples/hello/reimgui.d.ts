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

declare namespace JSX {
  interface IntrinsicElements {
    Window: { title: string; style?: Style; children?: any };
    View: { style?: Style; children?: any };
    Row: { gap?: number; style?: Style; children?: any };
    Column: { gap?: number; style?: Style; children?: any };
    Text: { style?: Style; children?: any };
    Button: { title: string; onPress: () => void; disabled?: boolean; style?: Style };
    TextInput: { value: string; onChange: (v: string) => void; label?: string; placeholder?: string; style?: Style };
    Checkbox: { value: boolean; onChange: (v: boolean) => void; label?: string; style?: Style };
    Separator: {};
    Popup: { id: string; style?: Style; children?: any };
    DockSpace: { style?: Style; children?: any };
    MenuBar: { children?: any };
    Menu: { label: string; children?: any };
    MenuItem: { label: string; onPress?: () => void; shortcut?: string };
    Table: { columns: string[]; style?: Style; children?: any };
    TableRow: { children?: any };
    TabBar: { style?: Style; children?: any };
    TabItem: { label: string; children?: any };
    TreeNode: { label: string; children?: any };
    CollapsingHeader: { label: string; children?: any };
    SliderFloat: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; style?: Style };
    SliderInt: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; style?: Style };
    DragFloat: { label: string; value: number; onChange: (v: number) => void; speed?: number; style?: Style };
    DragInt: { label: string; value: number; onChange: (v: number) => void; speed?: number; style?: Style };
    Combo: { label: string; value: number; onChange: (v: number) => void; items: string[]; style?: Style };
    InputInt: { label: string; value: number; onChange: (v: number) => void; style?: Style };
    InputFloat: { label: string; value: number; onChange: (v: number) => void; style?: Style };
    ColorEdit: { label: string; value: number[]; onChange: (v: number[]) => void; style?: Style };
    ListBox: { label: string; value: number; onChange: (v: number) => void; items: string[]; style?: Style };
    ProgressBar: { value: number; overlay?: string; style?: Style };
    Tooltip: { text: string };
  }

  interface Element {}
  interface ElementChildrenAttribute { children: {}; }
}
