# Phase 17: Window & Popup Control — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose remaining ImGui window and popup features to TSX — window flags, positioning/sizing, popup triggers, manual combo mode, multi-select, and viewport hints.

**Architecture:** Three batches building on each other. Batch 1 adds window control (flags, positioning, constraints) via emitter-only changes. Batch 2 adds popup enhancements, manual Combo (Begin/End mode via overloaded `<Combo>`), and `<MultiSelect>`. Batch 3 adds viewport hints. Each batch touches the full pipeline: `components.ts` → `ir.ts` → `lowering.ts` → `emitter.ts` → `renderer.h` → `components.cpp` → `imx.d.ts`.

**Tech Stack:** TypeScript compiler, C++20, ImGui v1.92.7-docking, CMake

---

## Batch 1: Window Control

### Task 1: Add New Window Flag Props to Compiler

**Files:**
- Modify: `compiler/src/components.ts:31-45`
- Modify: `compiler/src/emitter.ts:995-1021`

- [ ] **Step 1: Add new flag props to Window component definition**

In `compiler/src/components.ts`, add the new boolean props to the Window component (after `noScrollbar` on line 41):

```typescript
Window: {
    props: {
        title: { type: 'string', required: true },
        open: { type: 'boolean', required: false },
        onClose: { type: 'callback', required: false },
        noTitleBar: { type: 'boolean', required: false },
        noResize: { type: 'boolean', required: false },
        noMove: { type: 'boolean', required: false },
        noCollapse: { type: 'boolean', required: false },
        noDocking: { type: 'boolean', required: false },
        noScrollbar: { type: 'boolean', required: false },
        noBackground: { type: 'boolean', required: false },
        alwaysAutoResize: { type: 'boolean', required: false },
        noNavFocus: { type: 'boolean', required: false },
        noNav: { type: 'boolean', required: false },
        noDecoration: { type: 'boolean', required: false },
        noInputs: { type: 'boolean', required: false },
        noScrollWithMouse: { type: 'boolean', required: false },
        horizontalScrollbar: { type: 'boolean', required: false },
        alwaysVerticalScrollbar: { type: 'boolean', required: false },
        alwaysHorizontalScrollbar: { type: 'boolean', required: false },
        style: { type: 'style', required: false },
    },
    hasChildren: true, isContainer: true,
},
```

- [ ] **Step 2: Add new flag emission in emitter**

In `compiler/src/emitter.ts`, add the new flag checks after line 1003 (after `noScrollbar`):

```typescript
if (node.props['noBackground'] === 'true') flagParts.push('ImGuiWindowFlags_NoBackground');
if (node.props['alwaysAutoResize'] === 'true') flagParts.push('ImGuiWindowFlags_AlwaysAutoResize');
if (node.props['noNavFocus'] === 'true') flagParts.push('ImGuiWindowFlags_NoNavFocus');
if (node.props['noNav'] === 'true') flagParts.push('ImGuiWindowFlags_NoNav');
if (node.props['noDecoration'] === 'true') flagParts.push('ImGuiWindowFlags_NoDecoration');
if (node.props['noInputs'] === 'true') flagParts.push('ImGuiWindowFlags_NoInputs');
if (node.props['noScrollWithMouse'] === 'true') flagParts.push('ImGuiWindowFlags_NoScrollWithMouse');
if (node.props['horizontalScrollbar'] === 'true') flagParts.push('ImGuiWindowFlags_HorizontalScrollbar');
if (node.props['alwaysVerticalScrollbar'] === 'true') flagParts.push('ImGuiWindowFlags_AlwaysVerticalScrollbar');
if (node.props['alwaysHorizontalScrollbar'] === 'true') flagParts.push('ImGuiWindowFlags_AlwaysHorizontalScrollbar');
```

- [ ] **Step 3: Build compiler and run tests**

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass, `compiler/dist/` updated.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/components.ts compiler/src/emitter.ts
git commit -m "feat(compiler): add 10 new Window flag props"
```

### Task 2: Add Window Positioning & Sizing Props

**Files:**
- Modify: `compiler/src/components.ts:31-45` (Window props)
- Modify: `compiler/src/emitter.ts:995-1021` (Window begin emission)

- [ ] **Step 1: Add positioning/sizing props to Window component definition**

In `compiler/src/components.ts`, add these props to the Window definition (after the flag booleans, before `style`):

```typescript
x: { type: 'number', required: false },
y: { type: 'number', required: false },
width: { type: 'number', required: false },
height: { type: 'number', required: false },
forcePosition: { type: 'boolean', required: false },
forceSize: { type: 'boolean', required: false },
minWidth: { type: 'number', required: false },
minHeight: { type: 'number', required: false },
maxWidth: { type: 'number', required: false },
maxHeight: { type: 'number', required: false },
bgAlpha: { type: 'number', required: false },
```

- [ ] **Step 2: Emit SetNextWindow* calls before begin_window in emitter**

In `compiler/src/emitter.ts`, in the `case 'Window':` block (line 995), add these lines **before** the `const openExpr` line (line 1006). Insert after the `const flags = ...` line (line 1004):

```typescript
// Window positioning
const xExpr = node.props['x'];
const yExpr = node.props['y'];
if (xExpr && yExpr) {
    const posCond = node.props['forcePosition'] === 'true' ? 'ImGuiCond_Always' : 'ImGuiCond_Once';
    lines.push(`${indent}ImGui::SetNextWindowPos(ImVec2(${xExpr}, ${yExpr}), ${posCond});`);
}

// Window sizing
const wExpr = node.props['width'];
const hExpr = node.props['height'];
if (wExpr || hExpr) {
    const sizeCond = node.props['forceSize'] === 'true' ? 'ImGuiCond_Always' : 'ImGuiCond_Once';
    const sw = wExpr ?? '0.0f';
    const sh = hExpr ?? '0.0f';
    lines.push(`${indent}ImGui::SetNextWindowSize(ImVec2(${sw}, ${sh}), ${sizeCond});`);
}

// Window size constraints
const minW = node.props['minWidth'];
const minH = node.props['minHeight'];
const maxW = node.props['maxWidth'];
const maxH = node.props['maxHeight'];
if (minW || minH || maxW || maxH) {
    const cminW = minW ?? '0.0f';
    const cminH = minH ?? '0.0f';
    const cmaxW = maxW ?? 'FLT_MAX';
    const cmaxH = maxH ?? 'FLT_MAX';
    lines.push(`${indent}ImGui::SetNextWindowSizeConstraints(ImVec2(${cminW}, ${cminH}), ImVec2(${cmaxW}, ${cmaxH}));`);
}

// Window background alpha
const bgAlpha = node.props['bgAlpha'];
if (bgAlpha) {
    lines.push(`${indent}ImGui::SetNextWindowBgAlpha(${bgAlpha});`);
}
```

- [ ] **Step 3: Build compiler and run tests**

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/components.ts compiler/src/emitter.ts
git commit -m "feat(compiler): add Window positioning, sizing, and constraints"
```

### Task 3: Update TypeScript Type Definitions

**Files:**
- Modify: `examples/hello/imx.d.ts:50` (WindowProps)
- Modify: `compiler/src/init.ts` (IMX_DTS WindowProps)

- [ ] **Step 1: Update WindowProps in examples/hello/imx.d.ts**

Replace the existing WindowProps interface (line 50) with:

```typescript
interface WindowProps { title: string; open?: boolean; onClose?: () => void; noTitleBar?: boolean; noResize?: boolean; noMove?: boolean; noCollapse?: boolean; noDocking?: boolean; noScrollbar?: boolean; noBackground?: boolean; alwaysAutoResize?: boolean; noNavFocus?: boolean; noNav?: boolean; noDecoration?: boolean; noInputs?: boolean; noScrollWithMouse?: boolean; horizontalScrollbar?: boolean; alwaysVerticalScrollbar?: boolean; alwaysHorizontalScrollbar?: boolean; x?: number; y?: number; width?: number; height?: number; forcePosition?: boolean; forceSize?: boolean; minWidth?: number; minHeight?: number; maxWidth?: number; maxHeight?: number; bgAlpha?: number; style?: Style; children?: any; }
```

- [ ] **Step 2: Update WindowProps in compiler/src/init.ts**

Find the WindowProps line in the `IMX_DTS` string in `compiler/src/init.ts` and replace it with the same interface definition as Step 1.

- [ ] **Step 3: Build compiler**

Run: `cd compiler && npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add examples/hello/imx.d.ts compiler/src/init.ts
git commit -m "feat(types): update WindowProps with new flags, positioning, sizing"
```

### Task 4: Build and Test Window Features End-to-End

**Files:**
- Modify: `examples/hello/App.tsx` (add a test window)

- [ ] **Step 1: Add a Phase 17 showcase window to App.tsx**

Add a new window to the hello app that demonstrates the new features:

```tsx
<Window title="Phase 17: Window Control" 
        x={50} y={50} width={400} height={300}
        minWidth={200} minHeight={150} maxWidth={800} maxHeight={600}
        noScrollWithMouse horizontalScrollbar
        bgAlpha={0.95}>
  <Text>Window with positioning, sizing, and constraints</Text>
  <Text>Drag to reposition (initial pos set once)</Text>
  <Text>Resize within min/max constraints</Text>
</Window>
```

- [ ] **Step 2: Build and run the full app**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Build succeeds. Run `build/Debug/hello_app.exe` and verify:
- Window appears at (50, 50) with size 400x300
- Window can be dragged/resized
- Window respects min/max constraints
- Horizontal scrollbar appears
- Background is slightly transparent

- [ ] **Step 3: Commit**

```bash
git add examples/hello/App.tsx compiler/dist/
git commit -m "feat: add Phase 17 Window control showcase"
```

---

## Batch 2: Popup/Combo/MultiSelect

### Task 5: Add ContextMenu mouseButton Prop

**Files:**
- Modify: `compiler/src/components.ts:934-940` (ContextMenu)
- Modify: `compiler/src/emitter.ts:1247-1255` (ContextMenu emission)
- Modify: `include/imx/renderer.h:209-210` (context menu signatures)
- Modify: `renderer/components.cpp:303-313` (context menu implementations)

- [ ] **Step 1: Add mouseButton prop to ContextMenu component**

In `compiler/src/components.ts`, update the ContextMenu definition:

```typescript
ContextMenu: {
    props: {
        id: { type: 'string', required: false },
        target: { type: 'string', required: false },
        mouseButton: { type: 'string', required: false },
    },
    hasChildren: true, isContainer: true,
},
```

- [ ] **Step 2: Update renderer signatures**

In `include/imx/renderer.h`, update the context menu function signatures:

```cpp
bool begin_context_menu_item(const char* id = nullptr, int mouse_button = 1);
bool begin_context_menu_window(const char* id = nullptr, int mouse_button = 1);
```

- [ ] **Step 3: Update renderer implementations**

In `renderer/components.cpp`, update the context menu functions:

```cpp
bool begin_context_menu_item(const char* id, int mouse_button) {
    return ImGui::BeginPopupContextItem((id && id[0] != '\0') ? id : nullptr, mouse_button);
}

bool begin_context_menu_window(const char* id, int mouse_button) {
    return ImGui::BeginPopupContextWindow((id && id[0] != '\0') ? id : nullptr, mouse_button);
}
```

- [ ] **Step 4: Update emitter to pass mouseButton**

In `compiler/src/emitter.ts`, update the ContextMenu case (line 1247):

```typescript
case 'ContextMenu': {
    const idExpr = node.props['id'];
    const idArg = idExpr ? asCharPtr(idExpr) : 'nullptr';
    const mbExpr = node.props['mouseButton'];
    let mouseButtonArg = '1'; // default: right click
    if (mbExpr === '"left"') mouseButtonArg = '0';
    else if (mbExpr === '"middle"') mouseButtonArg = '2';
    if (node.props['target'] === '"window"') {
        lines.push(`${indent}if (imx::renderer::begin_context_menu_window(${idArg}, ${mouseButtonArg})) {`);
    } else {
        lines.push(`${indent}if (imx::renderer::begin_context_menu_item(${idArg}, ${mouseButtonArg})) {`);
    }
    break;
}
```

- [ ] **Step 5: Update TypeScript types**

In `examples/hello/imx.d.ts`, update ContextMenuProps (line 66):

```typescript
interface ContextMenuProps { id?: string; target?: "item" | "window"; mouseButton?: "left" | "right" | "middle"; children?: any; }
```

Update the same in `compiler/src/init.ts` IMX_DTS.

- [ ] **Step 6: Build and test**

Run: `cd compiler && npm run build && npx vitest run && cd .. && cmake --build build --target hello_app`
Expected: All tests pass, app builds.

- [ ] **Step 7: Commit**

```bash
git add compiler/src/components.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp examples/hello/imx.d.ts compiler/src/init.ts
git commit -m "feat: add mouseButton prop to ContextMenu"
```

### Task 6: Add Modal Window Flags

**Files:**
- Modify: `compiler/src/components.ts:416-424` (Modal)
- Modify: `compiler/src/emitter.ts:1123-1144` (Modal emission)
- Modify: `include/imx/renderer.h:288` (begin_modal signature)
- Modify: `renderer/components.cpp:743-774` (begin_modal implementation)

- [ ] **Step 1: Add flag props to Modal component definition**

In `compiler/src/components.ts`, update Modal:

```typescript
Modal: {
    props: {
        title: { type: 'string', required: true },
        open: { type: 'boolean', required: false },
        onClose: { type: 'callback', required: false },
        noTitleBar: { type: 'boolean', required: false },
        noResize: { type: 'boolean', required: false },
        noMove: { type: 'boolean', required: false },
        noScrollbar: { type: 'boolean', required: false },
        noCollapse: { type: 'boolean', required: false },
        alwaysAutoResize: { type: 'boolean', required: false },
        noBackground: { type: 'boolean', required: false },
        horizontalScrollbar: { type: 'boolean', required: false },
        style: { type: 'style', required: false },
    },
    hasChildren: true, isContainer: true,
},
```

- [ ] **Step 2: Update renderer signature**

In `include/imx/renderer.h`, update begin_modal:

```cpp
bool begin_modal(const char* title, bool open, bool* p_open, int flags = 0, const Style& style = {});
```

- [ ] **Step 3: Update renderer implementation**

In `renderer/components.cpp`, update begin_modal to pass flags to `BeginPopupModal`:

```cpp
bool begin_modal(const char* title, bool open, bool* user_closed, int flags, const Style& style) {
    // No before_child() — modals are overlays, not part of parent layout
    if (user_closed) *user_closed = false;

    if (open && !ImGui::IsPopupOpen(title)) {
        ImGui::OpenPopup(title);
    }
    if (!open && ImGui::IsPopupOpen(title)) {
        if (ImGui::BeginPopupModal(title, nullptr, flags)) {
            ImGui::CloseCurrentPopup();
            ImGui::EndPopup();
        }
        return false;
    }
    if (!open) return false;

    bool p_open = true;
    bool visible = ImGui::BeginPopupModal(title, &p_open, flags);
    if (!visible && !p_open) {
        if (user_closed) *user_closed = true;
    }
    return visible;
}
```

- [ ] **Step 4: Add flag building in emitter**

In `compiler/src/emitter.ts`, update the Modal case (line 1123). Add flag building before the open/close logic:

```typescript
case 'Modal': {
    const title = asCharPtr(node.props['title'] ?? '""');

    // Build flags
    const flagParts: string[] = [];
    if (node.props['noTitleBar'] === 'true') flagParts.push('ImGuiWindowFlags_NoTitleBar');
    if (node.props['noResize'] === 'true') flagParts.push('ImGuiWindowFlags_NoResize');
    if (node.props['noMove'] === 'true') flagParts.push('ImGuiWindowFlags_NoMove');
    if (node.props['noScrollbar'] === 'true') flagParts.push('ImGuiWindowFlags_NoScrollbar');
    if (node.props['noCollapse'] === 'true') flagParts.push('ImGuiWindowFlags_NoCollapse');
    if (node.props['alwaysAutoResize'] === 'true') flagParts.push('ImGuiWindowFlags_AlwaysAutoResize');
    if (node.props['noBackground'] === 'true') flagParts.push('ImGuiWindowFlags_NoBackground');
    if (node.props['horizontalScrollbar'] === 'true') flagParts.push('ImGuiWindowFlags_HorizontalScrollbar');
    const modalFlags = flagParts.length > 0 ? flagParts.join(' | ') : '0';

    const openExpr = node.props['open'];
    const onCloseExpr = node.props['onClose'];
    if (openExpr) {
        windowOpenStack.push(true);
        let onCloseBody: string | null = null;
        if (onCloseExpr) {
            const lambdaMatch = onCloseExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\s*\}$/);
            onCloseBody = lambdaMatch ? lambdaMatch[1] : `${onCloseExpr};`;
        }
        modalOnCloseStack.push(onCloseBody);
        lines.push(`${indent}{`);
        lines.push(`${indent}    bool modal_closed = false;`);
        lines.push(`${indent}    if (imx::renderer::begin_modal(${title}, ${openExpr}, &modal_closed, ${modalFlags})) {`);
    } else {
        windowOpenStack.push(false);
        modalOnCloseStack.push(null);
        lines.push(`${indent}if (imx::renderer::begin_modal(${title}, true, nullptr, ${modalFlags})) {`);
    }
    break;
}
```

- [ ] **Step 5: Update TypeScript types**

In `examples/hello/imx.d.ts`, update ModalProps (line 145):

```typescript
interface ModalProps { title: string; open?: boolean; onClose?: () => void; noTitleBar?: boolean; noResize?: boolean; noMove?: boolean; noScrollbar?: boolean; noCollapse?: boolean; alwaysAutoResize?: boolean; noBackground?: boolean; horizontalScrollbar?: boolean; style?: Style; children?: any; }
```

Update the same in `compiler/src/init.ts` IMX_DTS.

- [ ] **Step 6: Build and test**

Run: `cd compiler && npm run build && npx vitest run && cd .. && cmake --build build --target hello_app`
Expected: All tests pass, app builds.

- [ ] **Step 7: Commit**

```bash
git add compiler/src/components.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp examples/hello/imx.d.ts compiler/src/init.ts
git commit -m "feat: add window flag props to Modal"
```

### Task 7: Add Manual Combo (Begin/End Mode)

**Files:**
- Modify: `compiler/src/components.ts:236-246` (Combo)
- Modify: `compiler/src/ir.ts:44-67,162` (IRNode union, new IR types)
- Modify: `compiler/src/lowering.ts:484-646,738-739,1858-1866` (Combo lowering)
- Modify: `compiler/src/emitter.ts:526-528,1955-1999` (Combo emission)
- Modify: `include/imx/renderer.h:259` (new begin_combo/end_combo)
- Modify: `renderer/components.cpp:574-580` (new begin_combo/end_combo)

- [ ] **Step 1: Update Combo component definition to support both modes**

In `compiler/src/components.ts`, update Combo to make `items` optional and add new props:

```typescript
Combo: {
    props: withItemInteractionProps({
        label: { type: 'string', required: true },
        value: { type: 'number', required: false },
        onChange: { type: 'callback', required: false },
        items: { type: 'string', required: false },
        preview: { type: 'string', required: false },
        noArrowButton: { type: 'boolean', required: false },
        noPreview: { type: 'boolean', required: false },
        heightSmall: { type: 'boolean', required: false },
        heightLarge: { type: 'boolean', required: false },
        heightRegular: { type: 'boolean', required: false },
        width: { type: 'number', required: false },
        style: { type: 'style', required: false },
    }),
    hasChildren: true, isContainer: true,
},
```

Note: `hasChildren: true` and `isContainer: true` so it can hold children. The `items` prop being absent signals manual mode.

- [ ] **Step 2: Add IR types for manual combo**

In `compiler/src/ir.ts`, add `IRBeginCombo` and `IREndCombo` interfaces after the IRCombo interface (line 162):

```typescript
export interface IRBeginCombo {
    kind: 'begin_combo';
    label: string;
    preview: string;
    flags: string[];
    width?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IREndCombo { kind: 'end_combo'; }
```

Add `IRBeginCombo | IREndCombo` to the `IRNode` type union (line 44-67).

- [ ] **Step 3: Update lowering to handle both Combo modes**

In `compiler/src/lowering.ts`, the Combo is currently only lowered in `lowerJsxSelfClosing` (line 738). We need to:

a) Add Combo handling in `lowerJsxElement` (the function for elements with children, line 484). Add this before the generic container handling block (before `if (def.isContainer)` at line 573):

```typescript
if (name === 'Combo') {
    // Manual combo mode — has children, no items prop
    const label = attrs['label'] ?? '""';
    const preview = attrs['preview'] ?? '""';
    const flagNames: string[] = [];
    if (attrs['noArrowButton'] === 'true') flagNames.push('ImGuiComboFlags_NoArrowButton');
    if (attrs['noPreview'] === 'true') flagNames.push('ImGuiComboFlags_NoPreview');
    if (attrs['heightSmall'] === 'true') flagNames.push('ImGuiComboFlags_HeightSmall');
    if (attrs['heightLarge'] === 'true') flagNames.push('ImGuiComboFlags_HeightLarge');
    if (attrs['heightRegular'] === 'true') flagNames.push('ImGuiComboFlags_HeightRegular');
    const item = lowerItemInteraction(attrs, rawAttrs, ctx);
    body.push({ kind: 'begin_combo', label, preview, flags: flagNames, width: attrs['width'], style: attrs['style'], item, loc: getLoc(node, ctx) } as IRBeginCombo);
    for (const child of node.children) {
        lowerJsxChild(child, body, ctx);
    }
    body.push({ kind: 'end_combo' } as IREndCombo);
    return;
}
```

b) Keep the existing self-closing `lowerCombo` for the `items` mode — it still works for `<Combo items={...} />`.

- [ ] **Step 4: Add emission for begin_combo/end_combo**

In `compiler/src/emitter.ts`, add cases in the main emit switch (near line 526 where `case 'combo':` is):

```typescript
case 'begin_combo': {
    const n = node as IRBeginCombo;
    emitLocComment(n.loc, 'Combo (manual)', lines, indent);
    const label = asCharPtr(n.label);
    const preview = asCharPtr(n.preview);
    const flagStr = n.flags.length > 0 ? n.flags.join(' | ') : '0';
    if (n.width) {
        lines.push(`${indent}ImGui::PushItemWidth(${n.width});`);
    }
    const callExpr = `imx::renderer::begin_combo(${label}, ${preview}, ${flagStr})`;
    const resultVar = emitBoolWidgetCall(callExpr, n.item, lines, indent);
    lines.push(`${indent}if (${resultVar || callExpr}) {`);
    break;
}
case 'end_combo':
    lines.push(`${indent}imx::renderer::end_combo();`);
    lines.push(`${indent}}`);
    break;
```

Note: Need to import IRBeginCombo and IREndCombo at the top of emitter.ts.

- [ ] **Step 5: Add renderer functions**

In `include/imx/renderer.h`, add after the existing `combo` signature (line 259):

```cpp
bool begin_combo(const char* label, const char* preview, int flags = 0, const Style& style = {});
void end_combo();
```

In `renderer/components.cpp`, add after the existing `combo` function (line 580):

```cpp
bool begin_combo(const char* label, const char* preview, int flags, const Style& style) {
    before_child();
    return ImGui::BeginCombo(label, preview, flags);
}

void end_combo() {
    ImGui::EndCombo();
}
```

- [ ] **Step 6: Update TypeScript types**

In `examples/hello/imx.d.ts`, update ComboProps (line 101):

```typescript
interface ComboProps extends ItemInteractionProps { label: string; value?: number; onChange?: (v: number) => void; items?: string[]; preview?: string; noArrowButton?: boolean; noPreview?: boolean; heightSmall?: boolean; heightLarge?: boolean; heightRegular?: boolean; width?: number; style?: Style; children?: any; }
```

Update the same in `compiler/src/init.ts` IMX_DTS.

- [ ] **Step 7: Build and test**

Run: `cd compiler && npm run build && npx vitest run && cd .. && cmake --build build --target hello_app`
Expected: All tests pass, app builds. Existing simple Combo still works.

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp examples/hello/imx.d.ts compiler/src/init.ts
git commit -m "feat: add manual Combo Begin/End mode with children"
```

### Task 8: Add MultiSelect Component

**Files:**
- Modify: `compiler/src/components.ts` (new MultiSelect component)
- Modify: `compiler/src/ir.ts` (new IR types)
- Modify: `compiler/src/lowering.ts` (MultiSelect lowering)
- Modify: `compiler/src/emitter.ts` (MultiSelect emission)
- Modify: `include/imx/renderer.h` (new functions)
- Modify: `renderer/components.cpp` (new implementations)
- Modify: `compiler/src/components.ts:342-350` (Selectable — add selectionIndex)

- [ ] **Step 1: Add MultiSelect component definition**

In `compiler/src/components.ts`, add the MultiSelect component definition (near the other container components):

```typescript
MultiSelect: {
    props: {
        singleSelect: { type: 'boolean', required: false },
        noSelectAll: { type: 'boolean', required: false },
        noRangeSelect: { type: 'boolean', required: false },
        noAutoSelect: { type: 'boolean', required: false },
        noAutoClear: { type: 'boolean', required: false },
        selectionSize: { type: 'number', required: false },
        itemsCount: { type: 'number', required: false },
        onSelectionChange: { type: 'callback', required: false },
    },
    hasChildren: true, isContainer: true,
},
```

- [ ] **Step 2: Add selectionIndex prop to Selectable**

In `compiler/src/components.ts`, update Selectable (line 342):

```typescript
Selectable: {
    props: withItemInteractionProps({
        label: { type: 'string', required: true },
        selected: { type: 'boolean', required: false },
        onSelect: { type: 'callback', required: false },
        selectionIndex: { type: 'number', required: false },
        style: { type: 'style', required: false },
    }),
    hasChildren: false, isContainer: false,
},
```

- [ ] **Step 3: Add IR types**

In `compiler/src/ir.ts`, add to the IRBeginContainer tag union:

Add `'MultiSelect'` to the tag union in `IRBeginContainer` and `IREndContainer`.

Update `IRSelectable` to include selectionIndex:

```typescript
export interface IRSelectable { kind: 'selectable'; label: string; selected: string; action: string[]; selectionIndex?: string; style?: string; item?: IRItemInteraction; loc?: SourceLoc; }
```

- [ ] **Step 4: Update lowering**

In `compiler/src/lowering.ts`, update `lowerSelectable` (line 1541) to capture `selectionIndex`:

```typescript
function lowerSelectable(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const selected = attrs['selected'] ?? 'false';
    const onSelectExpr = rawAttrs.get('onSelect');
    let action: string[] = [];
    if (onSelectExpr) {
        action = extractActionStatements(onSelectExpr, ctx);
    }
    const style = attrs['style'];
    const selectionIndex = attrs['selectionIndex'];
    const item = lowerItemInteraction(attrs, rawAttrs, ctx);
    body.push({ kind: 'selectable', label, selected, action, selectionIndex, style, item, loc });
}
```

- [ ] **Step 5: Update emitter for MultiSelect begin/end**

In `compiler/src/emitter.ts`, add handling in `emitBeginContainer` for the `'MultiSelect'` tag:

```typescript
case 'MultiSelect': {
    const flagParts: string[] = [];
    if (node.props['singleSelect'] === 'true') flagParts.push('ImGuiMultiSelectFlags_SingleSelect');
    if (node.props['noSelectAll'] === 'true') flagParts.push('ImGuiMultiSelectFlags_NoSelectAll');
    if (node.props['noRangeSelect'] === 'true') flagParts.push('ImGuiMultiSelectFlags_NoRangeSelect');
    if (node.props['noAutoSelect'] === 'true') flagParts.push('ImGuiMultiSelectFlags_NoAutoSelect');
    if (node.props['noAutoClear'] === 'true') flagParts.push('ImGuiMultiSelectFlags_NoAutoClear');
    const flags = flagParts.length > 0 ? flagParts.join(' | ') : '0';
    const selSize = node.props['selectionSize'] ?? '-1';
    const itemCount = node.props['itemsCount'] ?? '-1';
    lines.push(`${indent}{`);
    lines.push(`${indent}    auto* ms_io = imx::renderer::begin_multi_select(${flags}, ${selSize}, ${itemCount});`);
    break;
}
```

In `emitEndContainer`, add:

```typescript
case 'MultiSelect': {
    const onChangeExpr = node.props?.['onSelectionChange']; // need to pass from begin
    lines.push(`${indent}    auto* ms_io_end = imx::renderer::end_multi_select();`);
    // Note: onSelectionChange needs to be available here — store in a stack
    lines.push(`${indent}}`);
    break;
}
```

Wait — the end container doesn't have access to props. We need a stack pattern like modalOnCloseStack. Add a `multiSelectCallbackStack: (string | null)[]` at the top of the emitter, push in begin, pop in end:

In `emitBeginContainer` MultiSelect case, after the `begin_multi_select` line:
```typescript
const onChangeExpr = node.props['onSelectionChange'];
multiSelectCallbackStack.push(onChangeExpr ?? null);
```

In `emitEndContainer` MultiSelect case:
```typescript
case 'MultiSelect': {
    lines.push(`${indent}    auto* ms_io_end = imx::renderer::end_multi_select();`);
    const onChangeExpr = multiSelectCallbackStack.pop() ?? null;
    if (onChangeExpr) {
        lines.push(`${indent}    if (ms_io_end) { ${onChangeExpr}(ms_io_end); }`);
    }
    lines.push(`${indent}}`);
    break;
}
```

Declare `const multiSelectCallbackStack: (string | null)[] = [];` near the other stacks (like `windowOpenStack`, `modalOnCloseStack`).

- [ ] **Step 6: Update Selectable emitter for selectionIndex**

In `compiler/src/emitter.ts`, update `emitSelectable` (line 2233):

```typescript
function emitSelectable(node: IRSelectable, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Selectable', lines, indent);
    if (node.selectionIndex) {
        lines.push(`${indent}imx::renderer::set_next_item_selection_data(${node.selectionIndex});`);
    }
    const label = asCharPtr(node.label);
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('selectable_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::selectable(${label}, ${node.selected})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
```

- [ ] **Step 7: Add renderer functions**

In `include/imx/renderer.h`, add:

```cpp
ImGuiMultiSelectIO* begin_multi_select(int flags, int selection_size, int items_count);
ImGuiMultiSelectIO* end_multi_select();
void set_next_item_selection_data(int index);
```

In `renderer/components.cpp`, add:

```cpp
ImGuiMultiSelectIO* begin_multi_select(int flags, int selection_size, int items_count) {
    before_child();
    return ImGui::BeginMultiSelect(flags, selection_size, items_count);
}

ImGuiMultiSelectIO* end_multi_select() {
    return ImGui::EndMultiSelect();
}

void set_next_item_selection_data(int index) {
    ImGui::SetNextItemSelectionUserData(static_cast<ImGuiSelectionUserData>(index));
}
```

- [ ] **Step 8: Update TypeScript types**

In `examples/hello/imx.d.ts`, add MultiSelectProps and update SelectableProps:

```typescript
interface MultiSelectProps { singleSelect?: boolean; noSelectAll?: boolean; noRangeSelect?: boolean; noAutoSelect?: boolean; noAutoClear?: boolean; selectionSize?: number; itemsCount?: number; onSelectionChange?: (io: any) => void; children?: any; }
```

Update SelectableProps:
```typescript
interface SelectableProps extends ItemInteractionProps { label: string; selected?: boolean; onSelect?: () => void; selectionIndex?: number; style?: Style; }
```

Add `MultiSelect` to the JSX declarations section.

Update the same in `compiler/src/init.ts` IMX_DTS.

- [ ] **Step 9: Build and test**

Run: `cd compiler && npm run build && npx vitest run && cd .. && cmake --build build --target hello_app`
Expected: All tests pass, app builds.

- [ ] **Step 10: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp examples/hello/imx.d.ts compiler/src/init.ts
git commit -m "feat: add MultiSelect component and Selectable selectionIndex"
```

### Task 9: Test Batch 2 End-to-End

**Files:**
- Modify: `examples/hello/App.tsx`

- [ ] **Step 1: Add Batch 2 showcase to App.tsx**

Add a showcase window demonstrating manual combo and context menu mouseButton:

```tsx
<Window title="Phase 17: Popup & Combo">
  <Column gap={4}>
    <Text>Manual Combo (Begin/End mode):</Text>
    <Combo label="Pick Color" preview={colors[colorIdx]}>
      {colors.map((c, i) => (
        <Selectable label={c} selected={i === colorIdx} onSelect={() => setColorIdx(i)} />
      ))}
    </Combo>

    <Text>Left-click context menu:</Text>
    <Button label="Left-click me">
      <ContextMenu mouseButton="left">
        <MenuItem label="Option A" />
        <MenuItem label="Option B" />
      </ContextMenu>
    </Button>
  </Column>
</Window>
```

Add the necessary state (`colors` array and `colorIdx` useState) to the component.

- [ ] **Step 2: Build and run**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Build succeeds. Run `build/Debug/hello_app.exe` and verify:
- Manual combo dropdown shows selectable items
- Selecting an item updates the preview text
- Left-click context menu appears on left click (not right)

- [ ] **Step 3: Commit**

```bash
git add examples/hello/App.tsx compiler/dist/
git commit -m "feat: add Phase 17 Batch 2 showcase (manual combo, mouseButton)"
```

---

## Batch 3: Viewport API

### Task 10: Add Viewport Props and Helpers

**Files:**
- Modify: `compiler/src/components.ts` (Window — add viewport props)
- Modify: `compiler/src/emitter.ts` (Window emission — add viewport logic)
- Modify: `include/imx/renderer.h` (viewport helpers + begin_window update)
- Modify: `renderer/components.cpp` (viewport helpers + begin_window update)

- [ ] **Step 1: Add viewport props to Window component**

In `compiler/src/components.ts`, add to Window props (before `style`):

```typescript
noViewport: { type: 'boolean', required: false },
viewportAlwaysOnTop: { type: 'boolean', required: false },
```

- [ ] **Step 2: Emit noViewport as SetNextWindowViewport before begin_window**

In `compiler/src/emitter.ts`, in the Window case, add after the `bgAlpha` emission (added in Task 2) and before the `const openExpr` line:

```typescript
// Viewport control
if (node.props['noViewport'] === 'true') {
    lines.push(`${indent}ImGui::SetNextWindowViewport(ImGui::GetMainViewport()->ID);`);
}
```

- [ ] **Step 3: Handle viewportAlwaysOnTop in renderer**

This flag needs to be set after `ImGui::Begin()` since it reads from `GetWindowViewport()`. Add a new parameter to `begin_window`:

In `include/imx/renderer.h`, update:

```cpp
void begin_window(const char* title, int flags = 0, bool* p_open = nullptr, bool viewport_always_on_top = false, const Style& style = {});
```

In `renderer/components.cpp`, update:

```cpp
void begin_window(const char* title, int flags, bool* p_open, bool viewport_always_on_top, const Style& style) {
    before_child();
    ImGui::Begin(title, p_open, flags);
    if (viewport_always_on_top) {
        ImGuiViewport* vp = ImGui::GetWindowViewport();
        if (vp) vp->Flags |= ImGuiViewportFlags_TopMost;
    }
    if (style.font_size) {
        float scale = *style.font_size / ImGui::GetFontSize();
        ImGui::SetWindowFontScale(scale);
    }
}
```

- [ ] **Step 4: Update emitter to pass viewportAlwaysOnTop**

In `compiler/src/emitter.ts`, update the `begin_window` calls to include the new parameter. For the `openExpr` branch (line 1012):

```typescript
const vpOnTop = node.props['viewportAlwaysOnTop'] === 'true' ? 'true' : 'false';
lines.push(`${indent}    imx::renderer::begin_window(${title}, ${flags}, &win_open, ${vpOnTop});`);
```

And for the else branch (line 1018):
```typescript
const vpOnTop = node.props['viewportAlwaysOnTop'] === 'true' ? 'true' : 'false';
if (vpOnTop === 'true') {
    lines.push(`${indent}imx::renderer::begin_window(${title}, ${flags}, nullptr, true);`);
} else {
    lines.push(`${indent}imx::renderer::begin_window(${title}, ${flags});`);
}
```

- [ ] **Step 5: Add viewport helper functions**

In `include/imx/renderer.h`, add:

```cpp
ImVec2 get_main_viewport_pos();
ImVec2 get_main_viewport_size();
ImVec2 get_main_viewport_work_pos();
ImVec2 get_main_viewport_work_size();
```

In `renderer/components.cpp`, add:

```cpp
ImVec2 get_main_viewport_pos() {
    return ImGui::GetMainViewport()->Pos;
}

ImVec2 get_main_viewport_size() {
    return ImGui::GetMainViewport()->Size;
}

ImVec2 get_main_viewport_work_pos() {
    return ImGui::GetMainViewport()->WorkPos;
}

ImVec2 get_main_viewport_work_size() {
    return ImGui::GetMainViewport()->WorkSize;
}
```

- [ ] **Step 6: Update TypeScript types**

In `examples/hello/imx.d.ts`, add `noViewport?: boolean; viewportAlwaysOnTop?: boolean;` to WindowProps.

Update the same in `compiler/src/init.ts` IMX_DTS.

- [ ] **Step 7: Build and test**

Run: `cd compiler && npm run build && npx vitest run && cd .. && cmake --build build --target hello_app`
Expected: All tests pass, app builds.

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp examples/hello/imx.d.ts compiler/src/init.ts
git commit -m "feat: add viewport props and helper functions"
```

---

## Finalization

### Task 11: Update compiler/dist/ and Documentation

**Files:**
- Modify: `compiler/dist/` (rebuilt output)
- Modify: `CLAUDE.md`
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`

- [ ] **Step 1: Rebuild compiler/dist/**

Run: `cd compiler && npm run build`
Verify `compiler/dist/` has updated files.

- [ ] **Step 2: Update CLAUDE.md current status**

Add Phase 17 to the "Current status" section:

```
- Window & Popup Control (Phase 17): all `ImGuiWindowFlags` as boolean props, `x`/`y`/`width`/`height` positioning with `forcePosition`/`forceSize`, `minWidth`/`minHeight`/`maxWidth`/`maxHeight` size constraints, `bgAlpha`, `mouseButton` on `<ContextMenu>`, window flags on `<Modal>`, manual `<Combo>` Begin/End mode with children, `<MultiSelect>` with `onSelectionChange` callback, `selectionIndex` on `<Selectable>`, `noViewport`/`viewportAlwaysOnTop` viewport hints, `get_main_viewport_*()` C++ helpers
```

Update the "Next:" line to point at Phase 18.

- [ ] **Step 3: Update docs/api-reference.md**

Add sections for:
- New Window props (flags, positioning, sizing, constraints, bgAlpha, viewport)
- ContextMenu mouseButton prop
- Modal flag props
- Manual Combo mode with example
- MultiSelect component with example
- Selectable selectionIndex prop
- Viewport helper functions (C++ API)

- [ ] **Step 4: Update docs/llm-prompt-reference.md**

Add the new components and props so LLMs generate correct code.

- [ ] **Step 5: Commit all documentation and dist**

```bash
git add compiler/dist/ CLAUDE.md docs/api-reference.md docs/llm-prompt-reference.md
git commit -m "docs: update for Phase 17 — window & popup control complete"
```

### Task 12: Run Full Test Suite

- [ ] **Step 1: Run compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run C++ tests**

Run: `cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe`
Expected: All tests pass.

- [ ] **Step 3: Build and run hello app**

Run: `cmake --build build --target hello_app && ./build/Debug/hello_app.exe`
Expected: App runs, all Phase 17 features work correctly. Delete `build/Debug/imgui.ini` first if the app freezes.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: Phase 17 final adjustments"
```
