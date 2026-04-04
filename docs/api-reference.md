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
| style | Style | No | Layout and appearance styles |

```tsx
<Window title="My Window">
  <Text>Hello</Text>
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

### Navigation

#### MenuBar

Top-level menu bar. Must contain `Menu` children.

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

> **Note:** Place MenuBar as a direct child of DockSpace for an application-level menu bar.

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
| columns | string[] | Yes | Array of column header names |
| style | Style | No | Layout and appearance styles |

```tsx
<Table columns={["Name", "Status"]}>
  <TableRow>
    <Text>Task 1</Text>
    <Text>Done</Text>
  </TableRow>
  <TableRow>
    <Text>Task 2</Text>
    <Text>Pending</Text>
  </TableRow>
</Table>
```

> **Note:** Each TableRow should have the same number of children as there are columns. Each child fills one column cell.

---

#### TableRow

A single row inside a Table. Children map to columns left to right.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| *(none)* | | | |

```tsx
<TableRow>
  <Text>Cell 1</Text>
  <Text>Cell 2</Text>
  <Button title="Action" onPress={() => {}} />
</TableRow>
```

---

#### TreeNode

A collapsible tree node. Children are shown when the node is expanded by the user.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Node label text |

```tsx
<TreeNode label="Root">
  <TreeNode label="Child A">
    <Text>Leaf 1</Text>
  </TreeNode>
  <TreeNode label="Child B">
    <Text>Leaf 2</Text>
  </TreeNode>
</TreeNode>
```

---

#### CollapsingHeader

A collapsible section with a header. Similar to TreeNode but styled as a full-width header.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Header label text |

```tsx
<CollapsingHeader label="Settings">
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
| style | Style | No | Layout and appearance styles |

```tsx
const [name, setName] = useState("");
<TextInput value={name} onChange={setName} label="Name" placeholder="Enter name" />
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
| style | Style | No | Layout and appearance styles |

```tsx
const [speed, setSpeed] = useState(5.0);
<SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
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

A dropdown select box.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed next to the dropdown |
| value | number | Yes | Index of the currently selected item (0-based) |
| onChange | (v: number) => void | Yes | Called with the new selected index |
| items | string[] | Yes | Array of option labels |
| style | Style | No | Layout and appearance styles |

```tsx
const [mode, setMode] = useState(0);
<Combo label="Mode" value={mode} onChange={setMode} items={["Easy", "Medium", "Hard"]} />
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
| style | Style | No | Layout and appearance styles |

```tsx
const [selected, setSelected] = useState(0);
<Selectable label="Option A" selected={selected === 0} onSelect={() => setSelected(0)} />
<Selectable label="Option B" selected={selected === 1} onSelect={() => setSelected(1)} />
```

---

#### InputTextMultiline

A multi-line text editor for editing larger text content.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Label displayed above the text editor |
| value | string | Yes | Current text value (bound to state) |
| style | Style | No | Layout and appearance styles (width/height control size) |

```tsx
const [notes, setNotes] = useState("");
<InputTextMultiline label="Notes" value={notes} onChange={setNotes} style={{ width: 400, height: 200 }} />
```

> **Note:** Unlike TextInput, this component renders as a multi-line editor. Use `width` and `height` in styles to control the editor dimensions.

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

#### Modal

A blocking modal dialog window. Shows on top of other content and blocks interaction with the main window.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| title | string | Yes | Modal window title displayed in the title bar |
| open | boolean | No | Whether the modal is currently visible |
| onClose | () => void | No | Called when the modal is closed (e.g., by clicking the close button) |
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
