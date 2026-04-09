# Phase 18: Text & Display Variants — Design Spec

## Overview

Expose ImGui's text rendering variants and display helpers through the existing `<Text>` component and thin new components. Also fix the `horizontalScrollbar` infinite growth bug from Phase 17.

Size impact: ~0 KB (all existing ImGui calls)

## Bug Fix: horizontalScrollbar infinite growth

### Problem

`horizontalScrollbar` on `<Window>` causes infinite horizontal growth. Auto-sizing widgets inside `BeginGroup`/`EndGroup` (used by Row/Column/View) can feed back into the content width each frame.

### Fix strategy

1. Empirically reproduce: add `horizontalScrollbar` to a content-heavy window in the hello example, build, observe the exact behavior
2. Apply fix in the renderer's `begin_window`/`end_window` — most likely: after `ImGui::Begin()`, if `HorizontalScrollbar` is in flags, push an `ItemWidth` clamped to the visible window width (`ImGui::GetWindowWidth() * 0.65f`) to prevent auto-sizing widgets from using scroll-extended content width
3. Track the push with a static `std::vector<bool>` so `end_window` knows to pop
4. If empirical testing shows the issue is elsewhere (e.g., `EndGroup` specifically), adjust the fix accordingly

### Scope

- Renderer-only fix — no compiler/emitter changes needed
- The emitter already correctly emits `ImGuiWindowFlags_HorizontalScrollbar`

### Testing

Build hello app with `horizontalScrollbar` on a content-heavy window, verify scrollbar appears for wide content (long text, wide tables) without runaway growth.

## Feature 1: `<Text>` enhancement

### Current state

`<Text>` has only a `style` prop and children (text content). Emits `ImGui::TextV()`.

### New props

| Prop | Type | Description |
|------|------|-------------|
| color | number[] | 4-element RGBA array. Emits `ImGui::TextColored()` |
| disabled | boolean | Emits `ImGui::TextDisabled()` |
| wrapped | boolean | Emits `ImGui::TextWrapped()` |

### Emitter priority chain

When multiple props combine, the emitter selects the ImGui call:

1. `disabled` → `ImGui::TextDisabled()` (ignores `color` — disabled has its own grayed style)
2. `color` + `wrapped` → `ImGui::PushStyleColor(ImGuiCol_Text, ...)` + `ImGui::TextWrapped()` + `PopStyleColor()`
3. `color` alone → `ImGui::TextColored()`
4. `wrapped` alone → `ImGui::TextWrapped()`
5. Neither → `ImGui::TextV()` (current behavior, no change)

### Renderer additions

- `text_disabled(const char* fmt, ...)` — wraps `ImGui::TextDisabled()`
- `text_wrapped(const char* fmt, ...)` — wraps `ImGui::TextWrapped()`

No separate `text_colored` function needed — the emitter handles `TextColored` directly (inline `ImGui::TextColored()` call) or via `PushStyleColor` + `text_wrapped` for the color+wrapped combo.

### Pipeline

- `components.ts`: add `color` (number[]), `disabled` (boolean), `wrapped` (boolean) props to Text
- `ir.ts`: no change (Text already exists as leaf)
- `lowering.ts`: pass new props through to IR
- `emitter.ts`: priority chain selects the ImGui call
- `renderer.h` / `components.cpp`: add `text_disabled()`, `text_wrapped()`
- `imx.d.ts`: update TextProps interface

## Feature 2: `<Bullet />`

Standalone bullet point (no text). Maps to `ImGui::Bullet()`.

- Self-closing component, no required props (only `style`)
- `components.ts`: `Bullet: { props: { style }, hasChildren: false, isContainer: false }`
- Renderer: `bullet()` calls `before_child()` + `ImGui::Bullet()`
- Existing `<BulletText>` unchanged

## Feature 3: Selectable enhancements

Three new boolean props on the existing `<Selectable>` component:

| Prop | ImGui Flag |
|------|-----------|
| spanAllColumns | `ImGuiSelectableFlags_SpanAllColumns` |
| allowDoubleClick | `ImGuiSelectableFlags_AllowDoubleClick` |
| dontClosePopups | `ImGuiSelectableFlags_DontClosePopups` |

### Renderer change

`selectable()` signature adds `int flags = 0` parameter. Passes to `ImGui::Selectable(label, selected, flags)`.

### Emitter change

OR's flag parts from boolean props, same pattern as window flags and other flag-based components.

## Feature 4: ListBox manual mode

Dual-mode detection mirroring the `<Combo>` pattern from Phase 17.

### Simple mode (existing, no change)

```tsx
<ListBox label="Pick" value={x} onChange={setX} items={["A","B","C"]} />
```

Emits `ImGui::ListBox()` with items array.

### Manual mode (new)

```tsx
<ListBox label="Colors" width={200} height={120}>
  <Selectable label="Red" selected={idx === 0} onSelect={() => setIdx(0)} />
  <Selectable label="Green" selected={idx === 1} onSelect={() => setIdx(1)} />
</ListBox>
```

Emits `ImGui::BeginListBox()` / `EndListBox()` wrapping children.

### Detection

- Children present → manual mode (container)
- `items` prop present → simple mode
- Compiler validates: cannot have both `items` and children

### New props for manual mode

| Prop | Type | Description |
|------|------|-------------|
| width | number | ListBox width (0 = auto) |
| height | number | ListBox height (0 = auto) |

### Renderer additions

- `begin_list_box(const char* label, float width, float height)` — wraps `ImGui::BeginListBox()`
- `end_list_box()` — wraps `ImGui::EndListBox()`

### Compiler pipeline

- `lowering.ts`: detect children vs items (same pattern as Combo)
- Children → `IRBeginContainer` tag `ListBox` + `IREndContainer` tag `ListBox`
- Items → existing `IRLeaf` tag `ListBox`

## Hello example

Add `<Window title="Phase 18">` docked panel demonstrating:

- `<Text color={[1,0,0,1]}>Colored text</Text>`
- `<Text disabled>Grayed out text</Text>`
- `<Text wrapped>Long paragraph that wraps in narrow panels...</Text>`
- `<Text color={[0,1,0.5,1]} wrapped>Colored + wrapped combined</Text>`
- `<Bullet />` standalone with `<SameLine>` next to text
- `<Selectable spanAllColumns>` inside a table
- `<ListBox>` manual mode with Selectable children

Uses `useState` only — no struct binding needed for any Phase 18 features.

Dock layout updated to include the Phase 18 panel.

## Docs update (end of phase)

- `CLAUDE.md` — current status section
- `docs/api-reference.md` — Text new props, Bullet, Selectable new props, ListBox manual mode
- `docs/llm-prompt-reference.md` — same
- `docs/roadmap.md` — mark Phase 18 DONE
- `compiler/src/init.ts` — IMX_DTS type definitions
- All `imx.d.ts` copies
- `compiler/dist/` — rebuild and commit
