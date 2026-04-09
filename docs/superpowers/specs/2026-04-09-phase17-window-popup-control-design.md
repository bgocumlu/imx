# Phase 17: Window & Popup Control — Design Spec

## Goal

Expose remaining ImGui window and popup features to TSX, giving full control over window behavior, popup triggers, combo content, multi-selection patterns, and viewport hints.

## Batches

Implementation is split into 3 batches that build on each other:

1. **Window Control** — flags, positioning, sizing, constraints
2. **Popup/Combo/MultiSelect** — popup flags, manual combo, multi-select
3. **Viewport API** — viewport hints and helpers

---

## Batch 1: Window Control

### Bug Fix: Missing Flag Emission

`noCollapse`, `noDocking`, `noScrollbar` are declared in `components.ts` and `imx.d.ts` but not emitted in `emitter.ts`. Fix by adding the corresponding `ImGuiWindowFlags_*` flag-building logic.

### New Window Flag Props

All boolean props that map to `ImGuiWindowFlags_*` at compile time. No renderer changes — `begin_window` already takes `int flags`.

| Prop | ImGui Flag |
|------|-----------|
| `noBackground` | `ImGuiWindowFlags_NoBackground` |
| `alwaysAutoResize` | `ImGuiWindowFlags_AlwaysAutoResize` |
| `noNavFocus` | `ImGuiWindowFlags_NoNavFocus` |
| `noNav` | `ImGuiWindowFlags_NoNav` |
| `noDecoration` | `ImGuiWindowFlags_NoDecoration` |
| `noInputs` | `ImGuiWindowFlags_NoInputs` |
| `noScrollWithMouse` | `ImGuiWindowFlags_NoScrollWithMouse` |
| `horizontalScrollbar` | `ImGuiWindowFlags_HorizontalScrollbar` |
| `alwaysVerticalScrollbar` | `ImGuiWindowFlags_AlwaysVerticalScrollbar` |
| `alwaysHorizontalScrollbar` | `ImGuiWindowFlags_AlwaysHorizontalScrollbar` |

### Window Positioning & Sizing

New props that generate `SetNextWindow*` calls **before** `begin_window` in the emitter. No renderer signature change.

| Prop | Type | ImGui Call |
|------|------|-----------|
| `x` | `number` | `SetNextWindowPos` (requires `y` too) |
| `y` | `number` | `SetNextWindowPos` (requires `x` too) |
| `width` | `number` | `SetNextWindowSize` |
| `height` | `number` | `SetNextWindowSize` |
| `forcePosition` | `boolean` | Changes pos condition from `ImGuiCond_Once` to `ImGuiCond_Always` |
| `forceSize` | `boolean` | Changes size condition from `ImGuiCond_Once` to `ImGuiCond_Always` |
| `minWidth` | `number` | `SetNextWindowSizeConstraints` min.x |
| `minHeight` | `number` | `SetNextWindowSizeConstraints` min.y |
| `maxWidth` | `number` | `SetNextWindowSizeConstraints` max.x |
| `maxHeight` | `number` | `SetNextWindowSizeConstraints` max.y |
| `bgAlpha` | `number` | `SetNextWindowBgAlpha` (0.0-1.0) |

Default condition is `ImGuiCond_Once` — position/size is set on the first frame, then user can drag/resize freely. Setting `forcePosition` or `forceSize` to `true` locks every frame.

For size constraints, any omitted min defaults to `0.0f`, any omitted max defaults to `FLT_MAX`.

**Example generated C++:**
```cpp
ImGui::SetNextWindowPos(ImVec2(100.0f, 200.0f), ImGuiCond_Once);
ImGui::SetNextWindowSize(ImVec2(400.0f, 300.0f), ImGuiCond_Once);
ImGui::SetNextWindowSizeConstraints(ImVec2(200.0f, 150.0f), ImVec2(800.0f, 600.0f));
ImGui::SetNextWindowBgAlpha(0.8f);
imx::renderer::begin_window("My Window", 0, nullptr, {});
```

---

## Batch 2: Popup/Combo/MultiSelect

### Context Menu `mouseButton` Prop

Add `mouseButton` string prop to `<ContextMenu>`:

| Value | ImGui Constant |
|-------|---------------|
| `"left"` | `ImGuiMouseButton_Left` (0) |
| `"right"` | `ImGuiMouseButton_Right` (1, default) |
| `"middle"` | `ImGuiMouseButton_Middle` (2) |

Renderer change: `begin_context_menu_item` and `begin_context_menu_window` get `int mouse_button = 1` parameter. Emitter maps string to integer.

### Modal Flags

Add window flag boolean props to `<Modal>` (same as Window where relevant):
- `noTitleBar`, `noResize`, `noMove`, `noScrollbar`, `noCollapse`, `alwaysAutoResize`, `noBackground`, `horizontalScrollbar`

Renderer change: `begin_modal` gets `int flags = 0` parameter, passed to `BeginPopupModal`.

### Manual Combo (Begin/End Mode)

Overloaded `<Combo>` component:
- `items` prop present → simple mode (existing behavior, unchanged)
- Children present (no `items`) → manual Begin/End mode

The compiler detects the mode statically in `lowering.ts` based on whether children exist.

**New manual-mode props:**

| Prop | Type | Notes |
|------|------|-------|
| `preview` | `string` | Text shown when closed (`BeginCombo` preview_value) |
| `noArrowButton` | `boolean` | `ImGuiComboFlags_NoArrowButton` |
| `noPreview` | `boolean` | `ImGuiComboFlags_NoPreview` |
| `heightSmall` | `boolean` | `ImGuiComboFlags_HeightSmall` |
| `heightLarge` | `boolean` | `ImGuiComboFlags_HeightLarge` |
| `heightRegular` | `boolean` | `ImGuiComboFlags_HeightRegular` |

Existing props (`label`, `value`, `onChange`, `style`) work in both modes.

**Renderer additions:**
```cpp
bool begin_combo(const char* label, const char* preview, int flags = 0, const Style& style = {});
void end_combo();
```

**Example TSX:**
```tsx
<Combo label="Color" preview={colors[selected]}>
  {colors.map((c, i) => (
    <Selectable label={c} selected={i === selected} onClick={() => setSelected(i)} />
  ))}
</Combo>
```

**Generated C++:**
```cpp
if (imx::renderer::begin_combo("Color", colors[selected].c_str(), 0, {})) {
    // ... selectable children ...
    imx::renderer::end_combo();
}
```

### MultiSelect

New `<MultiSelect>` component wrapping `BeginMultiSelect`/`EndMultiSelect`.

Thin wrapper approach — C++ struct owns selection state (consistent with struct binding philosophy). The `onSelectionChange` callback receives `ImGuiMultiSelectIO*` for the user to process, same pattern as `onSort` in sortable tables.

**Props:**

| Prop | Type | Notes |
|------|------|-------|
| `singleSelect` | `boolean` | `ImGuiMultiSelectFlags_SingleSelect` |
| `noSelectAll` | `boolean` | `ImGuiMultiSelectFlags_NoSelectAll` |
| `noRangeSelect` | `boolean` | `ImGuiMultiSelectFlags_NoRangeSelect` |
| `noAutoSelect` | `boolean` | `ImGuiMultiSelectFlags_NoAutoSelect` |
| `noAutoClear` | `boolean` | `ImGuiMultiSelectFlags_NoAutoClear` |
| `selectionSize` | `number` | Current count of selected items |
| `itemsCount` | `number` | Total item count |
| `onSelectionChange` | `callback` | Receives `ImGuiMultiSelectIO*` for processing |

**Selectable enhancement:** Add `selectionIndex` number prop that maps to `SetNextItemSelectionUserData(index)` before rendering the Selectable. Only emitted when inside a `<MultiSelect>`.

**Renderer additions:**
```cpp
ImGuiMultiSelectIO* begin_multi_select(int flags, int selection_size, int items_count);
ImGuiMultiSelectIO* end_multi_select();
void set_next_item_selection_data(int index);
```

**Example TSX:**
```tsx
<MultiSelect selectionSize={selectedCount} itemsCount={items.length}
             onSelectionChange={(io) => applySelection(io)}>
  {items.map((item, i) => (
    <Selectable label={item.name} selected={item.selected} selectionIndex={i} />
  ))}
</MultiSelect>
```

---

## Batch 3: Viewport API

ImGui's multi-viewport is already enabled via `ImGuiConfigFlags_ViewportsEnable` in the docking branch. Viewports are implicit — dragging a window outside the main window creates an OS window automatically.

### Window Viewport Props

| Prop | Type | Notes |
|------|------|-------|
| `noViewport` | `boolean` | Pins window to main viewport via `SetNextWindowViewport(GetMainViewport()->ID)` before `Begin` |
| `viewportAlwaysOnTop` | `boolean` | Sets `ImGuiViewportFlags_TopMost` on the window's viewport after `Begin` |

`noViewport` is emitted before `begin_window` (same pattern as positioning props). `viewportAlwaysOnTop` requires renderer support — set inside `begin_window` after `ImGui::Begin()` by reading `GetWindowViewport()->Flags`.

### C++ Viewport Helper Functions

Exposed as `imx::renderer::` functions for use in struct callbacks:

```cpp
ImVec2 get_main_viewport_pos();
ImVec2 get_main_viewport_size();
ImVec2 get_main_viewport_work_pos();
ImVec2 get_main_viewport_work_size();
```

These are C++ API only (not TSX components). Users call them in their struct logic for responsive positioning.

---

## Files Modified Per Deliverable

Full pipeline for each new component/prop:

1. `compiler/src/components.ts` — prop definitions
2. `compiler/src/ir.ts` — IR node types (if new components)
3. `compiler/src/lowering.ts` — AST to IR lowering
4. `compiler/src/emitter.ts` — IR to C++ emission
5. `include/imx/renderer.h` — C++ function declarations
6. `renderer/components.cpp` — C++ function implementations
7. `examples/hello/imx.d.ts` — TypeScript type definitions
8. `compiler/src/init.ts` — TypeScript type definitions (init scaffold)
9. `compiler/dist/` — rebuilt compiler output

Documentation updates:
- `CLAUDE.md` — current status
- `docs/api-reference.md`
- `docs/llm-prompt-reference.md`

## Size Impact

~0 KB — all thin wrappers around existing ImGui calls.

## Exit Criteria

- Full control over window behavior and popup triggers from TSX
- Manual combo mode with arbitrary children content
- Multi-select pattern with struct-bound selection state
- Viewport hints for pinning/floating windows
