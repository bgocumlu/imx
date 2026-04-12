export type IRType = 'int' | 'float' | 'bool' | 'string' | 'color' | 'int_array';
export interface SourceLoc {
    file: string;
    line: number;
}
export interface IRExpr {
    code: string;
    type: IRType;
}
export interface IRItemInteraction {
    autoFocus?: string;
    tooltip?: string;
    scrollToHere?: string;
    cursor?: string;
    onHover?: string[];
    onActive?: string[];
    onFocused?: string[];
    onClicked?: string[];
    onDoubleClicked?: string[];
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
    type: string | 'callback';
}
export type IRNode = IRBeginContainer | IREndContainer | IRText | IRButton | IRTextInput | IRCheckbox | IRSeparator | IRSpacing | IRDummy | IRSameLine | IRNewLine | IRCursor | IRBeginPopup | IREndPopup | IROpenPopup | IRConditional | IRListMap | IRCustomComponent | IRMenuItem | IRBeginTable | IREndTable | IRBeginTableRow | IREndTableRow | IRBeginTableCell | IREndTableCell | IRBeginTreeNode | IREndTreeNode | IRBeginCollapsingHeader | IREndCollapsingHeader | IRSliderFloat | IRSliderInt | IRDragFloat | IRDragInt | IRCombo | IRInputInt | IRInputFloat | IRColorEdit | IRListBox | IRProgressBar | IRTooltip | IRShortcut | IRDockLayout | IRNativeWidget | IRBulletText | IRLabelText | IRSelectable | IRRadio | IRInputTextMultiline | IRColorPicker | IRColorEdit3 | IRColorPicker3 | IRPlotLines | IRPlotHistogram | IRImage | IRDrawLine | IRDrawRect | IRDrawCircle | IRDrawText | IRDrawBezierCubic | IRDrawBezierQuadratic | IRDrawPolyline | IRDrawConvexPolyFilled | IRDrawNgon | IRDrawNgonFilled | IRDrawTriangle | IRInputFloatN | IRInputIntN | IRDragFloatN | IRDragIntN | IRSliderFloatN | IRSliderIntN | IRSmallButton | IRArrowButton | IRInvisibleButton | IRImageButton | IRVSliderFloat | IRVSliderInt | IRSliderAngle | IRBeginCombo | IREndCombo | IRBullet | IRBeginListBox | IREndListBox;
export interface IRBeginContainer {
    kind: 'begin_container';
    tag: 'Window' | 'View' | 'Indent' | 'TextWrap' | 'Row' | 'Column' | 'DockSpace' | 'MainMenuBar' | 'MenuBar' | 'Menu' | 'TabBar' | 'TabItem' | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal' | 'Group' | 'ID' | 'StyleColor' | 'StyleVar' | 'DragDropSource' | 'DragDropTarget' | 'Canvas' | 'Disabled' | 'Child' | 'Font' | 'ContextMenu' | 'MultiSelect';
    props: Record<string, string>;
    style?: string;
    loc?: SourceLoc;
}
export interface IREndContainer {
    kind: 'end_container';
    tag: 'Window' | 'View' | 'Indent' | 'TextWrap' | 'Row' | 'Column' | 'DockSpace' | 'MainMenuBar' | 'MenuBar' | 'Menu' | 'TabBar' | 'TabItem' | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal' | 'Group' | 'ID' | 'StyleColor' | 'StyleVar' | 'DragDropSource' | 'DragDropTarget' | 'Canvas' | 'Disabled' | 'Child' | 'Font' | 'ContextMenu' | 'MultiSelect';
}
export interface IRTableColumn {
    label: string;
    defaultHide?: string;
    preferSortAscending?: string;
    preferSortDescending?: string;
    noResize?: string;
    fixedWidth?: string;
}
export interface IRBeginTable {
    kind: 'begin_table';
    columns: IRTableColumn[];
    sortable?: string;
    hideable?: string;
    multiSortable?: string;
    noClip?: string;
    padOuterX?: string;
    scrollX?: string;
    scrollY?: string;
    noBorders?: string;
    noRowBg?: string;
    onSortBody?: string;
    onSortParam?: string;
    style?: string;
    loc?: SourceLoc;
}
export interface IREndTable {
    kind: 'end_table';
}
export interface IRBeginTableRow {
    kind: 'begin_table_row';
    bgColor?: string;
    loc?: SourceLoc;
}
export interface IREndTableRow {
    kind: 'end_table_row';
}
export interface IRBeginTableCell {
    kind: 'begin_table_cell';
    columnIndex?: string;
    bgColor?: string;
    loc?: SourceLoc;
}
export interface IREndTableCell {
    kind: 'end_table_cell';
}
export interface IRBeginTreeNode {
    kind: 'begin_tree_node';
    label: string;
    defaultOpen?: string;
    forceOpen?: string;
    openOnArrow?: string;
    openOnDoubleClick?: string;
    leaf?: string;
    bullet?: string;
    noTreePushOnOpen?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IREndTreeNode {
    kind: 'end_tree_node';
    noTreePushOnOpen?: string;
}
export interface IRBeginCollapsingHeader {
    kind: 'begin_collapsing_header';
    label: string;
    defaultOpen?: string;
    forceOpen?: string;
    closable?: string;
    onCloseBody?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IREndCollapsingHeader {
    kind: 'end_collapsing_header';
    closable?: string;
}
export interface IRText {
    kind: 'text';
    format: string;
    args: string[];
    color?: string;
    disabled?: boolean;
    wrapped?: boolean;
    loc?: SourceLoc;
}
export interface IRButton {
    kind: 'button';
    title: string;
    action: string[];
    disabled?: string;
    style?: string;
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRSeparator {
    kind: 'separator';
    loc?: SourceLoc;
}
export interface IRSpacing {
    kind: 'spacing';
    loc?: SourceLoc;
}
export interface IRDummy {
    kind: 'dummy';
    width: string;
    height: string;
    loc?: SourceLoc;
}
export interface IRSameLine {
    kind: 'same_line';
    offset: string;
    spacing: string;
    loc?: SourceLoc;
}
export interface IRNewLine {
    kind: 'new_line';
    loc?: SourceLoc;
}
export interface IRCursor {
    kind: 'cursor';
    x: string;
    y: string;
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
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRInputInt {
    kind: 'input_int';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRInputFloat {
    kind: 'input_float';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRColorEdit {
    kind: 'color_edit';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
export interface IRShortcut {
    kind: 'shortcut';
    keys: string;
    action: string[];
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
    selectionIndex?: string;
    flags?: string;
    style?: string;
    item?: IRItemInteraction;
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
    item?: IRItemInteraction;
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
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRColorEdit3 {
    kind: 'color_edit3';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRColorPicker3 {
    kind: 'color_picker3';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
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
export interface IRDrawBezierCubic {
    kind: 'draw_bezier_cubic';
    p1: string;
    p2: string;
    p3: string;
    p4: string;
    color: string;
    thickness: string;
    segments: string;
    loc?: SourceLoc;
}
export interface IRDrawBezierQuadratic {
    kind: 'draw_bezier_quadratic';
    p1: string;
    p2: string;
    p3: string;
    color: string;
    thickness: string;
    segments: string;
    loc?: SourceLoc;
}
export interface IRDrawPolyline {
    kind: 'draw_polyline';
    points: string;
    color: string;
    thickness: string;
    closed: string;
    loc?: SourceLoc;
}
export interface IRDrawConvexPolyFilled {
    kind: 'draw_convex_poly_filled';
    points: string;
    color: string;
    loc?: SourceLoc;
}
export interface IRDrawNgon {
    kind: 'draw_ngon';
    center: string;
    radius: string;
    color: string;
    numSegments: string;
    thickness: string;
    loc?: SourceLoc;
}
export interface IRDrawNgonFilled {
    kind: 'draw_ngon_filled';
    center: string;
    radius: string;
    color: string;
    numSegments: string;
    loc?: SourceLoc;
}
export interface IRDrawTriangle {
    kind: 'draw_triangle';
    p1: string;
    p2: string;
    p3: string;
    color: string;
    filled: string;
    thickness: string;
    loc?: SourceLoc;
}
export interface IRInputFloatN {
    kind: 'input_float_n';
    label: string;
    count: number;
    stateVar?: string;
    valueExpr?: string;
    directBind?: boolean;
    onChangeExpr?: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRInputIntN {
    kind: 'input_int_n';
    label: string;
    count: number;
    stateVar?: string;
    valueExpr?: string;
    directBind?: boolean;
    onChangeExpr?: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRDragFloatN {
    kind: 'drag_float_n';
    label: string;
    count: number;
    stateVar?: string;
    valueExpr?: string;
    directBind?: boolean;
    onChangeExpr?: string;
    speed: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRDragIntN {
    kind: 'drag_int_n';
    label: string;
    count: number;
    stateVar?: string;
    valueExpr?: string;
    directBind?: boolean;
    onChangeExpr?: string;
    speed: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRSliderFloatN {
    kind: 'slider_float_n';
    label: string;
    count: number;
    stateVar?: string;
    valueExpr?: string;
    directBind?: boolean;
    onChangeExpr?: string;
    min: string;
    max: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRSliderIntN {
    kind: 'slider_int_n';
    label: string;
    count: number;
    stateVar?: string;
    valueExpr?: string;
    directBind?: boolean;
    onChangeExpr?: string;
    min: string;
    max: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRVSliderFloat {
    kind: 'vslider_float';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width: string;
    height: string;
    min: string;
    max: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRVSliderInt {
    kind: 'vslider_int';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    width: string;
    height: string;
    min: string;
    max: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRSliderAngle {
    kind: 'slider_angle';
    label: string;
    stateVar: string;
    valueExpr?: string;
    onChangeExpr?: string;
    directBind?: boolean;
    min: string;
    max: string;
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRBeginCombo {
    kind: 'begin_combo';
    label: string;
    preview: string;
    flags: string[];
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IREndCombo {
    kind: 'end_combo';
}
export interface IRBeginListBox {
    kind: 'begin_list_box';
    label: string;
    width?: string;
    height?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IREndListBox {
    kind: 'end_list_box';
}
export interface IRBullet {
    kind: 'bullet';
    loc?: SourceLoc;
}
export interface IRSmallButton {
    kind: 'small_button';
    label: string;
    action: string[];
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRArrowButton {
    kind: 'arrow_button';
    id: string;
    direction: string;
    action: string[];
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRInvisibleButton {
    kind: 'invisible_button';
    id: string;
    width: string;
    height: string;
    action: string[];
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IRImageButton {
    kind: 'image_button';
    id: string;
    src: string;
    width?: string;
    height?: string;
    action: string[];
    item?: IRItemInteraction;
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
