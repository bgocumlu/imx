# IMX LLM Prompt Reference

IMX: write .tsx with JSX components and useState hooks. Compiles to native Dear ImGui C++ apps.
Compile: `node compiler/dist/index.js App.tsx [Other.tsx ...] -o build/generated`

## Font Loading (C++)

```cpp
imx::FontOptions ui_font{};
ui_font.pixel_snap_h = true;
ui_font.oversample_h = 2;
ui_font.oversample_v = 2;
ui_font.rasterizer_multiply = 1.1f;

imx::load_font("inter-ui", "Inter-Regular.ttf", 16.0f, ui_font);
imx::load_font("jetbrains-mono", "JetBrainsMono-Regular.ttf", 15.0f);
imx::set_default_font("inter-ui");
```

Utilities:
`load_font(name, path, size, options?) -> ImFont*`
`load_font_embedded(name, data, data_size, size, options?) -> ImFont*`
`find_font(name) -> ImFont*`
`set_default_font(name) -> bool`
`clipboard_get() -> std::string`
`clipboard_set(text) -> void`

`FontOptions`: `pixel_snap_h`, `oversample_h`, `oversample_v`, `rasterizer_multiply`, `merge_mode`

## Components

### Layout
```
DockSpace: style?(Style) | children — top-level docking container
Window: title(string, required) | open?(boolean) | onClose?(callback) | noTitleBar? | noResize? | noMove? | noCollapse? | noDocking? | noScrollbar? | noBackground? | alwaysAutoResize? | noNavFocus? | noNav? | noDecoration? | noInputs? | noScrollWithMouse? | horizontalScrollbar? | alwaysVerticalScrollbar? | alwaysHorizontalScrollbar? | x?(number) | y?(number) | width?(number) | height?(number) | forcePosition?(boolean) | forceSize?(boolean) | minWidth?(number) | minHeight?(number) | maxWidth?(number) | maxHeight?(number) | bgAlpha?(number) | noViewport?(boolean) | viewportAlwaysOnTop?(boolean) | style?(Style) | children — ImGui window with full control
View: style?(Style) | children — generic container
Indent: width?(number) | children — temporary indentation for child items
TextWrap: width(number, required) | children — push text wrap boundary relative to current cursor
Row: gap?(number) | style?(Style) | children — horizontal layout
Column: gap?(number) | style?(Style) | children — vertical layout
Spacing: (no props) — insert one standard vertical gap
Dummy: width(number, required) | height(number, required) — invisible placeholder item
SameLine: offset?(number) | spacing?(number) — place next item inline with explicit positioning
NewLine: (no props) — force line break
Cursor: x(number, required) | y(number, required) — move cursor for next item
```

### Navigation
```
MainMenuBar: children — full-screen application menu bar
MenuBar: children — window-local menu bar
Menu: label(string, required) | children — dropdown menu
MenuItem: label(string, required) | onPress?(() => void) | shortcut?(string) — menu action
Shortcut: keys(string, required) | onPress(() => void, required) — real keyboard chord handler (MenuItem.shortcut is display only)
TabBar: style?(Style) | children — tab container
TabItem: label(string, required) | children — single tab
```

### Data
```
Table: columns((string | TableColumn)[], required) | sortable?(boolean) | onSort?((specs) => void) | hideable?(boolean) | multiSortable?(boolean) | noClip?(boolean) | padOuterX?(boolean) | scrollX?(boolean) | scrollY?(boolean) | style?(Style) | children — table with named columns and advanced ImGui flags
TableRow: bgColor?([r,g,b,a]) | children — one row, children map to columns
TableCell: columnIndex?(number) | bgColor?([r,g,b,a]) | children — explicit cell for column jumps and cell background colors
TreeNode: label(string, required) | defaultOpen?(boolean) | forceOpen?(boolean) | openOnArrow?(boolean) | openOnDoubleClick?(boolean) | leaf?(boolean) | bullet?(boolean) | noTreePushOnOpen?(boolean) | children — advanced ImGui tree node
CollapsingHeader: label(string, required) | defaultOpen?(boolean) | forceOpen?(boolean) | closable?(boolean) | onClose?(() => void) | children — collapsible section with optional close button
```

### Text & Display
```
Text: color?(number[]) | disabled?(boolean) | wrapped?(boolean) | style?(Style) | children — text display with optional color, disabled, or wrapped mode
Separator: (no props) — horizontal line
ProgressBar: value(number, required) | overlay?(string) | style?(Style) — progress 0.0-1.0
Tooltip: text(string, required) — tooltip on previous item hover
BulletText: style?(Style) | children — bulleted text item
Bullet: style?(Style) — standalone bullet point, use with SameLine for text
LabelText: label(string, required) | value(string, required) — label with value display
PlotLines: label(string, required) | values(number[], required) | overlay?(string) | style?(Style) — line graph
PlotHistogram: label(string, required) | values(number[], required) | overlay?(string) | style?(Style) — histogram
```

### Inputs
```
Button: title(string, required) | onPress(() => void, required) | disabled?(boolean) | style?(Style)
TextInput: value(string, required) | onChange((v: string) => void, required) | label?(string) | placeholder?(string) | width?(number) | style?(Style)
InputTextMultiline: label(string, required) | value(string, required) | onChange((v: string) => void, required) | width?(number) | style?(Style)
Checkbox: value(boolean, required) | onChange((v: boolean) => void, required) | label?(string) | style?(Style)
SliderFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | min(number, required) | max(number, required) | width?(number) | style?(Style)
SliderInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | min(number, required) | max(number, required) | width?(number) | style?(Style)
DragFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | speed?(number) | width?(number) | style?(Style)
DragInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | speed?(number) | width?(number) | style?(Style)
InputInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | width?(number) | style?(Style)
InputFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | width?(number) | style?(Style)
Radio: label(string, required) | value(number, required) | index(number, required) | onChange?((v: number) => void) | style?(Style)
Selectable: label(string, required) | selected?(boolean) | onSelect?(() => void) | selectionIndex?(number) | spanAllColumns? | allowDoubleClick? | dontClosePopups? | style?(Style) — clickable list item with optional flags
ColorEdit: label(string, required) | value(number[], required) | onChange((v: number[]) => void, required) | style?(Style)
ColorEdit3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | style?(Style) — RGB only
ColorPicker: label(string, required) | value(number[], required) | onChange((v: number[]) => void, required) | style?(Style)
ColorPicker3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | style?(Style) — RGB only
Combo: label(string, required) | value?(number) | onChange?((v: number) => void) | items?(string[]) | preview?(string) | noArrowButton? | noPreview? | heightSmall? | heightLarge? | heightRegular? | width?(number) | style?(Style) | children? — simple mode (items) or manual mode (children)
ListBox: label(string, required) | value?(number) | onChange?((v: number) => void) | items?(string[]) | width?(number) | height?(number) | style?(Style) | children? — simple mode (items + value + onChange required) or manual mode (children with Selectable items, no value/items needed)
SmallButton: label(string, required) | onPress(() => void, required) — compact button
ArrowButton: id(string, required) | direction("left"|"right"|"up"|"down", required) | onPress(() => void, required)
InvisibleButton: id(string, required) | width(number, required) | height(number, required) | onPress(() => void, required) — invisible hitbox
ImageButton: id(string, required) | src(string, required) | width?(number) | height?(number) | onPress(() => void, required) — clickable image
VSliderFloat: label(string, required) | value(number, required) | onChange?((v: number) => void) | width(number, required) | height(number, required) | min(number, required) | max(number, required) | style?(Style)
VSliderInt: label(string, required) | value(number, required) | onChange?((v: number) => void) | width(number, required) | height(number, required) | min(number, required) | max(number, required) | style?(Style)
SliderAngle: label(string, required) | value(number, required) | onChange?((v: number) => void) | min?(number) | max?(number) | style?(Style)
InputFloat2: label(string, required) | value([number,number], required) | onChange?((v) => void) | style?(Style)
InputFloat3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | style?(Style)
InputFloat4: label(string, required) | value([number,number,number,number], required) | onChange?((v) => void) | style?(Style)
InputInt2: label(string, required) | value([number,number], required) | onChange?((v) => void) | style?(Style)
InputInt3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | style?(Style)
InputInt4: label(string, required) | value([number,number,number,number], required) | onChange?((v) => void) | style?(Style)
DragFloat2: label(string, required) | value([number,number], required) | onChange?((v) => void) | speed?(number) | style?(Style)
DragFloat3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | speed?(number) | style?(Style)
DragFloat4: label(string, required) | value([number,number,number,number], required) | onChange?((v) => void) | speed?(number) | style?(Style)
DragInt2: label(string, required) | value([number,number], required) | onChange?((v) => void) | speed?(number) | style?(Style)
DragInt3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | speed?(number) | style?(Style)
DragInt4: label(string, required) | value([number,number,number,number], required) | onChange?((v) => void) | speed?(number) | style?(Style)
SliderFloat2: label(string, required) | value([number,number], required) | onChange?((v) => void) | min(number, required) | max(number, required) | style?(Style)
SliderFloat3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | min(number, required) | max(number, required) | style?(Style)
SliderFloat4: label(string, required) | value([number,number,number,number], required) | onChange?((v) => void) | min(number, required) | max(number, required) | style?(Style)
SliderInt2: label(string, required) | value([number,number], required) | onChange?((v) => void) | min(number, required) | max(number, required) | style?(Style)
SliderInt3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | min(number, required) | max(number, required) | style?(Style)
SliderInt4: label(string, required) | value([number,number,number,number], required) | onChange?((v) => void) | min(number, required) | max(number, required) | style?(Style)
```

Width note: All input-like widgets (TextInput, InputTextMultiline, scalar/vector inputs, sliders, drags, Combo, ListBox, ColorEdit, ColorEdit3, ColorPicker, ColorPicker3) accept `width?(number)` for per-item width control.
Phase 16 interaction note: interactive widgets also accept `tooltip?(string)`, `autoFocus?(boolean)`, `scrollToHere?(boolean)`, `cursor?("none"|"arrow"|"text"|"textInput"|"resizeAll"|"resizeNS"|"resizeEW"|"resizeNESW"|"resizeNWSE"|"hand"|"wait"|"progress"|"notAllowed")`, `onHover?(() => void)`, `onActive?(() => void)`, `onFocused?(() => void)`, `onClicked?(() => void)`, `onDoubleClicked?(() => void)`.

### Overlay
```
Modal: title(string, required) | open?(boolean) | onClose?(() => void) | noTitleBar? | noResize? | noMove? | noScrollbar? | noCollapse? | alwaysAutoResize? | noBackground? | horizontalScrollbar? | style?(Style) | children — blocking modal dialog with optional window flags
Popup: id(string, required) | style?(Style) | children
ContextMenu: id?(string) | target?("item"|"window") | mouseButton?("left"|"right"|"middle") | children — context popup, default right-click
MultiSelect: singleSelect? | noSelectAll? | noRangeSelect? | noAutoSelect? | noAutoClear? | boxSelect? | boxSelect2d? | boxSelectNoScroll? | clearOnClickVoid? | selectionSize?(number) | itemsCount?(number) | onSelectionChange?(callback) | children — multi-selection container (requires struct binding, use apply_multi_select_requests helper)
Image: src(string, required) | embed?(boolean) | width?(number) | height?(number) — texture display (embed bakes into exe)
```

### Styling
```
Theme: preset(string, required) | accentColor?([r,g,b,a]) | backgroundColor?([r,g,b,a]) | textColor?([r,g,b,a]) | borderColor?([r,g,b,a]) | surfaceColor?([r,g,b,a]) | rounding?(number) | borderSize?(number) | spacing?(number) | children — 5 color props derive all 55 ImGui color slots
StyleColor: text? | textDisabled? | windowBg? | frameBg? | frameBgHovered? | frameBgActive? | titleBg? | titleBgActive? | button? | buttonHovered? | buttonActive? | header? | headerHovered? | headerActive? | separator? | checkMark? | sliderGrab? | border? | popupBg? | tab? — all [r,g,b,a], push/pop color overrides
StyleVar: alpha?(number) | windowPadding?([x,y]) | windowRounding?(number) | framePadding?([x,y]) | frameRounding?(number) | frameBorderSize?(number) | itemSpacing?([x,y]) | itemInnerSpacing?([x,y]) | indentSpacing?(number) | cellPadding?([x,y]) | tabRounding?(number) — push/pop style var overrides
```

### Scoping
```
Group: style?(Style) | children — BeginGroup/EndGroup, makes children act as single item
ID: scope(string|number, required) | children — PushID/PopID explicit ID scope
Disabled: disabled?(boolean) | children — BeginDisabled/EndDisabled, grays out children (default: true)
Child: id(string, required) | width?(number) | height?(number) | border?(boolean) | style?(Style) | children — scrollable sub-region
Font: name(string, required) | src?(string) | size?(number) | embed?(boolean) | children — PushFont/PopFont; first occurrence with src declares the font (file or embedded), subsequent uses just select by name
```

### Interaction
```
DragDropSource: type(string, required) | payload(number|string, required) | children — makes children draggable
DragDropTarget: type(string, required) | onDrop((payload) => void, required) | children — accepts drops, callback param type annotation sets C++ cast
```

### Drawing
```
Canvas: width(number, required) | height(number, required) | style?(Style) | children — sized drawing region, children are draw primitives, coords relative to canvas origin
DrawLine: p1([x,y], required) | p2([x,y], required) | color([r,g,b,a], required) | thickness?(number)
DrawRect: min([x,y], required) | max([x,y], required) | color([r,g,b,a], required) | filled?(boolean) | thickness?(number) | rounding?(number)
DrawCircle: center([x,y], required) | radius(number, required) | color([r,g,b,a], required) | filled?(boolean) | thickness?(number)
DrawText: pos([x,y], required) | text(string, required) | color([r,g,b,a], required)
DrawBezierCubic: p1([x,y], required) | p2([x,y], required) | p3([x,y], required) | p4([x,y], required) | color([r,g,b,a], required) | thickness?(number) | segments?(number)
DrawBezierQuadratic: p1([x,y], required) | p2([x,y], required) | p3([x,y], required) | color([r,g,b,a], required) | thickness?(number) | segments?(number)
DrawPolyline: points([x,y][], required) | color([r,g,b,a], required) | thickness?(number) | closed?(boolean)
DrawConvexPolyFilled: points([x,y][], required) | color([r,g,b,a], required)
DrawNgon: center([x,y], required) | radius(number, required) | color([r,g,b,a], required) | numSegments(number, required) | thickness?(number)
DrawNgonFilled: center([x,y], required) | radius(number, required) | color([r,g,b,a], required) | numSegments(number, required)
DrawTriangle: p1([x,y], required) | p2([x,y], required) | p3([x,y], required) | color([r,g,b,a], required) | filled?(boolean) | thickness?(number)
```

### Dock Configuration
```
DockLayout: children — declares initial dock layout (applied once + on resetLayout())
DockSplit: direction(string, required) | size(number, required) | children — splits dock region ("horizontal"|"vertical", size 0.0-1.0)
DockPanel: children (string) — assigns window titles to a dock region
```

## State

```tsx
const [value, setValue] = useState(initialValue);
```
Types: `number`, `string`, `boolean`, `number[]` (for ColorEdit RGBA)
Also supported: fixed tuples for vector widgets, e.g. `[number, number]`, `[number, number, number]`, `[number, number, number, number]`
Color format: `[r, g, b, a]` with floats 0.0-1.0

## Style

```tsx
interface Style {
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  backgroundColor?: [number, number, number, number]; // RGBA 0.0-1.0
  textColor?: [number, number, number, number];        // RGBA 0.0-1.0
  fontSize?: number;
}
```

## Important: Not React

IMX looks like React but compiles to C++. Key differences:

- **No `key` prop** — use `<ID scope={i}>` to scope items in loops, not `key={i}`
- **No destructuring** — access props via `props.name`, not `{ name }`
- **`===` / `!==`** — supported, compiled to `==` / `!=` in C++
- **String + number** — `props.count + " items"` works (compiled to `std::to_string` + string concat)
- **Text interpolation** — `<Text>Count: {props.count}</Text>` uses printf-style formatting internally
- **No useEffect / lifecycle** — immediate mode, every frame rebuilds everything
- **No async / promises** — all rendering is synchronous

## Patterns

```tsx
// Conditional rendering
{show && <Text>Visible</Text>}

// Ternary
{active ? <Text>On</Text> : <Text>Off</Text>}

// Toggle boolean
<Button title="Toggle" onPress={() => setFlag(!flag)} />

// Setter shorthand (pass setter directly for matching types)
<TextInput value={name} onChange={setName} label="Name" />
<SliderFloat label="X" value={x} onChange={setX} min={0} max={100} />

// List iteration — use ID scope, not key
{items.map((item, i) => (
  <ID scope={i}>
    <Text>{item.name}</Text>
  </ID>
))}
```

## Custom Components

```tsx
// MyComponent.tsx — must use named export
export function MyComponent(props: { text: string, count: number, onAction: () => void }) {
  return (
    <Row gap={8}>
      <Text>{props.text}: {props.count}</Text>
      <Button title="Go" onPress={props.onAction} />
    </Row>
  );
}
```

```tsx
// App.tsx — root uses export default, import custom components
import { MyComponent } from './MyComponent';

export default function App() {
  const [n, setN] = useState(0);
  return (
    <Window title="Demo">
      <MyComponent text="Score" count={n} onAction={() => setN(n + 1)} />
    </Window>
  );
}
```

Props access: `props.name` (no destructuring). Types: `string`, `number`, `boolean`, `() => void`.

## Critical Patterns

### Window with Close Button
```tsx
const [showSettings, setShowSettings] = useState(false);

<Button title="Settings" onPress={() => setShowSettings(true)} />
{showSettings && <Window title="Settings" open={true} onClose={() => setShowSettings(false)}>
  <Text>Window content here</Text>
</Window>}
```
`open={true}` shows the X button. Clicking X calls `onClose`. The `{showSettings && ...}` pattern removes the window from the tree.

### ContextMenu (SIBLING, not child)
```tsx
// ContextMenu goes AFTER the target item as a sibling — never inside it
<Button title="Right-click me" onPress={() => {}} />
<ContextMenu id="my-ctx">
  <MenuItem label="Option A" onPress={() => setResult("A")} />
  <MenuItem label="Option B" onPress={() => setResult("B")} />
</ContextMenu>

// Window-level context menu (right-click anywhere in the window)
<ContextMenu id="win-ctx" target="window">
  <MenuItem label="Refresh" onPress={() => {}} />
</ContextMenu>

// Left-click context menu
<Button title="Left-click for menu" onPress={() => {}} />
<ContextMenu id="left-ctx" mouseButton="left">
  <MenuItem label="Action" onPress={() => {}} />
</ContextMenu>
```

### DockLayout (initial window arrangement)
```tsx
<DockSpace>
  <DockLayout>
    <DockSplit direction="horizontal" size={0.25}>
      <DockPanel>
        <Window title="Sidebar" />
      </DockPanel>
      <DockPanel>
        <Window title="Main" />
      </DockPanel>
    </DockSplit>
  </DockLayout>
  <Window title="Sidebar">
    <Text>Sidebar content</Text>
  </Window>
  <Window title="Main">
    <Text>Main content</Text>
  </Window>
</DockSpace>
```
`DockLayout` declares where windows dock initially. `DockPanel` children are window title strings. Window content is defined separately below.

### Font Loading from TSX
```tsx
// First occurrence with src declares the font (embedded into binary)
<Font name="mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
  <Text>Monospace text</Text>
</Font>

// Subsequent uses just select by name — no src/size/embed needed
<Font name="mono">
  <Text>Also monospace</Text>
</Font>
```
Font files in `public/` are resolved automatically. The compiler generates `_imx_load_fonts()` which loads all declared fonts.

## Component Examples (Batch 1-2)

### Modal
```tsx
const [showConfirm, setShowConfirm] = useState(false);

<Button title="Delete" onPress={() => setShowConfirm(true)} />
<Modal title="Confirm Deletion" open={showConfirm} onClose={() => setShowConfirm(false)}>
  <Text>Are you sure you want to delete this item?</Text>
  <Row gap={8}>
    <Button title="Delete" onPress={() => { deleteItem(); setShowConfirm(false); }} />
    <Button title="Cancel" onPress={() => setShowConfirm(false)} />
  </Row>
</Modal>
```

### Radio
```tsx
const [selectedSize, setSelectedSize] = useState(0);

<Column gap={4}>
  <Radio label="Small" value={selectedSize} index={0} onChange={setSelectedSize} />
  <Radio label="Medium" value={selectedSize} index={1} onChange={setSelectedSize} />
  <Radio label="Large" value={selectedSize} index={2} onChange={setSelectedSize} />
</Column>
```

### Selectable
```tsx
const [selectedItem, setSelectedItem] = useState(0);

<Column gap={2}>
  <Selectable label="Item 1" selected={selectedItem === 0} onSelect={() => setSelectedItem(0)} />
  <Selectable label="Item 2" selected={selectedItem === 1} onSelect={() => setSelectedItem(1)} />
  <Selectable label="Item 3" selected={selectedItem === 2} onSelect={() => setSelectedItem(2)} />
</Column>
```

### InputTextMultiline
```tsx
const [description, setDescription] = useState("Enter text here...");

<InputTextMultiline 
  label="Description" 
  value={description} 
  onChange={setDescription}
  style={{ width: 400, height: 150 }}
/>
```

### ColorPicker
```tsx
const [themeColor, setThemeColor] = useState([0.2, 0.5, 0.9, 1.0]);

<ColorPicker label="Theme Color" value={themeColor} onChange={setThemeColor} />
```

### PlotLines
```tsx
const [frameRate, setFrameRate] = useState([60, 61, 59, 62, 60]);

<PlotLines 
  label="Frame Rate" 
  values={frameRate} 
  overlay="60 FPS" 
  style={{ width: 300, height: 100 }}
/>
```

### PlotHistogram
```tsx
const [scores, setScores] = useState([2, 5, 8, 12, 7, 3]);

<PlotHistogram 
  label="Score Distribution" 
  values={scores} 
  style={{ width: 300, height: 100 }}
/>
```

### BulletText
```tsx
<Column gap={4}>
  <Text style={{ fontSize: 16 }}>Key Features:</Text>
  <BulletText>Fast rendering with ImGui</BulletText>
  <BulletText>React-like JSX syntax</BulletText>
  <BulletText>Native C++ performance</BulletText>
</Column>
```

### LabelText
```tsx
<Column gap={4}>
  <LabelText label="Version" value="1.0.0" />
  <LabelText label="Author" value="Your Name" />
  <LabelText label="Status" value="Active" />
</Column>
```

### Image
```tsx
// Runtime file loading
<Image src="icon.png" width={32} height={32} />

// Embedded in executable (no file needed at runtime)
<Image src="splash.png" embed width={800} height={600} />
```

## Component Examples (Batch 3-4)

### StyleColor + StyleVar
```tsx
<StyleColor button={[0.2, 0.8, 0.2, 1.0]} buttonHovered={[0.3, 0.9, 0.3, 1.0]} buttonActive={[0.1, 0.6, 0.1, 1.0]}>
  <StyleVar frameRounding={8} framePadding={[12, 6]}>
    <Button title="Green Rounded" onPress={() => {}} />
  </StyleVar>
</StyleColor>
```

### DragDrop
```tsx
const [dropped, setDropped] = useState(0);

<DragDropSource type="item" payload={42}>
  <Text>Drag me</Text>
</DragDropSource>
<DragDropTarget type="item" onDrop={(id: number) => setDropped(id)}>
  <View style={{ minHeight: 50 }}>
    <Text>Drop here</Text>
  </View>
</DragDropTarget>
```

### Canvas
```tsx
<Canvas width={300} height={200} style={{ backgroundColor: [0.1, 0.1, 0.1, 1.0] }}>
  <DrawLine p1={[0, 0]} p2={[300, 200]} color={[1, 0, 0, 1]} thickness={2} />
  <DrawRect min={[20, 20]} max={[120, 80]} color={[0, 1, 0, 1]} filled rounding={4} />
  <DrawCircle center={[200, 100]} radius={40} color={[0, 0.5, 1, 1]} thickness={3} />
  <DrawText pos={[10, 185]} text="Canvas" color={[1, 1, 1, 1]} />
</Canvas>
```

### Disabled + Child
```tsx
<Disabled>
  <Button title="Can't click" onPress={() => {}} />
</Disabled>
<Child id="scrollable" width={0} height={150} border>
  <Text>Line 1</Text>
  <Text>Line 2</Text>
  <Text>Line 3</Text>
</Child>
```

### Group + ID
```tsx
<ID scope="player1">
  <Group>
    <Text>Player 1</Text>
    <SliderFloat label="HP" value={hp} min={0} max={100} onChange={setHp} />
  </Group>
</ID>
```

## Full Example

```tsx
export default function App() {
  const [speed, setSpeed] = useState(5.0);
  const [mode, setMode] = useState(0);
  const [color, setColor] = useState([1.0, 0.5, 0.0, 1.0]);
  const [checked, setChecked] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={0.4}>
          <DockPanel>
            <Window title="Controls" />
          </DockPanel>
          <DockPanel>
            <Window title="Preview" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <MainMenuBar>
        <Menu label="File">
          <MenuItem label="New" shortcut="Ctrl+N" />
          <Separator />
          <MenuItem label="Exit" />
        </Menu>
        <Menu label="Help">
          <MenuItem label="About" onPress={() => setShowAbout(true)} />
        </Menu>
      </MainMenuBar>
      <Window title="Controls">
        <Column gap={4}>
          <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
          <Combo label="Mode" value={mode} onChange={setMode} items={["Easy", "Hard"]} />
          <ColorEdit label="Color" value={color} onChange={setColor} />
          <Checkbox label="Enabled" value={checked} onChange={setChecked} />
        </Column>
      </Window>
      <Window title="Preview">
        <Text>Speed: {speed}</Text>
        <Text>Mode: {mode === 0 ? "Easy" : "Hard"}</Text>
        <ProgressBar value={speed / 100.0} />
      </Window>
      {showAbout && <Window title="About" open={true} onClose={() => setShowAbout(false)}>
        <Text>Built with IMX</Text>
      </Window>}
    </DockSpace>
  );
}
```

## File Setup

Required files per app directory: `App.tsx`, `imx.d.ts`, `tsconfig.json`, `main.cpp`.
Compile all .tsx files together: `node compiler/dist/index.js App.tsx TodoItem.tsx -o build/generated`
First .tsx argument is the root component (must use `export default`).

## Native Widgets

Native widgets are C++ ImGui widgets registered at runtime. Use them like any component:

```tsx
<Knob value={vol} onChange={(v: number) => setVol(v)} min={0} max={1} />
```

Requirements:
- Widget must be registered in `main.cpp` with `imx::register_widget("Knob", ...)`
- Props must be declared in `imx.d.ts` for type checking
- Callbacks with a value parameter need a type annotation: `(v: number) => ...`

Custom themes work via `imx::register_theme("name", fn)` and `<Theme preset="name">`.

## C++ Struct Binding

Root component receives C++ struct as mutable reference. `value={props.field}` without `onChange` emits direct pointer (`&props.field`). No temp variables, no copies.

```tsx
// App.tsx — props type matches C++ struct name
export default function App(props: AppState) {
  const [showModal, setShowModal] = useState(false); // UI-only state still works
  return (
    <Window title="Controls">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
      <Checkbox label="Muted" value={props.muted} />
      <Button title="Connect" onPress={props.onConnect} />
      {props.items.map((item, i) => (
        <ID scope={i}>
          <DragFloat label={"##" + i} value={item.value} speed={0.5} />
        </ID>
      ))}
    </Window>
  );
}
```

C++ side: define struct in `AppState.h`, pass to `imx::render_root(runtime, state)`.
Callbacks: `std::function<void()>` or `std::function<void(int)>` fields. Vector iteration: `.map()` emits `auto&` reference.
Thread safety: developer's responsibility (same as raw ImGui).

### Struct Binding Notes

- **TextInput / InputTextMultiline**: supports struct binding via `value={props.name}` — buffer syncs to/from the struct field each frame.
- **Custom component props**: bound props (used with `value={props.x}` without onChange) are automatically passed as `T*` pointers through custom components. Direct binding works at any nesting level.
- **Sub-struct binding**: pass named sub-struct types to child components. `<ControlsPanel data={props.controls} />` with `props: { data: ControlsData }`. The compiler generates `ControlsData* data` in the child's Props struct.
- **Nested `.map()`**: auto-generated unique loop indices — same variable name in nested maps is safe.
- **ColorEdit/ColorPicker**: works with struct binding via `std::vector<float>` fields (emits `.data()`).
- **DragDrop payloads**: type matches the `onDrop` callback's parameter type annotation. Defaults to `float` if no target is found in the same component.
- **File naming**: TSX filename must match the exported function name. `Sidebar.tsx` exports `Sidebar`. CMake uses the filename, compiler uses the function name.
- **Repeated labels in tables/loops**: wrap in `<ID scope={i}>` to give each item a unique ImGui ID.

### Sub-struct Binding Example

```cpp
// AppState.h
struct ControlsData {
    float speed = 5.0f;
    int count = 3;
    std::vector<Item> items;
    std::function<void()> reset;
};

struct AppState {
    ControlsData controls;
};
```

```tsx
// ControlsPanel.tsx — child component receives sub-struct
export function ControlsPanel(props: { onClose: () => void; data: ControlsData }) {
  return (
    <Window title="Controls" open={true} onClose={props.onClose}>
      <SliderFloat label="Speed" value={props.data.speed} min={0} max={100} />
      <DragInt label="Count" value={props.data.count} speed={1} />
      <Button title="Reset" onPress={props.data.reset} />
      {props.data.items.map((item, i) => (
        <ID scope={i}>
          <Text>{item.name}</Text>
        </ID>
      ))}
    </Window>
  );
}
```

```tsx
// App.tsx — root passes sub-struct
import { ControlsPanel } from './ControlsPanel';

export default function App(props: AppState) {
  const [showControls, setShowControls] = useState(false);
  return (
    <DockSpace>
      <Window title="Main">
        <Button title="Controls" onPress={() => setShowControls(true)} />
      </Window>
      {showControls && <ControlsPanel
        onClose={() => setShowControls(false)}
        data={props.controls}
      />}
    </DockSpace>
  );
}
```

### Modal with Escape Key

Modal does not close on Escape by default (ImGui design). Add a Shortcut inside the modal:

```tsx
<Modal title="Confirm" open={showModal} onClose={() => setShowModal(false)}>
  <Shortcut keys="Escape" onPress={() => setShowModal(false)} />
  <Text>Are you sure?</Text>
  <Button title="Close" onPress={() => setShowModal(false)} />
</Modal>
```
