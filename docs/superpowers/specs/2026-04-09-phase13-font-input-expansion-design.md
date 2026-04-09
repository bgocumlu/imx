# Phase 13: Font Loading & Input Expansion — Design Spec

## Overview

Add font loading API and expand input/drawing widget coverage. ~40 new components/drawing primitives, 1 new subsystem (font registry). All input components follow established patterns; font loading is the only new subsystem.

## 1. Font Loading

### Philosophy

Loading is a C++ backend concern (one-time init). TSX controls presentation (which font to use where). No compiler changes needed for loading.

### C++ API (in `include/imx/renderer.h`)

```cpp
namespace imx {
    // Call before main loop, after ImGui context created
    void load_font(const char* name, const char* path, float size);
    void load_font_embedded(const char* name, const unsigned char* data, int data_size, float size);
}
```

- Fonts stored in a `static std::unordered_map<std::string, ImFont*> g_font_registry`
- `load_font` calls `ImGui::GetIO().Fonts->AddFontFromFileTTF()`
- `load_font_embedded` calls `AddFontFromMemoryTTF()` (or CompressedTTF variant)
- Must be called before first frame (ImGui rebuilds font atlas on first render)

### TSX Component

```tsx
<Font name="custom">
  <Text>This uses the custom font</Text>
</Font>
```

### Renderer

```cpp
void begin_font(const char* name);  // lookup in registry, PushFont
void end_font();                     // PopFont
```

If name not found, logs warning and does nothing (no crash).

### Compiler Pipeline

- **components.ts**: `Font` — container, props: `{ name: { type: 'string', required: true } }`
- **ir.ts**: Uses existing `begin_container` / `end_container` with tag `'font'`
- **lowering.ts**: Extract `name` prop, emit container begin/end
- **emitter.ts**: `imx::renderer::begin_font(name)` / `imx::renderer::end_font()`
- **imx.d.ts**: `interface FontProps { name: string; children?: any; }`

### init.ts / Examples

- `imxc init` adds commented-out font loading example in generated `main.cpp`
- No font files bundled — user provides their own

## 2. Vector Inputs (24 components)

### Families

| Family | Variants | Value Type | Extra Props |
|--------|----------|------------|-------------|
| InputFloat | 2, 3, 4 | `float[N]` | — |
| InputInt | 2, 3, 4 | `int[N]` | — |
| DragFloat | 2, 3, 4 | `float[N]` | speed |
| DragInt | 2, 3, 4 | `int[N]` | speed |
| SliderFloat | 2, 3, 4 | `float[N]` | min, max |
| SliderInt | 2, 3, 4 | `int[N]` | min, max |

### TSX API

```tsx
<InputFloat3 label="Position" value={props.position} />
<DragFloat2 label="Size" value={props.size} speed={0.1} />
<SliderInt4 label="Margins" value={props.margins} min={0} max={100} />
```

- `value` typed as tuple: `[number, number]` for *2, `[number, number, number]` for *3, `[number, number, number, number]` for *4
- Direct bind: `value={props.field}` without onChange emits `&props.field` (pointer to `float[N]` / `int[N]`)

### Renderer

Shared helpers to avoid 24 copy-paste functions:

```cpp
bool input_float_n(const char* label, float* values, int count, const Style& style);
bool input_int_n(const char* label, int* values, int count, const Style& style);
bool drag_float_n(const char* label, float* values, int count, float speed, const Style& style);
bool drag_int_n(const char* label, int* values, int count, float speed, const Style& style);
bool slider_float_n(const char* label, float* values, int count, float min, float max, const Style& style);
bool slider_int_n(const char* label, int* values, int count, int min, int max, const Style& style);
```

Each dispatches internally:
```cpp
bool input_float_n(const char* label, float* values, int count, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::InputFloat2(label, values); break;
        case 3: r = ImGui::InputFloat3(label, values); break;
        case 4: r = ImGui::InputFloat4(label, values); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}
```

### Compiler

- **components.ts**: 24 entries, all following same pattern with count baked in
- **ir.ts**: 6 IR kinds (one per family): `input_float_n`, `input_int_n`, `drag_float_n`, `drag_int_n`, `slider_float_n`, `slider_int_n` — each carries `count: number`
- **lowering.ts**: Shared helper `lowerVectorInput(family, count, attrs, rawAttrs, body, ctx)` — extracts props, pushes IR node with count
- **emitter.ts**: Shared helper `emitVectorInput(family, node, lines, indent)` — handles 3 binding modes, emits `imx::renderer::{family}_n(label, ptr, count, ...extras, style)`
- **imx.d.ts**: 24 interfaces with appropriately-sized tuples

### Struct Binding

Direct bind passes pointer to first element of `float[N]` / `int[N]` array field. User defines:
```cpp
struct AppState {
    float position[3];
    int margins[4];
};
```

TSX: `<InputFloat3 label="Pos" value={props.position} />` emits `imx::renderer::input_float_n("Pos", props.position, 3, style)` — arrays decay to pointer naturally.

## 3. Button & Slider Variants (7 components)

### SmallButton

```tsx
<SmallButton label="x" onClick={() => { ... }} />
```

- Renderer: `bool small_button(const char* label)` → `ImGui::SmallButton(label)`
- No style width (ImGui SmallButton doesn't support it)

### ArrowButton

```tsx
<ArrowButton id="left" direction="left" onClick={() => { ... }} />
```

- Props: `id` (string, required), `direction` (string: "left"|"right"|"up"|"down", required), `onClick`
- Renderer: maps direction string to `ImGuiDir_Left` etc.

### InvisibleButton

```tsx
<InvisibleButton id="hit" width={100} height={50} onClick={() => { ... }} />
```

- Props: `id`, `width`, `height`, `onClick`
- Renderer: `ImGui::InvisibleButton(id, ImVec2(w, h))`

### ImageButton

```tsx
<ImageButton id="tool" src="icon.png" width={32} height={32} onClick={() => { ... }} />
```

- Props: `id`, `src`, `width`, `height`, `onClick`, optional `uv0`/`uv1` (tuples)
- Renderer: reuses existing texture cache from Image component, calls `ImGui::ImageButton()`

### VSliderFloat / VSliderInt

```tsx
<VSliderFloat label="Vol" value={props.volume} min={0} max={1} width={20} height={100} />
```

- Props: `label`, `value`, `onChange`, `min`, `max`, `width`, `height`
- Renderer: `ImGui::VSliderFloat(label, ImVec2(w,h), &val, min, max)`
- Supports all 3 binding modes (state var, direct bind, expression+onChange)

### SliderAngle

```tsx
<SliderAngle label="Rotation" value={props.angle} min={-360} max={360} />
```

- Props: `label`, `value`, `onChange`, `min`, `max` (degrees)
- Renderer: `ImGui::SliderAngle(label, &val, min, max)`
- Value stored as radians internally by ImGui, min/max specified in degrees
- Supports all 3 binding modes

## 4. Color Variants (2 components)

### ColorEdit3 / ColorPicker3

```tsx
<ColorEdit3 label="Tint" value={props.tint} />
<ColorPicker3 label="BG" value={props.bgColor} />
```

- Props: `label`, `value: [number, number, number]`, `onChange`
- Renderer: `color_edit3(label, float[3], style)`, `color_picker3(label, float[3], style)`
- Direct bind: pointer to `float[3]` array field
- Same pattern as existing ColorEdit/ColorPicker but 3-channel

## 5. DrawList Advanced (7 drawing primitives)

All follow existing Canvas drawing pattern: get canvas origin, offset coordinates, call ImGui DrawList.

### DrawBezierCubic

```tsx
<DrawBezierCubic p1={[0,0]} p2={[50,0]} p3={[50,100]} p4={[100,100]} color={[1,1,1,1]} thickness={2} />
```

- Renderer: `draw_bezier_cubic(p1x,p1y, p2x,p2y, p3x,p3y, p4x,p4y, color, thickness, segments)`
- Maps to `AddBezierCubic()`

### DrawBezierQuadratic

```tsx
<DrawBezierQuadratic p1={[0,0]} p2={[50,50]} p3={[100,0]} color={[1,1,1,1]} thickness={2} />
```

- Renderer: `draw_bezier_quadratic(p1x,p1y, p2x,p2y, p3x,p3y, color, thickness, segments)`
- Maps to `AddBezierQuadratic()`

### DrawPolyline

```tsx
<DrawPolyline points={[[0,0],[50,25],[100,0]]} color={[1,1,1,1]} thickness={2} closed={false} />
```

- Props: `points` (array of [x,y] tuples), `color`, `thickness`, `closed`
- Renderer builds `ImVec2` array, offsets by canvas origin, calls `AddPolyline()`

### DrawConvexPolyFilled

```tsx
<DrawConvexPolyFilled points={[[0,0],[50,25],[100,0]]} color={[1,0,0,1]} />
```

- Same point array pattern, calls `AddConvexPolyFilled()`

### DrawNgon / DrawNgonFilled

```tsx
<DrawNgon center={[50,50]} radius={30} color={[1,1,1,1]} numSegments={6} thickness={2} />
<DrawNgonFilled center={[50,50]} radius={30} color={[1,0,0,1]} numSegments={6} />
```

- Renderer: `AddNgon()` / `AddNgonFilled()`

### DrawTriangle

```tsx
<DrawTriangle p1={[0,0]} p2={[50,100]} p3={[100,0]} color={[1,1,1,1]} thickness={2} filled={false} />
```

- Renderer: filled → `AddTriangleFilled()`, outline → `AddTriangle()`

## 6. Files to Modify

Per component (all layers):
1. `compiler/src/components.ts` — HOST_COMPONENTS entry
2. `compiler/src/ir.ts` — IR interface
3. `compiler/src/lowering.ts` — lowering function
4. `compiler/src/emitter.ts` — emission function
5. `include/imx/renderer.h` — function declaration
6. `renderer/components.cpp` — implementation
7. `compiler/src/init.ts` — imx.d.ts template + example updates
8. `examples/hello/imx.d.ts` — type definitions

New files:
- `renderer/font.cpp` (or inline in components.cpp) — font registry

Docs to update:
- `CLAUDE.md` — current status
- `docs/api-reference.md` — new components
- `docs/llm-prompt-reference.md` — new components
- `docs/roadmap.md` — mark Phase 13 done

## 7. Component Count Summary

| Group | Count |
|-------|-------|
| Font | 1 container |
| Vector inputs | 24 |
| Button/slider variants | 7 |
| Color variants | 2 |
| DrawList advanced | 7 |
| **Total** | **41** |
