# ReImGui LLM Prompt Reference

ReImGui: write .tsx with JSX components and useState hooks. Compiles to native Dear ImGui C++ apps.
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
```

### Inputs
```
Button: title(string, required) | onPress(() => void, required) | disabled?(boolean) | style?(Style)
TextInput: value(string, required) | onChange((v: string) => void, required) | label?(string) | placeholder?(string) | style?(Style)
Checkbox: value(boolean, required) | onChange((v: boolean) => void, required) | label?(string) | style?(Style)
SliderFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | min(number, required) | max(number, required) | style?(Style)
SliderInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | min(number, required) | max(number, required) | style?(Style)
DragFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | speed?(number) | style?(Style)
DragInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | speed?(number) | style?(Style)
InputInt: label(string, required) | value(number, required) | onChange((v: number) => void, required) | style?(Style)
InputFloat: label(string, required) | value(number, required) | onChange((v: number) => void, required) | style?(Style)
ColorEdit: label(string, required) | value(number[], required) | onChange((v: number[]) => void, required) | style?(Style)
Combo: label(string, required) | value(number, required) | onChange((v: number) => void, required) | items(string[], required) | style?(Style)
ListBox: label(string, required) | value(number, required) | onChange((v: number) => void, required) | items(string[], required) | style?(Style)
```

### Overlay
```
Popup: id(string, required) | style?(Style) | children
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
        <Text>ReImGui v0.1</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
      </Window>}
    </DockSpace>
  );
}
```

## File Setup

Required files per app directory: `App.tsx`, `reimgui.d.ts`, `tsconfig.json`, `main.cpp`.
Compile all .tsx files together: `node compiler/dist/index.js App.tsx TodoItem.tsx -o build/generated`
First .tsx argument is the root component (must use `export default`).
