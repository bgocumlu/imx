# Phase 10 Batch 1-2: New Host Components Design

## Summary

Add 9 new host components to IMX, covering essential missing primitives (Batch 1) and display/data widgets (Batch 2). All follow the established component pipeline: components.ts → ir.ts → lowering.ts → emitter.ts → renderer.h → components.cpp → imx.d.ts.

Image is deferred (requires texture/asset pipeline).

## Components

### Batch 1: Essential Missing Primitives

#### Modal

Container component for blocking modal dialogs.

```tsx
<Modal title="Confirm Delete?" open={showModal} onClose={() => setShowModal(false)}>
  <Text>Are you sure?</Text>
  <Button title="Yes" onPress={() => { doDelete(); setShowModal(false); }} />
</Modal>
```

**ImGui:** `ImGui::OpenPopup(title)` each frame when `open` is true, then `BeginPopupModal(title, &p_open)` / `EndPopup()`.

**Props:**
- `title: string` (required) — modal title and ID
- `open?: boolean` — controls visibility; when true, calls `OpenPopup` each frame
- `onClose?: () => void` — called when user clicks the X button (p_open becomes false)
- `children` — modal content

**Renderer:**
```cpp
void begin_modal(const char* title, bool open, bool* p_open, const Style& style = {});
void end_modal();
```

When `open` is true, call `ImGui::OpenPopup(title)` then `BeginPopupModal(title, p_open)`. The emitter pattern follows Window's `open`/`onClose` — emit a local `bool modal_open = open_expr;`, pass `&modal_open`, check if it became false to invoke onClose.

#### Radio

Self-closing component for radio buttons.

```tsx
<Radio label="Small" value={size} index={0} onChange={(v: number) => setSize(v)} />
<Radio label="Medium" value={size} index={1} onChange={(v: number) => setSize(v)} />
<Radio label="Large" value={size} index={2} onChange={(v: number) => setSize(v)} />
```

**ImGui:** `RadioButton(label, &v, v_button)` — returns true when clicked, sets `v = v_button`.

**Props:**
- `label: string` (required)
- `value: number` (required) — current selection (state-bound or prop)
- `index: number` (required) — this button's value
- `onChange?: (value: number) => void` — called with `index` when clicked

**Renderer:**
```cpp
bool radio(const char* label, int* value, int v_button, const Style& style = {});
```

**IR/Emitter:** Uses value/onChange pattern like SliderInt. If state-bound, emits direct mutation. If prop-bound, emits onChange callback.

#### Selectable

Self-closing component for selectable items (used in lists, menus).

```tsx
<Selectable label="Option A" selected={sel === 0} onSelect={() => setSel(0)} />
```

**ImGui:** `Selectable(label, selected)` — returns true when clicked.

**Props:**
- `label: string` (required)
- `selected?: boolean` — highlight state
- `onSelect?: () => void` — called when clicked

**Renderer:**
```cpp
bool selectable(const char* label, bool selected, const Style& style = {});
```

**IR/Emitter:** Simple — emit `if (selectable(...)) { onSelect_action; }`. Similar to Button pattern.

#### InputTextMultiline

Self-closing component for multiline text editing.

```tsx
<InputTextMultiline label="Notes" value={notes} style={{ width: 400, height: 200 }} />
```

**ImGui:** `InputTextMultiline(label, buf, buf_size, size)`.

**Props:**
- `label: string` (required)
- `value: string` (required, state-bound) — uses TextBuffer system
- `style?: Style` — width/height control the editor size

**Renderer:**
```cpp
bool text_input_multiline(const char* label, TextBuffer& buffer, const Style& style = {});
```

**IR/Emitter:** Identical to TextInput — same `IRTextInput` node with a flag, or a new `IRInputTextMultiline` kind. Uses `bufferIndex` for persistent text buffer.

Decision: Use a new IR kind `input_text_multiline` to keep it explicit. The lowering and emission follow the exact same pattern as `text_input`.

#### ColorPicker

Self-closing component for a full color picker widget.

```tsx
<ColorPicker label="Background" value={bgColor} />
```

**ImGui:** `ColorPicker4(label, col)` — `col` is `float[4]`.

**Props:**
- `label: string` (required)
- `value: color` (required, state-bound) — `[r, g, b, a]` array

**Renderer:**
```cpp
bool color_picker(const char* label, float color[4], const Style& style = {});
```

**IR/Emitter:** Identical to ColorEdit — same `IRColorEdit` pattern but calls `color_picker` instead of `color_edit`. Use a new IR kind `color_picker`.

### Batch 2: Display and Data (minus Image)

#### PlotLines

Self-closing component for a simple line graph.

```tsx
<PlotLines label="FPS" values={[60, 58, 62, 55, 61]} overlay="avg: 59" style={{ width: 200, height: 80 }} />
```

**ImGui:** `PlotLines(label, values, count, 0, overlay, FLT_MAX, FLT_MAX, size)`.

**Props:**
- `label: string` (required)
- `values: number[]` (required) — array of float values
- `overlay?: string` — overlay text
- `style?: Style` — width/height for graph size

**Renderer:**
```cpp
void plot_lines(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});
```

**IR/Emitter:** New IR kind `plot_lines`. The `values` prop is an array expression — the emitter generates a `float[]` local from the array, then passes pointer + count. Example generated code:
```cpp
float _pl_0[] = {60.0f, 58.0f, 62.0f};
imx::renderer::plot_lines("FPS", _pl_0, 3, nullptr);
```

For state-bound arrays, the emitter accesses the state slot's underlying array.

#### PlotHistogram

Self-closing component for a histogram.

```tsx
<PlotHistogram label="Distribution" values={[1, 3, 5, 2, 4]} style={{ width: 200, height: 80 }} />
```

**ImGui:** `PlotHistogram(label, values, count, 0, overlay, FLT_MAX, FLT_MAX, size)`.

**Props:** Same as PlotLines.

**Renderer:**
```cpp
void plot_histogram(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});
```

**IR/Emitter:** Same pattern as PlotLines with a different renderer call.

#### BulletText

Container component for bullet-point text (like Text but with a bullet prefix).

```tsx
<BulletText>This is a bullet item</BulletText>
```

**ImGui:** `BulletText(fmt, ...)`.

**Props:**
- Text children (same as Text component)

**Renderer:**
```cpp
void bullet_text(const char* fmt, ...) IM_FMTARGS(1);
```

**IR/Emitter:** Same as Text — reuse `IRText` kind but with a `bullet` flag, or add a new `IRBulletText` kind. Decision: new `IRBulletText` kind to keep it explicit.

#### LabelText

Self-closing component for displaying a label with a formatted value.

```tsx
<LabelText label="Name" value="John Doe" />
```

**ImGui:** `LabelText(label, fmt, ...)`.

**Props:**
- `label: string` (required)
- `value: string` (required)

**Renderer:**
```cpp
void label_text(const char* label, const char* text);
```

**IR/Emitter:** Simple — new `IRLabelText` kind with label and value strings.

## Files Changed

| File | Change |
|------|--------|
| `compiler/src/components.ts` | Add 9 component definitions to HOST_COMPONENTS |
| `compiler/src/ir.ts` | Add IRInputTextMultiline, IRColorPicker, IRRadio, IRSelectable, IRModal (begin/end), IRPlotLines, IRPlotHistogram, IRBulletText, IRLabelText |
| `compiler/src/lowering.ts` | Add lowering for each new component |
| `compiler/src/emitter.ts` | Add emission for each new component |
| `compiler/src/init.ts` | Add type declarations to .d.ts template |
| `compiler/tests/emitter.test.ts` | Add emission tests for new components |
| `include/imx/renderer.h` | Add 9 renderer function declarations |
| `renderer/components.cpp` | Add 9 renderer function implementations |
| `docs/api-reference.md` | Add component documentation |
| `docs/llm-prompt-reference.md` | Add component examples |
