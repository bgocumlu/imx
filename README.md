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

Or pick features interactively:

```bash
npx imxc init myapp
# Arrow keys + space to select features, enter to confirm

# Or specify templates directly:
npx imxc init myapp --template=async
npx imxc init myapp --template=async,persistence
```

Requires: Node.js, CMake 3.25+, C++20 compiler (MSVC, GCC, or Clang).

## Templates

Six project templates for common patterns. Combine multiple with `--template=a,b`.

| Template | Description |
|----------|-------------|
| `minimal` | Basic app with `useState` (default) |
| `async` | Background threads with UI progress reporting |
| `persistence` | Save/load app state to JSON (`imx/json.hpp`) |
| `networking` | HTTP client/server (`imx/httplib.h`) |
| `hotreload` | DLL hot reload with `imxc watch --build` |
| `filedialog` | Native open/save dialogs (`imx/pfd.h`) |

```bash
npx imxc templates        # list all templates
npx imxc watch src -o build/generated --build "cmake --build build"  # watch + rebuild
```

## How It Works

```
.tsx  -->  imxc compiler  -->  .gen.cpp  -->  CMake  -->  native binary
```

The compiler parses TSX, lowers it to an intermediate representation, and emits C++ that calls Dear ImGui directly. State management uses compiler-assigned slots, not a React runtime.

## ~98 Components

**Layout:** DockSpace, Window, View, Row, Column, Group, Child, Indent, TextWrap, Spacing, Dummy, SameLine, NewLine, Cursor

**Navigation:** MainMenuBar, MenuBar, Menu, MenuItem, Shortcut, TabBar, TabItem

**Data:** Table, TableRow, TableCell, TreeNode, CollapsingHeader

**Input:** Button, SmallButton, ArrowButton, InvisibleButton, ImageButton, TextInput, InputTextMultiline, Checkbox, SliderFloat, SliderInt, SliderAngle, VSliderFloat, VSliderInt, DragFloat, DragInt, InputInt, InputFloat, InputFloat2/3/4, InputInt2/3/4, DragFloat2/3/4, DragInt2/3/4, SliderFloat2/3/4, SliderInt2/3/4, ColorEdit, ColorEdit3, ColorPicker, ColorPicker3, Combo, ListBox, Radio, Selectable, MultiSelect

**Display:** Text, BulletText, Bullet, LabelText, Separator, ProgressBar, Tooltip, PlotLines, PlotHistogram, Image

**Overlay:** Modal, Popup, ContextMenu

**Styling:** Theme, StyleColor, StyleVar, Font, ID, Disabled

**Interaction:** DragDropSource, DragDropTarget

**Drawing:** Canvas, DrawLine, DrawRect, DrawCircle, DrawText, DrawBezierCubic, DrawBezierQuadratic, DrawPolyline, DrawConvexPolyFilled, DrawNgon, DrawNgonFilled, DrawTriangle

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

## C++ Struct Binding

Use TSX as a UI layer on existing C++ state. No `onChange` needed — widgets write directly through pointers.

```cpp
// AppState.h
struct AppState {
    float speed = 5.0f;
    int count = 0;
    std::function<void()> onReset;
};
```

```tsx
export default function App(props: AppState) {
  return (
    <Window title="Controls">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
      <Text>Count: {props.count}</Text>
      <Button title="Reset" onPress={props.onReset} />
    </Window>
  );
}
```

Generated code emits `ImGui::SliderFloat("Speed", &props.speed, ...)` — direct pointer, zero overhead. `useState` still works alongside for UI-only state like modals and tabs.

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
