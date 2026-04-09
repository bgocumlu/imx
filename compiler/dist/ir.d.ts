export type IRType = 'int' | 'float' | 'bool' | 'string' | 'color';
export interface SourceLoc {
    file: string;
    line: number;
}
export interface IRExpr {
    code: string;
    type: IRType;
}
export interface IRComponent {
    name: string;
    stateSlots: IRStateSlot[];
    bufferCount: number;
    params: IRPropParam[];
    namedPropsType?: string;
    body: IRNode[];
}
export interface IRStateSlot {
    name: string;
    setter: string;
    type: IRType;
    initialValue: string;
    index: number;
}
export interface IRPropParam {
    name: string;
    type: IRType | 'callback';
}
export type IRNode = IRBeginContainer | IREndContainer | IRText | IRButton | IRTextInput | IRCheckbox | IRSeparator | IRBeginPopup | IREndPopup | IROpenPopup | IRConditional | IRListMap | IRCustomComponent | IRMenuItem | IRSliderFloat | IRSliderInt | IRDragFloat | IRDragInt | IRCombo | IRInputInt | IRInputFloat | IRColorEdit | IRListBox | IRProgressBar | IRTooltip | IRDockLayout | IRNativeWidget | IRBulletText | IRLabelText | IRSelectable | IRRadio | IRInputTextMultiline | IRColorPicker | IRPlotLines | IRPlotHistogram | IRImage | IRDrawLine | IRDrawRect | IRDrawCircle | IRDrawText | IRInputFloatN | IRInputIntN | IRDragFloatN | IRDragIntN | IRSliderFloatN | IRSliderIntN | IRSmallButton | IRArrowButton | IRInvisibleButton | IRImageButton;
export interface IRBeginContainer {
    kind: 'begin_container';
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu' | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader' | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal' | 'Group' | 'ID' | 'StyleColor' | 'StyleVar' | 'DragDropSource' | 'DragDropTarget' | 'Canvas' | 'Disabled' | 'Child' | 'Font';
    props: Record<string, string>;
    style?: string;
    loc?: SourceLoc;
}
export interface IREndContainer {
    kind: 'end_container';
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu' | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader' | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal' | 'Group' | 'ID' | 'StyleColor' | 'StyleVar' | 'DragDropSource' | 'DragDropTarget' | 'Canvas' | 'Disabled' | 'Child' | 'Font';
}
export interface IRText {
    kind: 'text';
    format: string;
    args: string[];
    loc?: SourceLoc;
}
export interface IRButton {
    kind: 'button';
    title: string;
    action: string[];
    disabled?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRTextInput {
    kind: 'text_input';
    label: string;
    bufferIndex: number;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRCheckbox {
    kind: 'checkbox';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRSeparator {
    kind: 'separator';
    loc?: SourceLoc;
}
export interface IRBeginPopup {
    kind: 'begin_popup';
    id: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IREndPopup {
    kind: 'end_popup';
}
export interface IROpenPopup {
    kind: 'open_popup';
    id: string;
    loc?: SourceLoc;
}
export interface IRConditional {
    kind: 'conditional';
    condition: string;
    body: IRNode[];
    elseBody?: IRNode[];
    loc?: SourceLoc;
}
export interface IRListMap {
    kind: 'list_map';
    array: string;
    itemVar: string;
    indexVar: string;
    internalIndexVar: string;
    key: string;
    componentName: string;
    stateCount: number;
    bufferCount: number;
    body: IRNode[];
    loc?: SourceLoc;
}
export interface IRCustomComponent {
    kind: 'custom_component';
    name: string;
    props: Record<string, string>;
    key?: string;
    stateCount: number;
    bufferCount: number;
    loc?: SourceLoc;
}
export interface IRMenuItem {
    kind: 'menu_item';
    label: string;
    shortcut?: string;
    action: string[];
    loc?: SourceLoc;
}
export interface IRSliderFloat {
    kind: 'slider_float';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    min: string;
    max: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRSliderInt {
    kind: 'slider_int';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    min: string;
    max: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRDragFloat {
    kind: 'drag_float';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    speed: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRDragInt {
    kind: 'drag_int';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    speed: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRCombo {
    kind: 'combo';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    items: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRInputInt {
    kind: 'input_int';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRInputFloat {
    kind: 'input_float';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRColorEdit {
    kind: 'color_edit';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRListBox {
    kind: 'list_box';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    items: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRProgressBar {
    kind: 'progress_bar';
    value: string;
    overlay?: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRTooltip {
    kind: 'tooltip';
    text: string;
    loc?: SourceLoc;
}
export interface IRNativeWidget {
    kind: 'native_widget';
    name: string;
    props: Record<string, string>;
    callbackProps: Record<string, string>;
    key?: string;
    loc?: SourceLoc;
}
export interface IRBulletText {
    kind: 'bullet_text';
    format: string;
    args: string[];
    loc?: SourceLoc;
}
export interface IRLabelText {
    kind: 'label_text';
    label: string;
    value: string;
    loc?: SourceLoc;
}
export interface IRSelectable {
    kind: 'selectable';
    label: string;
    selected: string;
    action: string[];
    style?: string;
    loc?: SourceLoc;
}
export interface IRRadio {
    kind: 'radio';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    index: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRInputTextMultiline {
    kind: 'input_text_multiline';
    label: string;
    bufferIndex: number;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRColorPicker {
    kind: 'color_picker';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    style?: string;
    loc?: SourceLoc;
}
export interface IRPlotLines {
    kind: 'plot_lines';
    label: string;
    values: string;
    overlay?: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRPlotHistogram {
    kind: 'plot_histogram';
    label: string;
    values: string;
    overlay?: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRImage {
    kind: 'image';
    src: string;
    embed: boolean;
    embedKey?: string;
    width?: string;
    height?: string;
    loc?: SourceLoc;
}
export interface IRDrawLine {
    kind: 'draw_line';
    p1: string;
    p2: string;
    color: string;
    thickness: string;
    loc?: SourceLoc;
}
export interface IRDrawRect {
    kind: 'draw_rect';
    min: string;
    max: string;
    color: string;
    filled: string;
    thickness: string;
    rounding: string;
    loc?: SourceLoc;
}
export interface IRDrawCircle {
    kind: 'draw_circle';
    center: string;
    radius: string;
    color: string;
    filled: string;
    thickness: string;
    loc?: SourceLoc;
}
export interface IRDrawText {
    kind: 'draw_text';
    pos: string;
    text: string;
    color: string;
    loc?: SourceLoc;
}
export interface IRInputFloatN {
    kind: 'input_float_n';
    label: string;
    count: number;
    valueExpr: string;
    directBind?: boolean;
    onChangeExpr?: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRInputIntN {
    kind: 'input_int_n';
    label: string;
    count: number;
    valueExpr: string;
    directBind?: boolean;
    onChangeExpr?: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRDragFloatN {
    kind: 'drag_float_n';
    label: string;
    count: number;
    valueExpr: string;
    directBind?: boolean;
    onChangeExpr?: string;
    speed: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRDragIntN {
    kind: 'drag_int_n';
    label: string;
    count: number;
    valueExpr: string;
    directBind?: boolean;
    onChangeExpr?: string;
    speed: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRSliderFloatN {
    kind: 'slider_float_n';
    label: string;
    count: number;
    valueExpr: string;
    directBind?: boolean;
    onChangeExpr?: string;
    min: string;
    max: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRSliderIntN {
    kind: 'slider_int_n';
    label: string;
    count: number;
    valueExpr: string;
    directBind?: boolean;
    onChangeExpr?: string;
    min: string;
    max: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IRSmallButton {
    kind: 'small_button';
    label: string;
    action: string[];
    loc?: SourceLoc;
}
export interface IRArrowButton {
    kind: 'arrow_button';
    id: string;
    direction: string;
    action: string[];
    loc?: SourceLoc;
}
export interface IRInvisibleButton {
    kind: 'invisible_button';
    id: string;
    width: string;
    height: string;
    action: string[];
    loc?: SourceLoc;
}
export interface IRImageButton {
    kind: 'image_button';
    id: string;
    src: string;
    width?: string;
    height?: string;
    action: string[];
    loc?: SourceLoc;
}
export interface IRDockLayout {
    kind: 'dock_layout';
    children: (IRDockSplit | IRDockPanel)[];
    loc?: SourceLoc;
}
export interface IRDockSplit {
    kind: 'dock_split';
    direction: string;
    size: string;
    children: (IRDockSplit | IRDockPanel)[];
}
export interface IRDockPanel {
    kind: 'dock_panel';
    windows: string[];
}
