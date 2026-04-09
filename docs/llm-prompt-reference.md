# IMX LLM Prompt Reference

IMX: write .tsx with JSX components and useState hooks. Compiles to native Dear ImGui C++ apps.
Compile: `node compiler/dist/index.js App.tsx [Other.tsx ...] -o build/generated`

## Components

### Layout
```
DockSpace: style?(Style) | children — top-level docking container
Window: title(string, required) | style?(Style) | children — ImGui window with title bar
View: style?(Style) | children — generic container
Row: gap?(number) | style?(Style) | children — horizontal layout
Column: gap?(number) | style?(Style) | children — vertical layout
```

### Navigation
```
MenuBar: children — top-level menu bar
Menu: label(string, required) | children — dropdown menu
MenuItem: label(string, required) | onPress?(() => void) | shortcut?(string) — menu action
TabBar: style?(Style) | children — tab container
TabItem: label(string, required) | children — single tab
```

### Data
```
Table: columns(string[], required) | style?(Style) | children — table with named columns
TableRow: children — one row, children map to columns
TreeNode: label(string, required) | children — collapsible tree node
CollapsingHeader: label(string, required) | children — collapsible section
```

### Text & Display
```
Text: style?(Style) | children — display text, content as children
Separator: (no props) — horizontal line
ProgressBar: value(number, required) | overlay?(string) | style?(Style) — progress 0.0-1.0
Tooltip: text(string, required) — tooltip on previous item hover
BulletText: style?(Style) | children — bulleted text item
LabelText: label(string, required) | value(string, required) — label with value display
PlotLines: label(string, required) | values(number[], required) | overlay?(string) | style?(Style) — line graph
PlotHistogram: label(string, required) | values(number[], required) | overlay?(string) | style?(Style) — histogram
```

### Inputs
```
Button: title(string, required) | onPress(() => void, required) | disabled?(boolean) | style?(Style)
TextInput: value(string, required) | onChange((v: string) => void, required) | label?(string) | placeholder?(string) | style?(Style)
InputTextMultiline: label(string, required) | value(string, required) | onChange((v: string) => void, required) | style?(Style)
Checkbox: value(boolean, required) | onChange((v: boolean) => void, required) | label?(string) | style?(Style)
SliderFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | min(number, required) | max(number, required) | style?(Style)
SliderInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | min(number, required) | max(number, required) | style?(Style)
DragFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | speed?(number) | style?(Style)
DragInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | speed?(number) | style?(Style)
InputInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | style?(Style)
InputFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | style?(Style)
Radio: label(string, required) | value(number, required) | index(number, required) | onChange?((v: number) => void) | style?(Style)
Selectable: label(string, required) | selected?(boolean) | onSelect?(() => void) | style?(Style)
ColorEdit: label(string, required) | value(number[], required) | onChange((v: number[]) => void, required) | style?(Style)
ColorEdit3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | style?(Style) — RGB only
ColorPicker: label(string, required) | value(number[], required) | onChange((v: number[]) => void, required) | style?(Style)
ColorPicker3: label(string, required) | value([number,number,number], required) | onChange?((v) => void) | style?(Style) — RGB only
Combo: label(string, required) | value(number, required) | onChange((v: number) => void, required) | items(string[], required) | style?(Style)
ListBox: label(string, required) | value(number, required) | onChange((v: number) => void, required) | items(string[], required) | style?(Style)
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

### Overlay
```
Modal: title(string, required) | open?(boolean) | onClose?(() => void) | style?(Style) | children — blocking modal dialog
Popup: id(string, required) | style?(Style) | children
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
Font: name(string, required) | children — PushFont/PopFont, selects a font loaded via imx::load_font() in C++
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
import { TodoItem } from './TodoItem';

export default function App() {
  const [done1, setDone1] = useState(false);
  const [done2, setDone2] = useState(false);
  const [speed, setSpeed] = useState(5.0);
  const [mode, setMode] = useState(0);
  const [color, setColor] = useState([1.0, 0.5, 0.0, 1.0]);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <MenuBar>
        <Menu label="File">
          <MenuItem label="New" shortcut="Ctrl+N" />
          <MenuItem label="Exit" onPress={() => setShowAbout(false)} />
        </Menu>
      </MenuBar>
      <Window title="Main">
        <Column gap={4}>
          <TodoItem text="Task A" done={done1} onToggle={() => setDone1(!done1)} />
          <TodoItem text="Task B" done={done2} onToggle={() => setDone2(!done2)} />
          <Separator />
          <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
          <Combo label="Mode" value={mode} onChange={setMode} items={["Easy", "Hard"]} />
          <ColorEdit label="Color" value={color} onChange={setColor} />
        </Column>
      </Window>
      {showAbout && <Window title="About">
        <Text>IMX v0.1</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
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
- **Nested `.map()`**: auto-generated unique loop indices — same variable name in nested maps is safe.
- **ColorEdit/ColorPicker**: works with struct binding via `std::vector<float>` fields (emits `.data()`).
- **DragDrop payloads**: type matches the `onDrop` callback's parameter type annotation. Defaults to `float` if no target is found in the same component.
