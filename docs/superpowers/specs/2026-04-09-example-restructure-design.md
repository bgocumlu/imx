# Example Restructure — Design Spec

## Overview

Replace the monolithic 608-line hello example with three focused example apps:
- `examples/hello/` — minimal getting-started (~25 lines)
- `examples/demo/` — component-organized demo (like imgui_demo), fully populated
- `examples/phases/` — phase showcase with hub, content added incrementally by user

## Prerequisites

- **Font embed from TSX** — `<Font>` needs `src` and `embed` props so fonts can be loaded declaratively from TSX instead of manual C++ `load_font()` calls in main.cpp. This feature must be implemented before the demo/phases examples, which will use it. See separate spec.

## Problem

The current `examples/hello/App.tsx` has 44 useState calls, 14 windows, and 608 lines in one file. It's cluttered, hard to test individual features, and mixes phase-by-phase development history with component showcase.

## Architecture

### Hub Pattern (shared by demo and phases)

Both apps use the same pattern:
- App.tsx is a DockSpace with one "Hub" window containing buttons
- Each button toggles a useState boolean that controls a category/phase window
- Category/phase components receive `onClose` callback prop
- Each window uses `open={true} onClose={props.onClose}` for the X close button

```tsx
// Hub pattern
const [showX, setShowX] = useState(false);
// ...
{showX && <XDemo onClose={() => setShowX(false)} />}
```

```tsx
// Category/phase component pattern
export function XDemo(props: { onClose: () => void }) {
  return (
    <Window title="X" open={true} onClose={props.onClose}>
      // content
    </Window>
  );
}
```

### File Structure

```
examples/
  hello/           (slimmed — minimal getting-started)
    src/
      App.tsx
      main.cpp
      imx.d.ts
      tsconfig.json
    public/
      Inter-Regular.ttf
      JetBrainsMono-Regular.ttf

  demo/            (component-organized, fully populated)
    src/
      App.tsx           (hub — buttons to open category windows)
      LayoutDemo.tsx
      TextDemo.tsx
      InputsDemo.tsx
      SlidersDemo.tsx
      ButtonsDemo.tsx
      ColorDemo.tsx
      TablesDemo.tsx
      TreesDemo.tsx
      MenusDemo.tsx
      DragDropDemo.tsx
      CanvasDemo.tsx
      ThemingDemo.tsx
      ImagesDemo.tsx
      AdvancedDemo.tsx
      DemoState.h       (struct binding for MultiSelect etc.)
      main.cpp
      imx.d.ts
      tsconfig.json
    public/
      Inter-Regular.ttf
      JetBrainsMono-Regular.ttf
      image.jpg
      flower.jpg

  phases/          (phase showcase — hub only, content added incrementally)
    src/
      App.tsx           (hub — buttons for Phase 11-18)
      PhasesState.h     (minimal — only MultiSelect state for now)
      main.cpp
      imx.d.ts
      tsconfig.json
    public/
      Inter-Regular.ttf
      JetBrainsMono-Regular.ttf

  dashboard/       (unchanged)
  kanban/          (unchanged)
  settings/        (unchanged)
  todo/            (unchanged)
```

## Hello Example (slimmed)

~25 lines. No struct binding, no AppState.h, no TodoItem.tsx, no images. Pure useState.

```tsx
export default function App() {
  const [count, setCount] = useState(0);
  const [speed, setSpeed] = useState(5.0);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Hello IMX">
        <Column gap={8}>
          <Text>Welcome to IMX</Text>
          <Text>Count: {count}</Text>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      {showAbout && <Window title="About" open={true} onClose={() => setShowAbout(false)}>
        <Text>Built with IMX — React-Native-like authoring for Dear ImGui</Text>
      </Window>}
    </DockSpace>
  );
}
```

Simplified main.cpp — no font loading, no custom widget registration. Just GLFW + ImGui + render loop.

## Demo App — Category Breakdown

14 category files, each covering every component in that category:

### LayoutDemo
Row (with gap), Column (with gap), View, SameLine (with offset/spacing), NewLine, Spacing, Dummy, Indent/Unindent, Cursor positioning, Child (scrollable region with border)

### TextDemo
Text (plain), Text color, Text disabled, Text wrapped, Text color+wrapped, BulletText, Bullet + SameLine, LabelText

### InputsDemo
TextInput, InputTextMultiline, InputInt, InputFloat, InputFloat2/3/4, InputInt2/3/4, Combo (simple items), Combo (manual Begin/End), ListBox (simple items), ListBox (manual), Radio, Selectable (basic + spanAllColumns/allowDoubleClick)

### SlidersDemo
SliderFloat, SliderInt, SliderAngle, VSliderFloat, VSliderInt, DragFloat, DragInt, SliderFloat2/3/4, SliderInt2/3/4, DragFloat2/3/4, DragInt2/3/4, all with explicit width props

### ButtonsDemo
Button, SmallButton, ArrowButton (all 4 directions), InvisibleButton, ImageButton, Checkbox, Disabled wrapping

### ColorDemo
ColorEdit (RGBA), ColorEdit3 (RGB), ColorPicker (RGBA), ColorPicker3 (RGB)

### TablesDemo
Basic table, sortable table, column flags (fixedWidth, noResize, defaultHide, preferSort), row/cell bgColor, columnIndex jumps, scrollX/scrollY, multiSortable, hideable

### TreesDemo
TreeNode (basic), TreeNode (defaultOpen, openOnArrow, openOnDoubleClick, leaf, bullet), programmatic forceOpen, CollapsingHeader (basic + closable + defaultOpen)

### MenusDemo
MainMenuBar, MenuBar (window-level), Menu, MenuItem (with shortcuts), Modal (with open/close), Popup, ContextMenu (right-click + left-click mouseButton), window-target ContextMenu

### DragDropDemo
DragDropSource + DragDropTarget with typed payloads, visual feedback

### CanvasDemo
DrawLine, DrawRect, DrawCircle, DrawText, DrawBezierCubic, DrawBezierQuadratic, DrawPolyline, DrawConvexPolyFilled, DrawNgon, DrawNgonFilled, DrawTriangle

### ThemingDemo
Theme preset switching, accentColor/backgroundColor/textColor/borderColor/surfaceColor, StyleColor overrides, StyleVar overrides, Font switching, Group + ID scoping

### ImagesDemo
Image (file loading from public/), Image (embed), width/height control, ImageButton

### AdvancedDemo
MultiSelect (with boxSelect, struct binding via DemoState), Shortcut (Ctrl+S etc.), Custom widget (register_widget), window flags (noTitleBar, noResize, etc.), window positioning/sizing/constraints, bgAlpha, viewport hints

## Phases App

Hub-only infrastructure. No phase content files yet — user adds them incrementally.

### Hub App.tsx

Buttons for Phase 11 through Phase 18. Each button is wired to a useState boolean. As the user creates PhaseXX.tsx files, they:
1. Create the .tsx file in `phases/src/`
2. Add it to CMakeLists SOURCES
3. Add import + conditional render in App.tsx

### PhasesState.h

Minimal — only holds state needed by phases that require struct binding:
```cpp
struct PhasesState {
    // Phase 17: MultiSelect demo
    static constexpr int MS_COUNT = 6;
    bool ms_selected[MS_COUNT] = {};
    int ms_selection_count = 0;
    void apply_selection(ImGuiMultiSelectIO* io);
};
```

Extended by user as phases are added.

## Build System

Root CMakeLists.txt changes:
- `hello_app` target: updated SOURCES (just src/App.tsx), simplified includes
- `demo_app` target: new, all 15 .tsx files as SOURCES, public/ assets copied
- `phases_app` target: new, starts with just src/App.tsx as SOURCES
- Existing targets (dashboard_app, kanban_app, settings_app, todo_app) unchanged

## Cleanup

Remove from hello:
- TodoItem.tsx
- AppState.h
- hand_written_app.cpp, hand_written_app.h
- image.jpg (moves to demo/public/)

## Scope

**Implemented now:**
- Slim hello (new App.tsx, new main.cpp, cleanup old files)
- Demo app fully populated (hub + all 14 category windows)
- Phases app infrastructure only (hub with buttons, PhasesState.h, main.cpp)

**User does later:**
- Phase content files (Phase11.tsx, Phase12.tsx, etc.) — one at a time, tested individually
