# IMX API Reference

## Overview

IMX is a React-Native-like framework that lets you write `.tsx` files and compiles them into native Dear ImGui C++ applications. You author UI with JSX components and state hooks, and the compiler generates C++ code that renders through ImGui with GLFW/OpenGL.

### Pipeline

```
.tsx source  -->  imx-compiler  -->  .gen.cpp / .gen.h  -->  CMake build  -->  native binary
```

### Usage

1. Write `.tsx` files using IMX components
2. Run the compiler: `node compiler/dist/index.js App.tsx [OtherComponent.tsx ...] -o build/generated`
3. Build with CMake: `cmake --build build`

### Important: Not React

IMX uses JSX syntax but compiles to C++. Key differences from React:

- **No `key` prop** — use `<ID scope={i}>` to scope items in `.map()` loops
- **No destructuring** — access props via `props.name`, not `{ name }`
- **No useEffect / lifecycle** — immediate mode, the entire UI rebuilds every frame
- **No async / promises** — all rendering is synchronous
- **`===` / `!==`** — supported, compiled to `==` / `!=` in C++
- **String + number in props** — `props.count + " items"` works (compiled to `std::to_string`)
- **Text children interpolation** — `<Text>Count: {n}</Text>` uses printf-style formatting

---

## Components

### Layout

#### DockSpace

Top-level docking container. Enables Dear ImGui docking for all child windows.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Layout and appearance styles |

```tsx
export default function App() {
  return (
    <DockSpace>
      <Window title="Panel A"><Text>Left</Text></Window>
      <Window title="Panel B"><Text>Right</Text></Window>
    </DockSpace>
  );
}
```

> **Note:** Use one DockSpace as the root element when you want dockable windows. Windows inside a DockSpace can be dragged, split, and tabbed by the user.

---

#### Window

An ImGui window with a title bar.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Window title displayed in the title bar |
| open | boolean | No | Controls window visibility |
| onClose | callback | No | Called when the window close button is clicked |
| noTitleBar | boolean | No | Hide the title bar |
| noResize | boolean | No | Prevent resizing |
| noMove | boolean | No | Prevent moving |
| noCollapse | boolean | No | Prevent collapsing |
| noDocking | boolean | No | Prevent docking |
| noScrollbar | boolean | No | Hide scrollbar |
| noBackground | boolean | No | Transparent background |
| alwaysAutoResize | boolean | No | Auto-resize to fit content |
| noNavFocus | boolean | No | No nav focus |
| noNav | boolean | No | No nav |
| noDecoration | boolean | No | No title bar, resize, scrollbar, collapse |
| noInputs | boolean | No | No mouse/keyboard input |
| noScrollWithMouse | boolean | No | Disable scroll with mouse wheel |
| horizontalScrollbar | boolean | No | Show horizontal scrollbar |
| alwaysVerticalScrollbar | boolean | No | Always show vertical scrollbar |
| alwaysHorizontalScrollbar | boolean | No | Always show horizontal scrollbar |
| x | number | No | Initial X position (ImGuiCond_Once by default) |
| y | number | No | Initial Y position (requires x) |
| width | number | No | Initial width |
| height | number | No | Initial height |
| forcePosition | boolean | No | Force position every frame (ImGuiCond_Always) |
| forceSize | boolean | No | Force size every frame (ImGuiCond_Always) |
| minWidth | number | No | Minimum width constraint |
| minHeight | number | No | Minimum height constraint |
| maxWidth | number | No | Maximum width constraint |
| maxHeight | number | No | Maximum height constraint |
| bgAlpha | number | No | Background alpha (0.0-1.0) |
| noViewport | boolean | No | Pin to main viewport (prevent floating) |
| viewportAlwaysOnTop | boolean | No | Float viewport always on top |
| style | Style | No | Layout and appearance styles |

```tsx
<Window title="My Window" x={100} y={200} width={400} height={300}
        minWidth={200} maxWidth={800} bgAlpha={0.9}>
  <Text>Positioned and constrained window</Text>
</Window>
```

---

#### View

A generic container for grouping children. Does not render any visible UI on its own.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Layout and appearance styles |

```tsx
<View style={{ padding: 8, backgroundColor: [0.2, 0.2, 0.2, 1.0] }}>
  <Text>Styled container</Text>
</View>
```

---

#### Row

Horizontal layout container. Children are placed side by side.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| gap | number | No | Horizontal spacing between children (pixels) |
| style | Style | No | Layout and appearance styles |

```tsx
<Row gap={8}>
  <Button title="OK" onPress={() => {}} />
  <Button title="Cancel" onPress={() => {}} />
</Row>
```

---

#### Column

Vertical layout container. Children are stacked top to bottom.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| gap | number | No | Vertical spacing between children (pixels) |
| style | Style | No | Layout and appearance styles |

```tsx
<Column gap={4}>
  <Text>Line 1</Text>
  <Text>Line 2</Text>
  <Text>Line 3</Text>
</Column>
```

---

#### Indent

Temporarily indents all child items by the given width. Use this for inspector-style nesting, callouts, and manual alignment that should still participate in normal layout flow.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| width | number | No | Indentation width in pixels. Defaults to ImGui's current indent spacing |

```tsx
<Indent width={20}>
  <Text>Indented content</Text>
</Indent>
```

---

#### TextWrap

Pushes a text wrap boundary for child text widgets. The width is relative to the current cursor position.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| width | number | Yes | Wrap boundary in pixels from the current cursor position |

```tsx
<TextWrap width={240}>
  <Text>This paragraph wraps within a 240px boundary.</Text>
</TextWrap>
```

---

### Navigation

#### MainMenuBar

Application-wide full-screen menu bar. Use this at the top level when you want Dear ImGui's main menu strip rather than a menu bar scoped to a window.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | | | |

```tsx
<MainMenuBar>
  <Menu label="File">
    <MenuItem label="Open" shortcut="Ctrl+O" />
  </Menu>
</MainMenuBar>
```

> **Note:** Prefer `MainMenuBar` for app-level menus. Use `MenuBar` inside a `Window` or `Child` for local chrome.

---

#### MenuBar

Window-local menu bar. Must contain `Menu` children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | | | |

```tsx
<MenuBar>
  <Menu label="File">
    <MenuItem label="New" shortcut="Ctrl+N" />
    <MenuItem label="Exit" onPress={() => {}} />
  </Menu>
</MenuBar>
```

> **Note:** Use `MenuBar` inside a `Window` or `Child`. For an application-level menu strip, use `MainMenuBar`.

---

#### Menu

A dropdown menu inside a MenuBar. Contains MenuItem or Separator children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Menu label displayed in the menu bar |

```tsx
<Menu label="Edit">
  <MenuItem label="Undo" shortcut="Ctrl+Z" />
  <MenuItem label="Redo" shortcut="Ctrl+Y" />
</Menu>
```

---

#### MenuItem

A clickable item inside a Menu.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Text displayed for the menu item |
| onPress | () => void | No | Callback when clicked |
| shortcut | string | No | Shortcut text displayed on the right (display only) |

```tsx
<MenuItem label="Save" shortcut="Ctrl+S" onPress={() => setSaved(true)} />
```

> **Note:** `MenuItem.shortcut` only renders the shortcut label. Use `<Shortcut keys="Ctrl+S" onPress={...} />` when you need actual keyboard handling.

---

#### Shortcut

Global keyboard chord handler. Wraps ImGui's key-chord detection and runs its callback when the chord is pressed.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| keys | string | Yes | Chord string such as `"Ctrl+S"` or `"Ctrl+Shift+P"` |
| onPress | () => void | Yes | Callback when the chord is pressed |

```tsx
<Shortcut keys="Ctrl+S" onPress={props.onSave} />
<Shortcut keys="Ctrl+F" onPress={() => setFocusSearch(true)} />
```

---

#### TabBar

A tab bar container. Must contain `TabItem` children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Layout and appearance styles |

```tsx
<TabBar>
  <TabItem label="General"><Text>General settings</Text></TabItem>
  <TabItem label="Advanced"><Text>Advanced settings</Text></TabItem>
</TabBar>
```

---

#### TabItem

A single tab inside a TabBar. Content is shown when the tab is selected.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Tab label text |

```tsx
<TabItem label="Details">
  <Column gap={4}>
    <Text>Name: Widget</Text>
    <Text>Version: 1.0</Text>
  </Column>
</TabItem>
```

---

### Data

#### Table

A table with named columns. Must contain `TableRow` children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| columns | `(string \| TableColumn)[]` | Yes | Column labels or column config objects |
| sortable | boolean | No | Enables ImGui table sorting |
| onSort | `(specs) => void` | No | Called when ImGui marks sort specs dirty |
| hideable | boolean | No | Allows users to hide columns from the header menu |
| multiSortable | boolean | No | Allows multi-column sorting |
| noClip | boolean | No | Disables per-column clipping |
| padOuterX | boolean | No | Adds outer horizontal cell padding |
| scrollX | boolean | No | Enables horizontal scrolling |
| scrollY | boolean | No | Enables vertical scrolling |
| noBorders | boolean | No | Disables table borders |
| noRowBg | boolean | No | Disables alternating row backgrounds |
| style | Style | No | Layout and appearance styles |

```tsx
<Table
  columns={[
    { label: "Name", fixedWidth: true, preferSortAscending: true },
    { label: "Status", noResize: true },
    "Owner"
  ]}
  sortable
  hideable
  multiSortable
  onSort={props.onSortLogs}
>
  <TableRow>
    <Text>Task 1</Text>
    <TableCell bgColor={[0.2, 0.3, 0.4, 1.0]}>
      <Text>Done</Text>
    </TableCell>
    <Text>Editor Team</Text>
  </TableRow>
  <TableRow bgColor={[0.12, 0.16, 0.20, 1.0]}>
    <TableCell columnIndex={0}>
      <Text>Task 2</Text>
    </TableCell>
    <TableCell columnIndex={2}>
      <Text>Manual column jump</Text>
    </TableCell>
    <TableCell columnIndex={1}>
      <Text>Pending</Text>
    </TableCell>
  </TableRow>
</Table>
```

> **Note:** Direct `TableRow` children still fill columns left-to-right. Use `TableCell` when you need explicit `columnIndex` jumps or per-cell background colors.

---

#### TableRow

A single row inside a Table. Children map to columns left to right.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| bgColor | `[number, number, number, number]` | No | Uses `TableSetBgColor` for the row |

```tsx
<TableRow bgColor={[0.14, 0.18, 0.22, 1.0]}>
  <Text>Cell 1</Text>
  <Text>Cell 2</Text>
  <Button title="Action" onPress={() => {}} />
</TableRow>
```

---

#### TableCell

An explicit table cell container. Use it when you need per-cell coloring or to jump to a specific column index.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| columnIndex | number | No | Jumps to a specific table column before rendering children |
| bgColor | `[number, number, number, number]` | No | Uses `TableSetBgColor` for the cell |

```tsx
<TableCell columnIndex={2} bgColor={[0.22, 0.20, 0.16, 1.0]}>
  <Text>Escalated</Text>
</TableCell>
```

---

#### TreeNode

A collapsible tree node. Children are shown when the node is expanded by the user.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Node label text |
| defaultOpen | boolean | No | Starts open and also seeds `SetNextItemOpen(..., ImGuiCond_Once)` |
| forceOpen | boolean | No | Forces open/closed state each frame with `SetNextItemOpen(..., ImGuiCond_Always)` |
| openOnArrow | boolean | No | Requires arrow click to open |
| openOnDoubleClick | boolean | No | Allows double-click to open |
| leaf | boolean | No | Marks the node as a leaf |
| bullet | boolean | No | Renders the node as a bullet |
| noTreePushOnOpen | boolean | No | Skips the implicit tree push/pop pair |

```tsx
<TreeNode label="Root" defaultOpen forceOpen={showTree} openOnArrow openOnDoubleClick>
  <TreeNode label="Child A" defaultOpen>
    <Text>Leaf 1</Text>
  </TreeNode>
  <TreeNode label="Child B" leaf bullet noTreePushOnOpen />
</TreeNode>
```

---

#### CollapsingHeader

A collapsible section with a header. Similar to TreeNode but styled as a full-width header.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Header label text |
| defaultOpen | boolean | No | Seeds `SetNextItemOpen(..., ImGuiCond_Once)` and sets the default-open flag |
| forceOpen | boolean | No | Forces open/closed state each frame |
| closable | boolean | No | Shows ImGui's close button |
| onClose | `() => void` | No | Called when the close button hides the header |

```tsx
<CollapsingHeader label="Settings" defaultOpen closable onClose={props.onHideSettings}>
  <SliderFloat label="Volume" value={vol} onChange={setVol} min={0} max={1} />
  <Checkbox value={muted} onChange={setMuted} label="Mute" />
</CollapsingHeader>
```

---

### Text & Display

#### Text

Displays text content. Text content is passed as children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Layout and appearance styles |

```tsx
<Text>Hello, world!</Text>
<Text style={{ textColor: [1, 0, 0, 1] }}>Red text</Text>
```

---

#### Separator

A horizontal line separator. Takes no props.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | | | |

```tsx
<Text>Above</Text>
<Separator />
<Text>Below</Text>
```

---

#### Spacing

Inserts one standard vertical item-spacing gap.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | | | |

```tsx
<Text>Above</Text>
<Spacing />
<Text>Below</Text>
```

---

#### Dummy

Invisible placeholder item with an explicit size. Useful for reserving space in manual layouts.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| width | number | Yes | Placeholder width in pixels |
| height | number | Yes | Placeholder height in pixels |

```tsx
<Text>Left</Text>
<SameLine spacing={8} />
<Dummy width={24} height={0} />
<SameLine spacing={8} />
<Text>Right</Text>
```

---

#### SameLine

Places the next item on the same row with optional offset and spacing control. This complements `Row` when you need explicit per-item inline flow.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| offset | number | No | X offset from the start of the line |
| spacing | number | No | Spacing from the previous item. Defaults to ImGui spacing |

```tsx
<Button title="Apply" onPress={save} />
<SameLine spacing={8} />
<Button title="Cancel" onPress={close} />
```

---

#### NewLine

Forces a line break in the current layout flow.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | | | |

```tsx
<Text>Inline</Text>
<SameLine />
<Text>content</Text>
<NewLine />
<Text>Next row</Text>
```

---

#### Cursor

Moves the cursor for the next item inside the current window or child region. Coordinates are relative to the current content origin.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| x | number | Yes | Cursor X position in pixels |
| y | number | Yes | Cursor Y position in pixels |

```tsx
<Child id="overlay" width={280} height={160} border>
  <Cursor x={96} y={52} />
  <Button title="Placed" onPress={() => {}} />
</Child>
```

---

#### ProgressBar

A horizontal progress bar.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| value | number | Yes | Progress fraction from 0.0 to 1.0 |
| overlay | string | No | Text displayed on top of the bar |
| style | Style | No | Layout and appearance styles |

```tsx
<ProgressBar value={0.65} />
<ProgressBar value={progress} overlay="Loading..." />
```

---

#### Tooltip

Displays a tooltip. Typically shown when the previous item is hovered.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Tooltip text content |

```tsx
<Button title="Hover me" onPress={() => {}} />
<Tooltip text="This button does something" />
```

---

### Inputs

> **Note:** Phase 14 adds an explicit top-level `width` prop to input-like widgets. This maps to ImGui's per-item width handling and works alongside `style`.
>
> **Phase 16 shared interaction props:** interactive widgets also accept `tooltip`, `autoFocus`, `scrollToHere`, `cursor`, `onHover`, `onActive`, `onFocused`, `onClicked`, and `onDoubleClicked`. These are evaluated against ImGui's "last item" model, so they apply to the widget that just rendered.

#### Button

A clickable button.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Button label text |
| onPress | () => void | Yes | Callback when clicked |
| disabled | boolean | No | Whether the button is grayed out and non-interactive |
| style | Style | No | Layout and appearance styles |

```tsx
const [count, setCount] = useState(0);
<Button title="Click me" onPress={() => setCount(count + 1)} />
<Button title="Disabled" onPress={() => {}} disabled={true} />
```

---

#### TextInput

A single-line text input field.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| value | string | Yes | Current text value (bound to state) |
| onChange | (v: string) => void | Yes | Called with the new text when the user types |
| label | string | No | Label displayed next to the input |
| placeholder | string | No | Placeholder text when empty |
| width | number | No | Per-item width in pixels |
| style | Style | No | Layout and appearance styles |

```tsx
const [name, setName] = useState("");
<TextInput value={name} onChange={setName} label="Name" placeholder="Enter name" width={220} />
```

---

#### Checkbox

A boolean checkbox.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| value | boolean | Yes | Current checked state (bound to state) |
| onChange | (v: boolean) => void | Yes | Called with the new value when toggled |
| label | string | No | Label displayed next to the checkbox |
| style | Style | No | Layout and appearance styles |

```tsx
const [enabled, setEnabled] = useState(false);
<Checkbox value={enabled} onChange={setEnabled} label="Enable feature" />
```

---

#### SliderFloat

A floating-point slider with min/max range.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the slider |
| value | number | Yes | Current value (bound to state) |
| onChange | (v: number) => void | Yes | Called with the new value when dragged |
| min | number | Yes | Minimum slider value |
| max | number | Yes | Maximum slider value |
| width | number | No | Per-item width in pixels |
| style | Style | No | Layout and appearance styles |

```tsx
const [speed, setSpeed] = useState(5.0);
<SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} width={180} />
```

---

#### SliderInt

An integer slider with min/max range.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the slider |
| value | number | Yes | Current integer value (bound to state) |
| onChange | (v: number) => void | Yes | Called with the new value when dragged |
| min | number | Yes | Minimum slider value |
| max | number | Yes | Maximum slider value |
| style | Style | No | Layout and appearance styles |

```tsx
const [count, setCount] = useState(3);
<SliderInt label="Count" value={count} onChange={setCount} min={0} max={10} />
```

---

#### DragFloat

A floating-point drag input. User drags to change the value.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the input |
| value | number | Yes | Current value (bound to state) |
| onChange | (v: number) => void | Yes | Called with the new value when dragged |
| speed | number | No | Drag speed multiplier (default: 1.0) |
| style | Style | No | Layout and appearance styles |

```tsx
const [posX, setPosX] = useState(0.0);
<DragFloat label="X" value={posX} onChange={setPosX} speed={0.1} />
```

---

#### DragInt

An integer drag input. User drags to change the value.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the input |
| value | number | Yes | Current integer value (bound to state) |
| onChange | (v: number) => void | Yes | Called with the new value when dragged |
| speed | number | No | Drag speed multiplier (default: 1.0) |
| style | Style | No | Layout and appearance styles |

```tsx
const [offset, setOffset] = useState(0);
<DragInt label="Offset" value={offset} onChange={setOffset} speed={1} />
```

---

#### InputInt

A numeric text input for integers.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the input |
| value | number | Yes | Current integer value (bound to state) |
| onChange | (v: number) => void | Yes | Called with the new value |
| style | Style | No | Layout and appearance styles |

```tsx
const [level, setLevel] = useState(1);
<InputInt label="Level" value={level} onChange={setLevel} />
```

---

#### InputFloat

A numeric text input for floating-point numbers.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the input |
| value | number | Yes | Current float value (bound to state) |
| onChange | (v: number) => void | Yes | Called with the new value |
| style | Style | No | Layout and appearance styles |

```tsx
const [weight, setWeight] = useState(9.8);
<InputFloat label="Weight" value={weight} onChange={setWeight} />
```

---

#### ColorEdit

A color picker with RGBA channels.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the color picker |
| value | number[] | Yes | RGBA color array, e.g. `[1.0, 0.5, 0.0, 1.0]` |
| onChange | (v: number[]) => void | Yes | Called with the new RGBA array |
| style | Style | No | Layout and appearance styles |

```tsx
const [color, setColor] = useState([1.0, 0.5, 0.0, 1.0]);
<ColorEdit label="Color" value={color} onChange={setColor} />
```

> **Note:** Color values are floats from 0.0 to 1.0 per channel: `[red, green, blue, alpha]`.

---

#### Combo

A dropdown select box. Supports two modes: simple (with `items` prop) and manual (with children).

**Simple mode** (items list):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the dropdown |
| value | number | Yes | Index of the currently selected item (0-based) |
| onChange | (v: number) => void | No | Called with the new selected index |
| items | string[] | Yes | Array of option labels |
| width | number | No | Widget width |
| style | Style | No | Layout and appearance styles |

```tsx
const [mode, setMode] = useState(0);
<Combo label="Mode" value={mode} onChange={setMode} items={["Easy", "Medium", "Hard"]} />
```

**Manual mode** (Begin/End with children):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the dropdown |
| preview | string | No | Preview text shown when combo is closed |
| noArrowButton | boolean | No | Hide the arrow button |
| noPreview | boolean | No | Hide the preview text |
| heightSmall | boolean | No | Small dropdown height |
| heightLarge | boolean | No | Large dropdown height |
| heightRegular | boolean | No | Regular dropdown height |
| width | number | No | Widget width |
| style | Style | No | Layout and appearance styles |

```tsx
const [idx, setIdx] = useState(0);
<Combo label="Pick" preview="Select one">
  <Selectable label="Apple" selected={idx === 0} onSelect={() => setIdx(0)} />
  <Selectable label="Banana" selected={idx === 1} onSelect={() => setIdx(1)} />
</Combo>
```

---

#### ListBox

A scrollable list selection box.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the list |
| value | number | Yes | Index of the currently selected item (0-based) |
| onChange | (v: number) => void | Yes | Called with the new selected index |
| items | string[] | Yes | Array of option labels |
| style | Style | No | Layout and appearance styles |

```tsx
const [selected, setSelected] = useState(0);
<ListBox label="Items" value={selected} onChange={setSelected} items={["Apple", "Banana", "Cherry"]} />
```

---

#### Radio

A radio button for single-selection from multiple options.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Radio button label text |
| value | number | Yes | Current selected index (bound to state) |
| index | number | Yes | The index this radio button represents |
| onChange | (v: number) => void | No | Called with the new index when selected |
| style | Style | No | Layout and appearance styles |

```tsx
const [size, setSize] = useState(0);
<Radio label="Small" value={size} index={0} onChange={setSize} />
<Radio label="Large" value={size} index={1} onChange={setSize} />
```

> **Note:** Use multiple Radio buttons with the same `value` prop and different `index` values to create a radio group.

---

#### Selectable

A clickable item that can be selected or deselected.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Selectable item label text |
| selected | boolean | No | Whether the item is currently selected |
| onSelect | () => void | No | Called when the item is clicked |
| selectionIndex | number | No | Selection index for use inside `<MultiSelect>` |
| style | Style | No | Layout and appearance styles |

```tsx
const [selected, setSelected] = useState(0);
<Selectable label="Option A" selected={selected === 0} onSelect={() => setSelected(0)} />
<Selectable label="Option B" selected={selected === 1} onSelect={() => setSelected(1)} />
```

---

#### MultiSelect

A container for multi-selection patterns. Wraps `BeginMultiSelect`/`EndMultiSelect`. Children (typically `<Selectable>`) participate in range/batch selection. Selection state lives in the C++ struct.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| singleSelect | boolean | No | Restrict to single selection |
| noSelectAll | boolean | No | Disable Ctrl+A select all |
| noRangeSelect | boolean | No | Disable Shift+click range select |
| noAutoSelect | boolean | No | Disable auto-select on focus |
| noAutoClear | boolean | No | Disable auto-clear on click |
| selectionSize | number | No | Current number of selected items |
| itemsCount | number | No | Total item count |
| onSelectionChange | callback | No | Receives `ImGuiMultiSelectIO*` for processing selection requests |

```tsx
<MultiSelect selectionSize={selectedCount} itemsCount={items.length}
             onSelectionChange={(io) => applySelection(io)}>
  {items.map((item, i) => (
    <Selectable label={item.name} selected={item.selected} selectionIndex={i} />
  ))}
</MultiSelect>
```

> **Note:** The `onSelectionChange` callback receives the ImGui multi-select IO pointer. The C++ struct is responsible for processing selection requests (clear all, select range, etc.).

---

#### InputTextMultiline

A multi-line text editor for editing larger text content.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed above the text editor |
| value | string | Yes | Current text value (bound to state) |
| width | number | No | Per-item width in pixels |
| style | Style | No | Layout and appearance styles (use `height` to control editor height) |

```tsx
const [notes, setNotes] = useState("");
<InputTextMultiline label="Notes" value={notes} onChange={setNotes} width={400} style={{ height: 200 }} />
```

> **Note:** Unlike TextInput, this component renders as a multi-line editor. Use the `width` prop for per-item width and `style.height` for the editor height.

---

#### ColorPicker

A full color picker widget for selecting RGBA colors.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the color picker |
| value | number[] | Yes | RGBA color array `[r, g, b, a]`, floats 0.0-1.0 (bound to state) |
| style | Style | No | Layout and appearance styles |

```tsx
const [bgColor, setBgColor] = useState([0.2, 0.4, 0.8, 1.0]);
<ColorPicker label="Background" value={bgColor} onChange={setBgColor} />
```

> **Note:** ColorPicker is a full-featured color picker unlike ColorEdit. Color values are floats from 0.0 to 1.0 per channel.

---

#### PlotLines

A simple line graph for visualizing numeric data.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed above the graph |
| values | number[] | Yes | Array of numeric values to plot |
| overlay | string | No | Text overlay (e.g., "avg: 60") |
| style | Style | No | Layout and appearance styles (width/height set graph size) |

```tsx
const [fps, setFps] = useState([60, 58, 62, 61, 59]);
<PlotLines label="FPS" values={fps} overlay="avg: 60" style={{ width: 200, height: 80 }} />
```

---

#### PlotHistogram

A histogram for displaying data distribution.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed above the histogram |
| values | number[] | Yes | Array of numeric values to display as bars |
| overlay | string | No | Text overlay (e.g., "total: 11") |
| style | Style | No | Layout and appearance styles (width/height set histogram size) |

```tsx
const [distribution, setDistribution] = useState([1, 3, 5, 2]);
<PlotHistogram label="Distribution" values={distribution} style={{ width: 200, height: 80 }} />
```

---

#### BulletText

A text item prefixed with a bullet point.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Layout and appearance styles |
| children | text | Yes | The text content to display with a bullet |

```tsx
<BulletText>This is a bullet point</BulletText>
<BulletText>Another item in the list</BulletText>
```

---

#### LabelText

A label paired with a text value display.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | The label text |
| value | string | Yes | The value text to display |

```tsx
<LabelText label="Name" value="John Doe" />
<LabelText label="Status" value="Active" />
```

---

### Overlay

#### ContextMenu

Context-menu popup container. By default it attaches to the previous item; set `target="window"` to attach to the current window instead.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| id | string | No | Optional popup ID override |
| target | `"item" \| "window"` | No | Context target. Defaults to `"item"` |
| mouseButton | `"left" \| "right" \| "middle"` | No | Which mouse button triggers the menu. Defaults to `"right"` |

```tsx
<Button title="Actions" onPress={() => {}} />
<ContextMenu id="item-actions">
  <MenuItem label="Rename" onPress={renameItem} />
  <MenuItem label="Delete" onPress={deleteItem} />
</ContextMenu>

<ContextMenu id="window-actions" target="window">
  <MenuItem label="Reset Layout" onPress={resetLayout} />
</ContextMenu>
```

---

#### Modal

A blocking modal dialog window. Shows on top of other content and blocks interaction with the main window.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Modal window title displayed in the title bar |
| open | boolean | No | Whether the modal is currently visible |
| onClose | () => void | No | Called when the modal is closed (e.g., by clicking the close button) |
| noTitleBar | boolean | No | Hide the title bar |
| noResize | boolean | No | Prevent resizing |
| noMove | boolean | No | Prevent moving |
| noScrollbar | boolean | No | Hide scrollbar |
| noCollapse | boolean | No | Prevent collapsing |
| alwaysAutoResize | boolean | No | Auto-resize to fit content |
| noBackground | boolean | No | Transparent background |
| horizontalScrollbar | boolean | No | Show horizontal scrollbar |
| style | Style | No | Layout and appearance styles |
| children | | Yes | Modal content |

```tsx
const [show, setShow] = useState(false);
<Modal title="Confirm?" open={show} onClose={() => setShow(false)}>
  <Text>Are you sure?</Text>
  <Row gap={8}>
    <Button title="Yes" onPress={() => handleConfirm()} />
    <Button title="Cancel" onPress={() => setShow(false)} />
  </Row>
</Modal>
```

> **Note:** Modal is useful for confirmation dialogs and important notifications. Use the `open` prop to control visibility and `onClose` to handle dismissal.

---

#### Image

Display an image from a file path or embedded in the executable.

##### File Loading (Runtime)

```tsx
<Image src="logo.png" width={200} height={100} />
```

The image is loaded from disk on first render and cached. If `width`/`height` are omitted, the image's natural dimensions are used.

##### Embedded (Compile-Time)

```tsx
<Image src="logo.png" embed width={200} height={100} />
```

The compiler reads the image file and bakes it into the binary as a byte array. A `.embed.h` header is generated alongside the `.gen.cpp`. The header is only regenerated when the image file changes (mtime check).

##### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | yes | Path to image file (relative to .tsx source) |
| `embed` | `boolean` | no | Embed image data in binary |
| `width` | `number` | no | Display width (default: natural width) |
| `height` | `number` | no | Display height (default: natural height) |

Supported formats: PNG, JPEG.

---

#### Popup

A popup/modal window. Shown when opened programmatically.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | Unique popup identifier |
| style | Style | No | Layout and appearance styles |

```tsx
<Popup id="confirm-dialog">
  <Text>Are you sure?</Text>
  <Row gap={8}>
    <Button title="Yes" onPress={() => {}} />
    <Button title="No" onPress={() => {}} />
  </Row>
</Popup>
```

---

### Styling

#### Theme

Applies a color theme to all children. Supports built-in presets (`"dark"`, `"light"`, `"classic"`) and custom registered themes.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| preset | string | Yes | Theme name: `"dark"`, `"light"`, `"classic"`, or a custom registered name |
| accentColor | [r,g,b,a] | No | Interactive elements (buttons, headers, tabs, sliders, grips, checkmarks, plots) |
| backgroundColor | [r,g,b,a] | No | All background surfaces (window, child, popup, menubar, scrollbar) |
| textColor | [r,g,b,a] | No | Text and disabled text |
| borderColor | [r,g,b,a] | No | Borders, separators, table lines, tree lines |
| surfaceColor | [r,g,b,a] | No | Title bars, table rows, nav highlights |
| rounding | number | No | Corner rounding for frames, windows, tabs, popups |
| borderSize | number | No | Border thickness for frames and windows |
| spacing | number | No | Item spacing |

Each color prop derives normal/hovered/active/dimmed variants automatically. 5 props control all 55 ImGui color slots.

```tsx
<Theme preset="dark"
  accentColor={[0.9, 0.2, 0.2, 1.0]}
  backgroundColor={[0.12, 0.12, 0.15, 1.0]}
  textColor={[0.95, 0.95, 0.95, 1.0]}
  borderColor={[0.3, 0.3, 0.35, 1.0]}
  surfaceColor={[0.18, 0.18, 0.22, 1.0]}
  rounding={6}
>
  <DockSpace>
    <Window title="Themed"><Text>Fully themed</Text></Window>
  </DockSpace>
</Theme>
```

---

#### StyleColor

Pushes individual ImGui color overrides for all children. Only set props are pushed; unset props inherit from the current style.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| text | [r,g,b,a] | No | Text color |
| textDisabled | [r,g,b,a] | No | Disabled text color |
| windowBg | [r,g,b,a] | No | Window background |
| frameBg | [r,g,b,a] | No | Frame background (inputs, sliders) |
| frameBgHovered | [r,g,b,a] | No | Frame background on hover |
| frameBgActive | [r,g,b,a] | No | Frame background when active |
| titleBg | [r,g,b,a] | No | Title bar background |
| titleBgActive | [r,g,b,a] | No | Title bar background when focused |
| button | [r,g,b,a] | No | Button color |
| buttonHovered | [r,g,b,a] | No | Button color on hover |
| buttonActive | [r,g,b,a] | No | Button color when clicked |
| header | [r,g,b,a] | No | Header color (collapsing headers, tree nodes) |
| headerHovered | [r,g,b,a] | No | Header color on hover |
| headerActive | [r,g,b,a] | No | Header color when active |
| separator | [r,g,b,a] | No | Separator line color |
| checkMark | [r,g,b,a] | No | Checkbox check mark color |
| sliderGrab | [r,g,b,a] | No | Slider grab color |
| border | [r,g,b,a] | No | Border color |
| popupBg | [r,g,b,a] | No | Popup background color |
| tab | [r,g,b,a] | No | Tab color |

```tsx
<StyleColor button={[1, 0, 0, 1]} buttonHovered={[1, 0.3, 0.3, 1]} buttonActive={[0.8, 0, 0, 1]}>
  <Button title="Red Button" onPress={() => {}} />
</StyleColor>
```

---

#### StyleVar

Pushes individual ImGui style variable overrides for all children. Accepts float scalars and `[x, y]` vec2 pairs.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| alpha | number | No | Global alpha |
| windowPadding | [x, y] | No | Window content padding |
| windowRounding | number | No | Window corner rounding |
| framePadding | [x, y] | No | Frame padding (inputs, buttons) |
| frameRounding | number | No | Frame corner rounding |
| frameBorderSize | number | No | Frame border thickness |
| itemSpacing | [x, y] | No | Spacing between items |
| itemInnerSpacing | [x, y] | No | Spacing within a composed item |
| indentSpacing | number | No | Horizontal indent for tree nodes |
| cellPadding | [x, y] | No | Table cell padding |
| tabRounding | number | No | Tab corner rounding |

```tsx
<StyleVar frameRounding={8} framePadding={[12, 6]}>
  <Button title="Rounded" onPress={() => {}} />
</StyleVar>
```

---

### Scoping

#### Group

Groups children into a single item for alignment and bounding. Maps to `ImGui::BeginGroup()` / `EndGroup()`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Reserved for future use |

```tsx
<Group>
  <Text>Name:</Text>
  <TextInput value={name} label="##name" />
</Group>
```

---

#### ID

Pushes an explicit ImGui ID scope around children. Useful when you have duplicate labels in different contexts.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| scope | string \| number | Yes | The ID to push |

```tsx
<ID scope="player1">
  <SliderFloat label="HP" value={hp1} min={0} max={100} />
</ID>
<ID scope="player2">
  <SliderFloat label="HP" value={hp2} min={0} max={100} />
</ID>
```

---

#### Disabled

Grays out and disables interaction for all children. Maps to `ImGui::BeginDisabled()` / `EndDisabled()`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| disabled | boolean | No | Whether to disable (default: true) |

```tsx
<Disabled>
  <Button title="Can't click" onPress={() => {}} />
  <Text>This section is disabled</Text>
</Disabled>
```

---

#### Child

A scrollable sub-region within a window. Maps to `ImGui::BeginChild()` / `EndChild()`.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| id | string | Yes | Unique child region identifier |
| width | number | No | Width in pixels (0 = fill available) |
| height | number | No | Height in pixels (0 = fill available) |
| border | boolean | No | Show border around the region |
| style | Style | No | Layout and appearance styles |

```tsx
<Child id="log" width={0} height={150} border>
  <Text>Line 1</Text>
  <Text>Line 2</Text>
  <Text>Line 3</Text>
</Child>
```

---

### Interaction

#### DragDropSource

Makes children draggable. Wraps children in a group and attaches a drag payload.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| type | string | Yes | Payload type identifier (must match target) |
| payload | number \| string | Yes | Data to transfer |

```tsx
<DragDropSource type="item" payload={item.id}>
  <Text>{item.name}</Text>
</DragDropSource>
```

---

#### DragDropTarget

Accepts drops from matching drag sources. The `onDrop` callback receives the payload.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| type | string | Yes | Accepted payload type (must match source) |
| onDrop | (payload) => void | Yes | Called with the payload when a matching drop occurs |

```tsx
<DragDropTarget type="item" onDrop={(id: number) => moveItem(id)}>
  <View style={{ minHeight: 50 }}>
    <Text>Drop here</Text>
  </View>
</DragDropTarget>
```

> **Note:** The callback parameter type annotation (e.g., `id: number`) determines the C++ cast type.

---

### Drawing

#### Canvas

A sized drawing region for custom graphics. Children must be draw primitives. All coordinates are relative to the canvas top-left (0,0).

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| width | number | Yes | Canvas width in pixels |
| height | number | Yes | Canvas height in pixels |
| style | Style | No | backgroundColor fills the canvas |

```tsx
<Canvas width={300} height={200} style={{ backgroundColor: [0.1, 0.1, 0.1, 1] }}>
  <DrawLine p1={[0, 0]} p2={[300, 200]} color={[1, 0, 0, 1]} thickness={2} />
  <DrawCircle center={[150, 100]} radius={40} color={[0, 0.5, 1, 1]} />
</Canvas>
```

---

#### DrawLine

Draws a line on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| p1 | [x, y] | Yes | Start point |
| p2 | [x, y] | Yes | End point |
| color | [r,g,b,a] | Yes | Line color |
| thickness | number | No | Line thickness (default: 1.0) |

---

#### DrawRect

Draws a rectangle on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| min | [x, y] | Yes | Top-left corner |
| max | [x, y] | Yes | Bottom-right corner |
| color | [r,g,b,a] | Yes | Rectangle color |
| filled | boolean | No | Fill vs stroke (default: false) |
| thickness | number | No | Stroke thickness (default: 1.0) |
| rounding | number | No | Corner rounding (default: 0.0) |

---

#### DrawCircle

Draws a circle on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| center | [x, y] | Yes | Center point |
| radius | number | Yes | Circle radius |
| color | [r,g,b,a] | Yes | Circle color |
| filled | boolean | No | Fill vs stroke (default: false) |
| thickness | number | No | Stroke thickness (default: 1.0) |

---

#### DrawText

Draws text at a position on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| pos | [x, y] | Yes | Text position |
| text | string | Yes | Text content |
| color | [r,g,b,a] | Yes | Text color |

---

#### DrawBezierCubic

Draws a cubic bezier curve on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| p1 | [x, y] | Yes | Start point |
| p2 | [x, y] | Yes | First control point |
| p3 | [x, y] | Yes | Second control point |
| p4 | [x, y] | Yes | End point |
| color | [r,g,b,a] | Yes | Curve color |
| thickness | number | No | Line thickness (default: 1.0) |
| segments | number | No | Segment count (default: 0 = auto) |

---

#### DrawBezierQuadratic

Draws a quadratic bezier curve on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| p1 | [x, y] | Yes | Start point |
| p2 | [x, y] | Yes | Control point |
| p3 | [x, y] | Yes | End point |
| color | [r,g,b,a] | Yes | Curve color |
| thickness | number | No | Line thickness (default: 1.0) |
| segments | number | No | Segment count (default: 0 = auto) |

---

#### DrawPolyline

Draws a multi-segment line on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| points | [x,y][] | Yes | Array of points |
| color | [r,g,b,a] | Yes | Line color |
| thickness | number | No | Line thickness (default: 1.0) |
| closed | boolean | No | Close the shape (default: false) |

---

#### DrawConvexPolyFilled

Draws a filled convex polygon on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| points | [x,y][] | Yes | Array of polygon vertices |
| color | [r,g,b,a] | Yes | Fill color |

---

#### DrawNgon / DrawNgonFilled

Draws a regular N-sided polygon (outline or filled) on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| center | [x, y] | Yes | Center point |
| radius | number | Yes | Polygon radius |
| color | [r,g,b,a] | Yes | Color |
| numSegments | number | Yes | Number of sides |
| thickness | number | No | Stroke thickness (DrawNgon only, default: 1.0) |

---

#### DrawTriangle

Draws a triangle (outline or filled) on the parent Canvas.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| p1 | [x, y] | Yes | First vertex |
| p2 | [x, y] | Yes | Second vertex |
| p3 | [x, y] | Yes | Third vertex |
| color | [r,g,b,a] | Yes | Color |
| filled | boolean | No | Fill vs stroke (default: false) |
| thickness | number | No | Stroke thickness (default: 1.0) |

---

### Font Loading

#### C++ API

```cpp
// Call before first frame, after ImGui context created
imx::FontOptions ui_font{};
ui_font.pixel_snap_h = true;
ui_font.oversample_h = 2;
ui_font.oversample_v = 2;
ui_font.rasterizer_multiply = 1.1f;

imx::load_font("inter-ui", "path/to/Inter-Regular.ttf", 16.0f, ui_font);
imx::load_font_embedded("icons", icon_data, icon_size, 14.0f);
imx::set_default_font("inter-ui");

ImFont* mono = imx::find_font("jetbrains-mono");
```

`load_font()` / `load_font_embedded()` return the loaded `ImFont*`. `set_default_font()` makes a previously loaded font the app-wide default, while `<Font>` in TSX is still the scoped per-subtree override.

#### Clipboard

IMX also exposes clipboard access through the native C++ API:

```cpp
std::string current = imx::clipboard_get();
imx::clipboard_set("Copied from IMX");
```

Use this from your C++ host code or registered native widgets when you need direct access to the platform clipboard.

#### Viewport Helpers

Query the main viewport geometry from C++ code (useful for responsive positioning):

```cpp
ImVec2 pos  = imx::renderer::get_main_viewport_pos();
ImVec2 size = imx::renderer::get_main_viewport_size();
ImVec2 work_pos  = imx::renderer::get_main_viewport_work_pos();   // excludes menu bar
ImVec2 work_size = imx::renderer::get_main_viewport_work_size();
```

#### FontOptions

| Field | Type | Default | Description |
|------|------|---------|-------------|
| pixel_snap_h | bool | `true` | Snap glyphs horizontally for crisper small text |
| oversample_h | int | `2` | Horizontal oversampling for atlas rasterization |
| oversample_v | int | `2` | Vertical oversampling for atlas rasterization |
| rasterizer_multiply | float | `1.0f` | Brightness/weight multiplier for glyph rasterization |
| merge_mode | bool | `false` | Merge glyphs into the previously added font |

#### Font Component (TSX)

Wraps children with the named font. Font must be loaded in C++ first.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Name of a loaded font |

```tsx
<Font name="custom">
  <Text>This uses the custom font</Text>
</Font>
```

> **Note:** For best results, load a dedicated UI font as the default app font in C++ and use `<Font>` for specialized regions such as code, logs, or diagnostics.

---

### Phase 13 Input Components

#### Vector Inputs

Multi-component value editors. Available for 2, 3, and 4 components in each family:

- **InputFloat2/3/4** — float input fields
- **InputInt2/3/4** — integer input fields
- **DragFloat2/3/4** — float drag inputs (+ `speed` prop)
- **DragInt2/3/4** — integer drag inputs (+ `speed` prop)
- **SliderFloat2/3/4** — float sliders (+ `min`, `max` props)
- **SliderInt2/3/4** — integer sliders (+ `min`, `max` props)

All take `label`, `value` (typed tuple), optional `onChange`, optional `width`, optional `style`. Struct binding works directly — arrays decay to pointers.

```tsx
<InputFloat3 label="Position" value={props.position} />
<DragFloat2 label="Size" value={props.size} speed={0.1} />
<SliderInt4 label="Margins" value={props.margins} min={0} max={100} />
```

---

#### Button Variants

| Component | Props | Description |
|-----------|-------|-------------|
| SmallButton | label, onPress | Compact button |
| ArrowButton | id, direction, onPress | Directional arrow (left/right/up/down) |
| InvisibleButton | id, width, height, onPress | Invisible hitbox |
| ImageButton | id, src, width?, height?, onPress | Clickable image |

---

#### Slider Variants

| Component | Props | Description |
|-----------|-------|-------------|
| VSliderFloat | label, value, onChange?, width, height, min, max, style? | Vertical float slider |
| VSliderInt | label, value, onChange?, width, height, min, max, style? | Vertical int slider |
| SliderAngle | label, value, onChange?, min?, max?, width?, style? | Angle slider (degrees) |

---

#### Color Variants

| Component | Props | Description |
|-----------|-------|-------------|
| ColorEdit3 | label, value, onChange?, width?, style? | RGB color editor (no alpha) |
| ColorPicker3 | label, value, onChange?, width?, style? | RGB color picker (no alpha) |

---

### Phase 14 Layout & Positioning

#### Manual Layout Primitives

| Component | Props | Description |
|-----------|-------|-------------|
| Indent | width?, children | Temporarily indents child items |
| TextWrap | width, children | Pushes a text wrap boundary relative to the current cursor |
| Spacing | *(none)* | Inserts one standard vertical spacing gap |
| Dummy | width, height | Invisible placeholder item |
| SameLine | offset?, spacing? | Places the next item inline with explicit positioning |
| NewLine | *(none)* | Forces a line break |
| Cursor | x, y | Moves the cursor for the next item |
| MainMenuBar | children | Application-wide full-screen menu bar |

#### Input Width

`TextInput`, scalar inputs, vector inputs, sliders, drags, combos, list boxes, `InputTextMultiline`, `ColorEdit3`, and `ColorPicker3` all accept a top-level `width` prop.

```tsx
<TextInput label="Alias" value={alias} onChange={setAlias} width={180} />
<InputFloat3 label="Position" value={position} width={220} />
<SliderAngle label="Heading" value={angle} onChange={setAngle} width={180} />
```

---

### Dock Configuration

#### DockLayout

Declares the initial dock layout for a DockSpace. Children are DockSplit and DockPanel nodes. The layout is applied once on first run and when `resetLayout()` is called.

```tsx
<DockLayout>
  <DockSplit direction="horizontal" size={0.3}>
    <DockPanel>Sidebar</DockPanel>
    <DockPanel>Main</DockPanel>
  </DockSplit>
</DockLayout>
```

---

#### DockSplit

Splits a dock region in a given direction. Used inside DockLayout.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| direction | string | Yes | `"horizontal"` or `"vertical"` |
| size | number | Yes | Fraction of the region for the first child (0.0-1.0) |

---

#### DockPanel

Assigns windows to a dock region by name. The string children are window titles.

```tsx
<DockPanel>Todos</DockPanel>
```

---

## State

### useState

IMX provides a `useState` hook with the same signature as React:

```tsx
const [value, setValue] = useState(initialValue);
```

**Supported types:**

| Type | Initial value example | Description |
|------|----------------------|-------------|
| number | `useState(0)` or `useState(5.0)` | Integer or float |
| string | `useState("")` | Text string |
| boolean | `useState(false)` | True/false |
| number[] | `useState([1.0, 0.5, 0.0, 1.0])` | Color array (for ColorEdit) |
| fixed tuples | `useState([0.0, 1.0])`, `useState([1.0, 2.0, 3.0])`, `useState([8, 16, 24, 32])` | Vector input/drag/slider state for 2/3/4-component widgets |

**How state works:**

- State persists across frames. The runtime holds state values and the UI re-renders each frame with the current state.
- The setter function (`setValue`) updates the state for the next frame.
- State is declared at the top of a component function, before the return statement.

**Example:**

```tsx
export default function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("World");
  const [visible, setVisible] = useState(true);

  return (
    <Window title="State Demo">
      <Text>Count: {count}</Text>
      <Button title="Increment" onPress={() => setCount(count + 1)} />
      <TextInput value={name} onChange={setName} label="Name" />
      <Checkbox value={visible} onChange={setVisible} label="Show" />
      {visible && <Text>Hello, {name}!</Text>}
    </Window>
  );
}
```

---

## Custom Components

You can define reusable components in separate `.tsx` files and import them.

### Defining a component

A custom component is an exported function that takes a typed props object and returns JSX:

```tsx
// TodoItem.tsx
export function TodoItem(props: { text: string, done: boolean, onToggle: () => void }) {
  return (
    <Row gap={8}>
      <Checkbox value={props.done} onChange={props.onToggle} />
      <Text>{props.text}</Text>
    </Row>
  );
}
```

### Using a custom component

Import the component and use it like any host component:

```tsx
// App.tsx
import { TodoItem } from './TodoItem';

export default function App() {
  const [done, setDone] = useState(false);

  return (
    <Window title="Todos">
      <TodoItem text="My task" done={done} onToggle={() => setDone(!done)} />
    </Window>
  );
}
```

Nested struct references can also flow into child components without losing direct binding:

```tsx
// App.tsx
import { TransformSection } from './TransformSection';

export default function App(props: AppState) {
  return <TransformSection value={props.transform} />;
}

// TransformSection.tsx
export function TransformSection(props: { value: TransformSettings }) {
  return <SliderFloat label="Speed" value={props.value.speed} min={0} max={100} />;
}
```

### Rules

- The component function must be `export`ed (named export).
- The root component (entry point) must use `export default`.
- Props types can be: `string`, `number`, `boolean`, or `() => void` (callback).
- Access props via `props.propName` (not destructuring).
- All `.tsx` files that are imported must be passed to the compiler together.

---

## Custom Native Widgets

Native widgets let you use existing C++ ImGui widgets from TSX. Unlike custom components (which are written in TSX), native widgets are C++ functions registered at runtime.

### Registering a Widget

In your `main.cpp`, register widgets before the render loop:

```cpp
#include <imx/renderer.h>

imx::register_widget("Knob", [](imx::WidgetArgs& args) {
    float v = args.get<float>("value");
    bool changed = MyKnob(
        args.label(),
        &v,
        args.get<float>("min"),
        args.get<float>("max"),
        ImVec2(args.get<float>("width", 80.0f), args.get<float>("height", 80.0f))
    );
    if (changed) args.call("onChange", v);
});
```

### WidgetArgs API

| Method | Description |
|--------|-------------|
| `label()` | Returns the widget's ImGui label/ID (`const char*`) |
| `get<T>(name)` | Get a prop value, returns `T{}` if missing |
| `get<T>(name, default)` | Get a prop value with default |
| `has(name)` | Check if a prop was provided |
| `set<T>(name, value)` | Set a prop value (used by generated code) |
| `set_callback(name, fn)` | Set a callback (used by generated code) |
| `call(name)` | Invoke a void callback |
| `call<T>(name, value)` | Invoke a callback with a value |

### Declaring Types

Add type declarations to your `imx.d.ts` so TypeScript checks props:

```typescript
interface KnobProps {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    width?: number;
    height?: number;
}
declare function Knob(props: KnobProps): any;
```

### Using in TSX

```tsx
function App() {
    const [volume, setVolume] = useState(0.5);
    return (
        <Window title="Mixer">
            <Knob value={volume} onChange={(v: number) => setVolume(v)} min={0} max={1} />
        </Window>
    );
}
```

## Custom Theme Presets

Register a custom theme function that applies ImGui styles:

```cpp
imx::register_theme("zynlab", []() {
    ImGuiStyle& style = ImGui::GetStyle();
    style.Colors[ImGuiCol_WindowBg] = ImVec4(0.1f, 0.1f, 0.1f, 1.0f);
    // ... set all your colors
});
```

Then use it in TSX:

```tsx
<Theme preset="zynlab" rounding={4}>
    {/* children use the custom theme */}
</Theme>
```

Override props (`accentColor`, `rounding`, etc.) still apply on top of your custom theme.

---

## C++ Struct Binding

Instead of using `useState` for all state, you can pass a C++ struct directly to the root component. Fields are read/written via pointers — no copies, no callbacks needed.

### Setup

1. Define your struct in a header file (e.g., `AppState.h`):

```cpp
// AppState.h
#pragma once
#include <vector>
#include <functional>

struct AppState {
    float speed = 5.0f;
    bool muted = false;
    std::vector<Item> items;
    float computed_result = 0.0f;
    std::function<void()> onConnect;
};
```

2. In `main.cpp`, include the header and pass the struct to `render_root`:

```cpp
#include "AppState.h"

AppState state;
state.onConnect = [&]() { client.connect(); };

// In your render loop:
imx::render_root(runtime, state);
```

3. In `App.tsx`, declare props with the struct name:

```tsx
export default function App(props: AppState) {
    return (
        <Window title="Controls">
            <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
            <Checkbox label="Muted" value={props.muted} />
            <Button title="Connect" onPress={props.onConnect} />
            <Text>Result: {props.computed_result}</Text>
        </Window>
    );
}
```

4. Declare the type in `imx.d.ts`:

```typescript
interface AppState {
    speed: number;
    muted: boolean;
    items: Item[];
    computed_result: number;
    onConnect: () => void;
}
```

### Binding Rules

| Pattern | Generated C++ |
|---------|--------------|
| `value={props.field}` without `onChange` | `&props.field` (direct pointer) |
| `value={props.field}` with `onChange` | Temp variable + callback (existing behavior) |
| `value={stateVar}` (useState) | `.get()`/`.set()` pattern (existing behavior) |
| `{props.field}` in Text | Read-only display |
| `onPress={props.callback}` | `props.callback()` invocation |
| `props.vec.map(...)` | `for` loop with `auto&` reference |

### Coexistence

Both `useState` (UI-only state) and struct binding work in the same component:

```tsx
export default function App(props: AppState) {
    const [showModal, setShowModal] = useState(false);
    return (
        <Window title="App">
            <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
            <Button title="Save" onPress={() => setShowModal(true)} />
            <Modal title="Confirm" open={showModal} onClose={() => setShowModal(false)}>
                <Text>Save changes?</Text>
            </Modal>
        </Window>
    );
}
```

### Limitations

- **ColorEdit/ColorPicker**: use `std::vector<float>` fields in C++. Direct pointer binding emits `.data()`.
- **DragDrop cross-component types**: payload type matching works within a single component file. If DragDropSource and DragDropTarget are in different component files, the type defaults to `float`.

### Thread Safety

Bound struct fields are accessed directly by ImGui on the render thread. If C++ code modifies bound fields from another thread, you must synchronize access (mutex, atomic, etc.). IMX does not add synchronization — same rules as raw ImGui.

---

## Styles

Styles are passed as an object to the `style` prop. They control layout sizing, spacing, and colors.

### Available properties

| Property | Type | Description |
|----------|------|-------------|
| padding | number | Padding on all sides (pixels) |
| paddingHorizontal | number | Left and right padding |
| paddingVertical | number | Top and bottom padding |
| gap | number | Spacing between children |
| width | number | Fixed width (pixels) |
| height | number | Fixed height (pixels) |
| minWidth | number | Minimum width |
| minHeight | number | Minimum height |
| backgroundColor | [number, number, number, number] | Background RGBA color (0.0-1.0 per channel) |
| textColor | [number, number, number, number] | Text RGBA color (0.0-1.0 per channel) |
| fontSize | number | Font size |

### Example

```tsx
<Column style={{ padding: 12, gap: 8, backgroundColor: [0.15, 0.15, 0.2, 1.0] }}>
  <Text style={{ textColor: [1.0, 0.8, 0.0, 1.0], fontSize: 18 }}>Title</Text>
  <View style={{ minHeight: 100, width: 300 }}>
    <Text>Content area</Text>
  </View>
</Column>
```

---

## Patterns

### Conditional rendering

Show or hide elements based on state:

```tsx
const [show, setShow] = useState(false);

{show && <Window title="Popup">
  <Text>Visible when show is true</Text>
</Window>}
```

### Ternary rendering

Choose between two elements:

```tsx
{enabled ? <Text>On</Text> : <Text>Off</Text>}
```

### Toggle pattern

Toggle a boolean state:

```tsx
const [open, setOpen] = useState(false);
<Button title="Toggle" onPress={() => setOpen(!open)} />
```

---

## Project Setup

### Directory structure

```
my-app/
  App.tsx                # Root component (export default)
  MyComponent.tsx        # Custom component (named export)
  imx.d.ts           # Type definitions (copy from examples/hello/)
  tsconfig.json          # TypeScript config (copy from examples/hello/)
  main.cpp               # Application entry point (copy from examples/hello/)
```

### tsconfig.json

```json
{
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
  "include": ["*.tsx", "imx.d.ts"]
}
```

### CMakeLists.txt — adding a new app

Add this to your project's CMakeLists.txt (after the imx library targets):

```cmake
# --- Code generation: .tsx -> .gen.cpp ---
set(IMX_GENERATED_DIR ${CMAKE_BINARY_DIR}/generated)
file(MAKE_DIRECTORY ${IMX_GENERATED_DIR})

add_custom_command(
    OUTPUT
        ${IMX_GENERATED_DIR}/App.gen.cpp
        ${IMX_GENERATED_DIR}/app_root.gen.cpp
        ${IMX_GENERATED_DIR}/MyComponent.gen.cpp
        ${IMX_GENERATED_DIR}/MyComponent.gen.h
    COMMAND node ${CMAKE_SOURCE_DIR}/compiler/dist/index.js
        ${CMAKE_SOURCE_DIR}/my-app/App.tsx
        ${CMAKE_SOURCE_DIR}/my-app/MyComponent.tsx
        -o ${IMX_GENERATED_DIR}
    DEPENDS
        ${CMAKE_SOURCE_DIR}/my-app/App.tsx
        ${CMAKE_SOURCE_DIR}/my-app/MyComponent.tsx
    COMMENT "Compiling .tsx -> C++"
)

add_executable(my_app
    my-app/main.cpp
    ${IMX_GENERATED_DIR}/App.gen.cpp
    ${IMX_GENERATED_DIR}/app_root.gen.cpp
    ${IMX_GENERATED_DIR}/MyComponent.gen.cpp
)
target_link_libraries(my_app PRIVATE imx_renderer)
target_include_directories(my_app PRIVATE ${IMX_GENERATED_DIR})
```

### Adding a new .tsx file

1. Create the `.tsx` file with an exported function component
2. Add its path to the compiler command in `add_custom_command`
3. Add the generated `.gen.cpp` (and `.gen.h` if it has props) to `OUTPUT` and to the `add_executable` source list
4. Add the source `.tsx` to `DEPENDS`

### Build commands

```bash
# First time: build the compiler
cd compiler && npm install && npm run build && cd ..

# Configure CMake
cmake -B build

# Build the app
cmake --build build

# Run
./build/hello_app    # or ./build/Debug/hello_app on Windows
```

