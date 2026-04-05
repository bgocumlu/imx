# IMX

Write `.tsx`, compile to native Dear ImGui C++ apps. No JS runtime in the shipped binary.

```tsx
export default function App() {
  const [count, setCount] = useState(0);

  return (
    <Window title="Hello">
      <Button title="Click" onPress={() => setCount(count + 1)} />
      <Text>Count: {count}</Text>
    </Window>
  );
}
```

This compiles to a ~700KB native executable.

## Quick Start

```bash
npx imxc init myapp
cd myapp
cmake -B build
cmake --build build --config Release
```

Requires: Node.js, CMake 3.25+, C++20 compiler (MSVC, GCC, or Clang).

## How It Works

```
.tsx  -->  imxc compiler  -->  .gen.cpp  -->  CMake  -->  native binary
```

The compiler parses TSX, lowers it to an intermediate representation, and emits C++ that calls Dear ImGui directly. State management uses compiler-assigned slots, not a React runtime.

## 54 Components

**Layout:** DockSpace, Window, View, Row, Column, Group, Child

**Navigation:** MenuBar, Menu, MenuItem, TabBar, TabItem

**Data:** Table, TableRow, TreeNode, CollapsingHeader

**Input:** Button, TextInput, Checkbox, SliderFloat, SliderInt, DragFloat, DragInt, InputInt, InputFloat, ColorEdit, ColorPicker, Combo, ListBox, Radio, Selectable, InputTextMultiline

**Display:** Text, BulletText, LabelText, Separator, ProgressBar, Tooltip, PlotLines, PlotHistogram, Image

**Overlay:** Modal, Popup

**Styling:** Theme, StyleColor, StyleVar, ID, Disabled

**Interaction:** DragDropSource, DragDropTarget

**Drawing:** Canvas, DrawLine, DrawRect, DrawCircle, DrawText

**Dock Config:** DockLayout, DockSplit, DockPanel

## Theme System

5 semantic props derive all 55 ImGui color slots:

```tsx
<Theme
  preset="dark"
  accentColor={[0.9, 0.2, 0.2, 1.0]}
  backgroundColor={[0.12, 0.12, 0.15, 1.0]}
  textColor={[0.95, 0.95, 0.95, 1.0]}
  borderColor={[0.3, 0.3, 0.35, 1.0]}
  surfaceColor={[0.18, 0.18, 0.22, 1.0]}
>
  ...
</Theme>
```

## Custom C++ Widgets

Register native ImGui widgets in C++ and use them from TSX:

```cpp
// main.cpp
imx::register_widget("Knob", [](imx::WidgetArgs& a) {
    float val = a.get<float>("value");
    // ... your ImGui code ...
    if (changed) a.call<float>("onChange", val);
});
```

```tsx
<Knob value={vol} onChange={(v: number) => setVol(v)} min={0} max={1} />
```

## Add to Existing Project

```bash
npx imxc add
```

Creates `src/App.tsx`, `src/imx.d.ts`, `tsconfig.json`, and prints the CMake lines to paste.

## Docs

- [API Reference](docs/api-reference.md)
- [Quick Start](docs/quick-start.md)
- [LLM Prompt Reference](docs/llm-prompt-reference.md)
- [Spec](docs/spec.md)
