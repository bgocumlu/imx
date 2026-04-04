# Phase 10 Batches 3-4: Advanced Interaction & Canvas Drawing

## Overview

11 new components across two implementation phases:

- **Phase A (Batch 3)**: Group, ID, StyleColor, StyleVar, DragDropSource, DragDropTarget
- **Phase B (Batch 4)**: Canvas, DrawLine, DrawRect, DrawCircle, DrawText
- **Deferred**: PlotCustom (revisit after Canvas is solid)

---

## Component Definitions

### Batch 3: Scoping & Interaction

#### Group

Container wrapping children in `ImGui::BeginGroup()`/`EndGroup()`. Makes children act as a single item for alignment/bounding.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `style` | Style | no | Reserved for future use |

- Calls `before_child()` before beginning (participates in parent layout)
- Does NOT push a layout context — children still use parent's layout
- Maps to: `BeginGroup()` / `EndGroup()`

#### ID

Container that pushes an explicit ImGui ID scope around children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scope` | string\|number | yes | The ID to push |

- Maps to: `PushID(scope)` / `PopID()`
- String scope emits `PushID(const char*)`, number emits `PushID(int)`
- Calls `before_child()` before beginning

#### StyleColor

Container that pushes color overrides for children, pops on end.

| Prop | ImGuiCol_ Enum | Type |
|------|----------------|------|
| `text` | Text | [r,g,b,a] |
| `textDisabled` | TextDisabled | [r,g,b,a] |
| `windowBg` | WindowBg | [r,g,b,a] |
| `frameBg` | FrameBg | [r,g,b,a] |
| `frameBgHovered` | FrameBgHovered | [r,g,b,a] |
| `frameBgActive` | FrameBgActive | [r,g,b,a] |
| `titleBg` | TitleBg | [r,g,b,a] |
| `titleBgActive` | TitleBgActive | [r,g,b,a] |
| `button` | Button | [r,g,b,a] |
| `buttonHovered` | ButtonHovered | [r,g,b,a] |
| `buttonActive` | ButtonActive | [r,g,b,a] |
| `header` | Header | [r,g,b,a] |
| `headerHovered` | HeaderHovered | [r,g,b,a] |
| `headerActive` | HeaderActive | [r,g,b,a] |
| `separator` | Separator | [r,g,b,a] |
| `checkMark` | CheckMark | [r,g,b,a] |
| `sliderGrab` | SliderGrab | [r,g,b,a] |
| `border` | Border | [r,g,b,a] |
| `popupBg` | PopupBg | [r,g,b,a] |
| `tab` | Tab | [r,g,b,a] |

All props are optional. Only set props are pushed.

**C++ side**: `StyleColorOverrides` struct with `std::optional<ImVec4>` for each field. `begin_style_color(overrides)` iterates set fields, pushes each, tracks count on a stack. `end_style_color()` pops that many. Same pattern as Theme.

#### StyleVar

Container that pushes style variable overrides for children, pops on end.

**Float props:**

| Prop | ImGuiStyleVar_ Enum |
|------|---------------------|
| `alpha` | Alpha |
| `windowRounding` | WindowRounding |
| `frameRounding` | FrameRounding |
| `frameBorderSize` | FrameBorderSize |
| `indentSpacing` | IndentSpacing |
| `tabRounding` | TabRounding |

**Vec2 props** (accept `[x, y]`):

| Prop | ImGuiStyleVar_ Enum |
|------|---------------------|
| `windowPadding` | WindowPadding |
| `framePadding` | FramePadding |
| `itemSpacing` | ItemSpacing |
| `itemInnerSpacing` | ItemInnerSpacing |
| `cellPadding` | CellPadding |

All props are optional. Only set props are pushed.

**C++ side**: `StyleVarOverrides` struct with `std::optional<float>` for scalars and `std::optional<ImVec2>` for vec2 fields. `begin_style_var(overrides)` / `end_style_var()` with stack-tracked count. Same pattern as StyleColor.

#### DragDropSource

Container that makes its children draggable.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `type` | string | yes | Payload type identifier for matching |
| `payload` | string\|number | yes | Data to transfer |

**Rendering pattern**:
1. `ImGui::BeginGroup()` — groups children into one item
2. Render children normally (they participate in parent layout)
3. `ImGui::EndGroup()`
4. Check `ImGui::BeginDragDropSource()` — if dragging:
   - `ImGui::SetDragDropPayload(type, &data, sizeof(data))`
   - `ImGui::Text("Dragging...")` as default drag tooltip (hardcoded for now)
   - `ImGui::EndDragDropSource()`

Does NOT call `before_child()` — the Group inside handles layout participation.

**Payload serialization**: Number payload compiles to `float`. String payload compiles to a char buffer copy. The `type` string must match between source and target.

#### DragDropTarget

Container that accepts drops on its children.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `type` | string | yes | Accepted payload type (must match source) |
| `onDrop` | callback(payload) | yes | Called when matching payload is dropped |

**Rendering pattern**:
1. `ImGui::BeginGroup()`
2. Render children normally
3. `ImGui::EndGroup()`
4. Check `ImGui::BeginDragDropTarget()` — if accepting:
   - `ImGui::AcceptDragDropPayload(type)`
   - Extract data, invoke `onDrop` callback
   - `ImGui::EndDragDropTarget()`

**Callback typing**: The `onDrop` callback parameter type annotation drives the `std::any_cast` on the C++ side, reusing the native widget callback lowering pattern. `(id: number) => ...` becomes `[&](std::any _v) { auto id = std::any_cast<float>(_v); ... }`.

---

### Batch 4: Canvas Drawing

#### Canvas

Container that creates a sized drawing region. Children must be draw primitives.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `width` | number | yes | Canvas width in pixels |
| `height` | number | yes | Canvas height in pixels |
| `style` | Style | no | backgroundColor fills the canvas |

**C++ implementation**:
- `begin_canvas(width, height, style)`:
  - Calls `before_child()` (participates in parent layout)
  - Gets cursor screen position as canvas origin
  - Pushes origin onto a static `g_canvas_origin_stack`
  - Optionally fills background via `AddRectFilled`
  - Calls `ImGui::Dummy(width, height)` to reserve layout space
- `end_canvas()`:
  - Pops the origin stack
- Draw primitives use `canvas_origin()` to offset all coordinates

All draw primitive coordinates are **relative to the Canvas top-left** (0,0 = top-left of canvas).

#### DrawLine

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `p1` | [x, y] | yes | Start point |
| `p2` | [x, y] | yes | End point |
| `color` | [r,g,b,a] | yes | Line color |
| `thickness` | number | no | Line thickness (default 1.0) |

Maps to: `GetWindowDrawList()->AddLine(origin + p1, origin + p2, color, thickness)`

#### DrawRect

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `min` | [x, y] | yes | Top-left corner |
| `max` | [x, y] | yes | Bottom-right corner |
| `color` | [r,g,b,a] | yes | Rect color |
| `filled` | boolean | no | Fill vs stroke (default false) |
| `thickness` | number | no | Stroke thickness (default 1.0) |
| `rounding` | number | no | Corner rounding (default 0.0) |

Maps to: `AddRectFilled` if filled, `AddRect` otherwise.

#### DrawCircle

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `center` | [x, y] | yes | Center point |
| `radius` | number | yes | Circle radius |
| `color` | [r,g,b,a] | yes | Circle color |
| `filled` | boolean | no | Fill vs stroke (default false) |
| `thickness` | number | no | Stroke thickness (default 1.0) |

Maps to: `AddCircleFilled` if filled, `AddCircle` otherwise.

#### DrawText

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `pos` | [x, y] | yes | Text position |
| `text` | string | yes | Text content |
| `color` | [r,g,b,a] | yes | Text color |

Maps to: `AddText(origin + pos, color, text)`

---

## Compiler Pipeline

### Container components (Group, ID, StyleColor, StyleVar, DragDropSource, DragDropTarget, Canvas)

All follow the standard container path:

1. **components.ts**: Add to `HOST_COMPONENTS` with `isContainer: true` and props
2. **ir.ts**: Add tags to `IRBeginContainer['tag']` and `IREndContainer['tag']` union types
3. **lowering.ts**: Automatic — existing container lowering path emits `begin_container`/`end_container` with children recursively lowered in between
4. **emitter.ts**: New cases in `emitBeginContainer` and `emitEndContainer` switch statements
5. **renderer.h**: Declare `begin_X`/`end_X` functions and supporting structs
6. **components.cpp**: Implement begin/end pairs
7. **init.ts**: Add TSX type definitions to `imx.d.ts` template

### Leaf components (DrawLine, DrawRect, DrawCircle, DrawText)

Each gets a dedicated IR node and lowering/emit function:

1. **components.ts**: Add with `isContainer: false` and coordinate/color props
2. **ir.ts**: New IR node types (e.g., `IRDrawLine { kind: 'draw_line'; p1x, p1y, p2x, p2y, color, thickness }`)
3. **lowering.ts**: New leaf lowering functions that extract coordinate array elements
4. **emitter.ts**: New emit functions generating `imx::renderer::draw_line(...)` calls
5. **renderer.h**: Declare `draw_line`, `draw_rect`, `draw_circle`, `draw_text`
6. **components.cpp**: Implement using `GetWindowDrawList()` + canvas origin stack
7. **init.ts**: Add TSX type definitions

### Special emitter handling

- **StyleColor**: Emitter builds a `StyleColorOverrides` struct from props (like ThemeConfig pattern), passes to `begin_style_color(overrides)`
- **StyleVar**: Same — builds `StyleVarOverrides`, passes to `begin_style_var(overrides)`. Vec2 props like `framePadding={[12, 6]}` emit as `ImVec2(12.0F, 6.0F)`
- **DragDropSource**: Emitter wraps children in `BeginGroup()`/`EndGroup()`, then emits the `BeginDragDropSource()` check block after children
- **DragDropTarget**: Same wrapping pattern, then `BeginDragDropTarget()` check with callback invocation using native widget callback lowering
- **ID**: String scope emits `ImGui::PushID(const char*)`, number emits `ImGui::PushID(int)`
- **Canvas draw primitives**: Array props like `p1={[0, 0]}` split into separate float args by the emitter

---

## TSX Usage Examples

### Scoping and styling

```tsx
function StyledPanel() {
  return (
    <StyleColor button={[1, 0, 0, 1]} buttonHovered={[1, 0.3, 0.3, 1]}>
      <StyleVar frameRounding={8} framePadding={[12, 6]}>
        <Button title="Danger" onPress={() => setAlert(true)} />
        <Button title="Cancel" onPress={() => setAlert(false)} />
      </StyleVar>
    </StyleColor>
  );
}
```

### Drag and drop

```tsx
function DragDropDemo() {
  const [items, setItems] = useState(["A", "B", "C"]);

  return (
    <Row style={{ gap: 20 }}>
      {items.map((item, i) => (
        <DragDropSource type="reorder" payload={i} key={i}>
          <Text>{item}</Text>
        </DragDropSource>
      ))}
      <DragDropTarget type="reorder" onDrop={(idx: number) => handleDrop(idx)}>
        <View style={{ minHeight: 50, minWidth: 100 }}>
          <Text>Drop here</Text>
        </View>
      </DragDropTarget>
    </Row>
  );
}
```

### Canvas drawing

```tsx
function ChartDemo() {
  const [progress, setProgress] = useState(0.5);

  return (
    <Canvas width={300} height={200} style={{ backgroundColor: [0.1, 0.1, 0.1, 1] }}>
      <DrawRect min={[0, 0]} max={[300, 200]} color={[0.2, 0.2, 0.2, 1]} filled />
      <DrawLine p1={[0, 100]} p2={[300, 100]} color={[0.4, 0.4, 0.4, 1]} />
      <DrawRect min={[10, 100]} max={[60, 100 - progress * 80]} color={[0, 0.8, 0.4, 1]} filled rounding={4} />
      <DrawCircle center={[150, 100]} radius={40} color={[0, 0.5, 1, 1]} thickness={3} />
      <DrawText pos={[10, 185]} text="Chart" color={[1, 1, 1, 1]} />
    </Canvas>
  );
}
```

### Group and ID

```tsx
function PlayerPanel() {
  return (
    <Row style={{ gap: 20 }}>
      <ID scope="player1">
        <Group>
          <Text>Player 1</Text>
          <SliderFloat label="HP" value={hp1} min={0} max={100} />
        </Group>
      </ID>
      <ID scope="player2">
        <Group>
          <Text>Player 2</Text>
          <SliderFloat label="HP" value={hp2} min={0} max={100} />
        </Group>
      </ID>
    </Row>
  );
}
```

---

## Implementation Phases

### Phase A: Batch 3 (Group, ID, StyleColor, StyleVar, DragDropSource, DragDropTarget)

Order: Group and ID first (simplest, no new structs), then StyleColor/StyleVar (struct-based, reuses Theme pattern), then DragDrop (most complex emitter logic).

### Phase B: Batch 4 (Canvas, DrawLine, DrawRect, DrawCircle, DrawText)

Order: Canvas container first (origin stack + Dummy reservation), then draw primitives one at a time (each is independent).

Test checkpoint between phases.
