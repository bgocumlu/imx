# Phase 18: Text & Display Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose ImGui's text rendering variants and display helpers, fix horizontalScrollbar bug

**Architecture:** Extend `<Text>` with `color`/`disabled`/`wrapped` props (emitter picks the right ImGui call), add `<Bullet />` standalone component, enhance `<Selectable>` with flags, add ListBox manual mode (dual-mode like Combo). Fix horizontalScrollbar infinite growth in the renderer.

**Tech Stack:** TypeScript (compiler), C++20 (renderer/runtime), ImGui, CMake

---

### Task 0: Fix horizontalScrollbar infinite growth bug

**Files:**
- Modify: `renderer/components.cpp:225-240`
- Modify: `include/imx/renderer.h:168-169`

- [ ] **Step 1: Reproduce the bug**

Add `horizontalScrollbar` to a content-heavy window in `examples/hello/App.tsx` temporarily. Build and observe the runaway horizontal growth:

```bash
cd compiler && npm run build && cd ..
cmake --build build --target hello_app
```

Run `build/Debug/hello_app.exe` and observe the window with `horizontalScrollbar`. Content width should grow each frame. Note which widgets cause the growth (auto-sizing inputs vs fixed-width text).

- [ ] **Step 2: Apply fix in renderer**

In `renderer/components.cpp`, modify `begin_window` to clamp auto-sizing widget width when `HorizontalScrollbar` is set. Add a tracking stack for the push:

```cpp
// At file scope, near other statics (around line 13):
static std::vector<bool> g_window_item_width_pushed;
```

Modify `begin_window` (line 225):

```cpp
void begin_window(const char* title, int flags, bool* p_open, bool viewport_always_on_top, const Style& style) {
    before_child();
    ImGui::Begin(title, p_open, flags);
    if (flags & ImGuiWindowFlags_HorizontalScrollbar) {
        ImGui::PushItemWidth(ImGui::GetWindowWidth() * 0.65f);
        g_window_item_width_pushed.push_back(true);
    } else {
        g_window_item_width_pushed.push_back(false);
    }
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

Modify `end_window` (line 238):

```cpp
void end_window() {
    if (!g_window_item_width_pushed.empty()) {
        if (g_window_item_width_pushed.back()) {
            ImGui::PopItemWidth();
        }
        g_window_item_width_pushed.pop_back();
    }
    ImGui::End();
}
```

- [ ] **Step 3: Verify the fix**

Build and run with `horizontalScrollbar` on a content-heavy window. The horizontal scrollbar should appear for wide content (long text) without runaway growth. Auto-sizing widgets (InputText, sliders) should stay clamped to visible window width.

```bash
cmake --build build --target hello_app
```

If the fix does NOT resolve the issue (e.g., the growth is from BeginGroup, not auto-sizing widgets), investigate `EndGroup` in `layout.cpp` and adjust. The principle: break the feedback loop where content width from frame N inflates widget width in frame N+1.

- [ ] **Step 4: Remove temporary test change, commit**

Remove the `horizontalScrollbar` prop you added to App.tsx for testing. Commit the renderer fix only:

```bash
git add renderer/components.cpp
git commit -m "fix: prevent horizontalScrollbar infinite growth by clamping ItemWidth"
```

---

### Task 1: Text component — compiler pipeline (color, disabled, wrapped)

**Files:**
- Modify: `compiler/src/components.ts:89-92`
- Modify: `compiler/src/ir.ts:142` and `:44-68`
- Modify: `compiler/src/lowering.ts:490-493` and `:1121-1179`
- Modify: `compiler/src/emitter.ts:1535-1543`

- [ ] **Step 1: Add props to Text in components.ts**

In `compiler/src/components.ts`, replace the Text definition (lines 89-92):

```typescript
Text: {
    props: {
        color: { type: 'number', required: false },
        disabled: { type: 'boolean', required: false },
        wrapped: { type: 'boolean', required: false },
        style: { type: 'style', required: false },
    },
    hasChildren: true, isContainer: false,
},
```

- [ ] **Step 2: Update IRText in ir.ts**

In `compiler/src/ir.ts`, update the IRText interface (line 142):

```typescript
export interface IRText { kind: 'text'; format: string; args: string[]; color?: string; disabled?: boolean; wrapped?: boolean; loc?: SourceLoc; }
```

No change to the IRNode union — IRText is already in it.

- [ ] **Step 3: Update lowerTextElement in lowering.ts**

In `compiler/src/lowering.ts`, modify `lowerTextElement` (line 1121) to extract the new props from attributes:

```typescript
function lowerTextElement(node: ts.JsxElement, body: IRNode[], ctx: LoweringContext, loc?: SourceLoc): void {
    let format = '';
    const args: string[] = [];

    // Extract Text props
    const attrs = getAttributes(node.openingElement.attributes, ctx);
    const color = attrs['color'];
    const disabled = attrs['disabled'] === 'true';
    const wrapped = attrs['wrapped'] === 'true';

    for (const child of node.children) {
        if (ts.isJsxText(child)) {
            // Collapse whitespace (newlines, tabs, runs of spaces) into single spaces,
            // matching JSX semantics. Only fully-blank segments are dropped.
            const text = child.text.replace(/%/g, '%%').replace(/\s+/g, ' ');
            // Drop segments that are purely whitespace at the very start or end of children
            const isFirst = child === node.children[0];
            const isLast = child === node.children[node.children.length - 1];
            const trimmed = isFirst && isLast ? text.trim()
                : isFirst ? text.trimStart()
                : isLast ? text.trimEnd()
                : text;
            if (trimmed) format += trimmed;
        } else if (ts.isJsxExpression(child) && child.expression) {
            const expr = child.expression;
            const cppExpr = exprToCpp(expr, ctx);
            const exprType = inferExprType(expr, ctx);

            switch (exprType) {
                case 'int':
                    format += '%d';
                    args.push(cppExpr);
                    break;
                case 'float':
                    if (cppExpr.startsWith('props.')) {
                        // Props fields: number could be int or float in C++, cast to double for safe printf
                        format += '%g';
                        args.push(`(double)${cppExpr}`);
                    } else {
                        format += '%.2f';
                        args.push(cppExpr);
                    }
                    break;
                case 'bool':
                    format += '%s';
                    args.push(`${cppExpr} ? "true" : "false"`);
                    break;
                case 'string':
                    format += '%s';
                    // String literals and ternaries of literals are already const char*
                    if (cppExpr.startsWith('"') || isCharPtrExpression(expr)) {
                        args.push(cppExpr);
                    } else {
                        args.push(`${cppExpr}.c_str()`);
                    }
                    break;
                default:
                    format += '%s';
                    args.push(`std::to_string(${cppExpr}).c_str()`);
                    break;
            }
        }
    }

    body.push({ kind: 'text', format, args, color, disabled: disabled || undefined, wrapped: wrapped || undefined, loc });
}
```

Also update the self-closing Text case in the leaf switch (around line 815-818):

```typescript
case 'Text': {
    // Self-closing <Text /> — may have disabled/wrapped/color props
    const disabled = attrs['disabled'] === 'true';
    const wrapped = attrs['wrapped'] === 'true';
    const color = attrs['color'];
    body.push({ kind: 'text', format: '', args: [], color, disabled: disabled || undefined, wrapped: wrapped || undefined, loc });
    break;
}
```

- [ ] **Step 4: Update emitText in emitter.ts**

In `compiler/src/emitter.ts`, replace the `emitText` function (lines 1535-1543):

```typescript
function emitText(node: IRText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Text', lines, indent);
    const fmtStr = JSON.stringify(node.format);
    const argsStr = node.args.length > 0 ? ', ' + node.args.join(', ') : '';

    if (node.disabled) {
        // disabled takes priority — ImGui::TextDisabled has its own grayed style
        if (node.args.length === 0) {
            lines.push(`${indent}imx::renderer::text_disabled(${fmtStr});`);
        } else {
            lines.push(`${indent}imx::renderer::text_disabled(${fmtStr}${argsStr});`);
        }
    } else if (node.color && node.wrapped) {
        // color + wrapped: PushStyleColor + TextWrapped + PopStyleColor
        lines.push(`${indent}ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(${node.color}));`);
        if (node.args.length === 0) {
            lines.push(`${indent}imx::renderer::text_wrapped(${fmtStr});`);
        } else {
            lines.push(`${indent}imx::renderer::text_wrapped(${fmtStr}${argsStr});`);
        }
        lines.push(`${indent}ImGui::PopStyleColor();`);
    } else if (node.color) {
        // color only: inline ImGui::TextColored
        if (node.args.length === 0) {
            lines.push(`${indent}ImGui::TextColored(ImVec4(${node.color}), ${fmtStr});`);
        } else {
            lines.push(`${indent}ImGui::TextColored(ImVec4(${node.color}), ${fmtStr}${argsStr});`);
        }
    } else if (node.wrapped) {
        // wrapped only
        if (node.args.length === 0) {
            lines.push(`${indent}imx::renderer::text_wrapped(${fmtStr});`);
        } else {
            lines.push(`${indent}imx::renderer::text_wrapped(${fmtStr}${argsStr});`);
        }
    } else {
        // plain text (current behavior)
        if (node.args.length === 0) {
            lines.push(`${indent}imx::renderer::text(${fmtStr});`);
        } else {
            lines.push(`${indent}imx::renderer::text(${fmtStr}${argsStr});`);
        }
    }
}
```

Note: `ImGui::TextColored` is called directly (not via renderer wrapper) because it takes the color inline. `text_disabled` and `text_wrapped` go through the renderer for consistency with `before_child()`.

- [ ] **Step 5: Build compiler and verify**

```bash
cd compiler && npm run build && cd ..
```

Fix any TypeScript errors. The compiler should build cleanly.

- [ ] **Step 6: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts
git commit -m "feat: add color, disabled, wrapped props to Text component (compiler)"
```

---

### Task 2: Text component — renderer (text_disabled, text_wrapped)

**Files:**
- Modify: `include/imx/renderer.h` (after line 186)
- Modify: `renderer/components.cpp` (after line 248)

- [ ] **Step 1: Add declarations to renderer.h**

In `include/imx/renderer.h`, after the `text()` declaration (line 186), add:

```cpp
void text_disabled(const char* fmt, ...) IM_FMTARGS(1);
void text_wrapped(const char* fmt, ...) IM_FMTARGS(1);
```

- [ ] **Step 2: Add implementations to components.cpp**

In `renderer/components.cpp`, after `end_window()` (around line 240, before the existing `text` function), or right after the existing `text` function (line 248), add:

```cpp
void text_disabled(const char* fmt, ...) {
    before_child();
    va_list args;
    va_start(args, fmt);
    ImGui::TextDisabledV(fmt, args);
    va_end(args);
}

void text_wrapped(const char* fmt, ...) {
    before_child();
    va_list args;
    va_start(args, fmt);
    ImGui::TextWrappedV(fmt, args);
    va_end(args);
}
```

- [ ] **Step 3: Build and verify**

```bash
cmake --build build --target hello_app
```

Should compile cleanly. The new functions are available but not yet called by generated code (that comes with the hello example update).

- [ ] **Step 4: Commit**

```bash
git add include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add text_disabled and text_wrapped renderer functions"
```

---

### Task 3: Bullet component — full pipeline

**Files:**
- Modify: `compiler/src/components.ts` (after BulletText, around line 363)
- Modify: `compiler/src/ir.ts:44-68` (IRNode union) and add IRBullet interface
- Modify: `compiler/src/lowering.ts` (leaf switch, around line 812)
- Modify: `compiler/src/emitter.ts` (leaf switch, around line 570)
- Modify: `include/imx/renderer.h` (after bullet_text declaration, line 285)
- Modify: `renderer/components.cpp` (after bullet_text function, line 727)

- [ ] **Step 1: Add Bullet to components.ts**

In `compiler/src/components.ts`, after the BulletText entry (around line 363), add:

```typescript
Bullet: {
    props: { style: { type: 'style', required: false } },
    hasChildren: false, isContainer: false,
},
```

- [ ] **Step 2: Add IRBullet to ir.ts**

Add the interface (near the other simple IR types):

```typescript
export interface IRBullet { kind: 'bullet'; loc?: SourceLoc; }
```

Add `IRBullet` to the IRNode union (line 68, at the end before the semicolon):

```typescript
    | IRBeginCombo | IREndCombo
    | IRBullet;
```

- [ ] **Step 3: Add Bullet lowering in lowering.ts**

In the leaf switch (around line 812, after the Separator case), add:

```typescript
case 'Bullet':
    body.push({ kind: 'bullet', loc });
    break;
```

Also add `IRBullet` to the import at the top of the file.

- [ ] **Step 4: Add Bullet emission in emitter.ts**

In the emit switch (around line 570, after the `bullet_text` case), add:

```typescript
case 'bullet':
    emitLocComment(node.loc, 'Bullet', lines, indent);
    lines.push(`${indent}imx::renderer::bullet();`);
    break;
```

- [ ] **Step 5: Add bullet() to renderer**

In `include/imx/renderer.h`, after the `bullet_text` declaration (line 285):

```cpp
void bullet();
```

In `renderer/components.cpp`, after the `bullet_text` function (line 727):

```cpp
void bullet() {
    before_child();
    ImGui::Bullet();
}
```

- [ ] **Step 6: Build compiler and C++**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target hello_app
```

- [ ] **Step 7: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add Bullet standalone component"
```

---

### Task 4: Selectable enhancements — spanAllColumns, allowDoubleClick, dontClosePopups

**Files:**
- Modify: `compiler/src/components.ts:371-380`
- Modify: `compiler/src/ir.ts:183` (IRSelectable)
- Modify: `compiler/src/lowering.ts` (lowerSelectable function)
- Modify: `compiler/src/emitter.ts:2367-2380` (emitSelectable)
- Modify: `include/imx/renderer.h:287` (selectable declaration)
- Modify: `renderer/components.cpp:734-737` (selectable function)

- [ ] **Step 1: Add props to Selectable in components.ts**

In `compiler/src/components.ts`, update the Selectable definition (lines 371-380):

```typescript
Selectable: {
    props: withItemInteractionProps({
        label: { type: 'string', required: true },
        selected: { type: 'boolean', required: false },
        onSelect: { type: 'callback', required: false },
        selectionIndex: { type: 'number', required: false },
        spanAllColumns: { type: 'boolean', required: false },
        allowDoubleClick: { type: 'boolean', required: false },
        dontClosePopups: { type: 'boolean', required: false },
        style: { type: 'style', required: false },
    }),
    hasChildren: false, isContainer: false,
},
```

- [ ] **Step 2: Update IRSelectable in ir.ts**

Update the IRSelectable interface (line 183):

```typescript
export interface IRSelectable { kind: 'selectable'; label: string; selected: string; action: string[]; selectionIndex?: string; flags?: string; style?: string; item?: IRItemInteraction; loc?: SourceLoc; }
```

Added `flags?: string` field.

- [ ] **Step 3: Update lowerSelectable in lowering.ts**

In `compiler/src/lowering.ts`, update `lowerSelectable` (lines 1561-1573) to collect flags:

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
    const flagParts: string[] = [];
    if (attrs['spanAllColumns'] === 'true') flagParts.push('ImGuiSelectableFlags_SpanAllColumns');
    if (attrs['allowDoubleClick'] === 'true') flagParts.push('ImGuiSelectableFlags_AllowDoubleClick');
    if (attrs['dontClosePopups'] === 'true') flagParts.push('ImGuiSelectableFlags_DontClosePopups');
    const flags = flagParts.length > 0 ? flagParts.join(' | ') : undefined;
    const item = lowerItemInteraction(attrs, rawAttrs, ctx);
    body.push({ kind: 'selectable', label, selected, action, selectionIndex, flags, style, item, loc });
}
```

- [ ] **Step 4: Update emitSelectable in emitter.ts**

In `compiler/src/emitter.ts`, update `emitSelectable` (lines 2367-2380):

```typescript
function emitSelectable(node: IRSelectable, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Selectable', lines, indent);
    if (node.selectionIndex) {
        lines.push(`${indent}imx::renderer::set_next_item_selection_data(${node.selectionIndex});`);
    }
    const label = asCharPtr(node.label);
    const flagsArg = node.flags ? `, ${node.flags}` : '';
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('selectable_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::selectable(${label}, ${node.selected}${flagsArg})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
```

- [ ] **Step 5: Update selectable() in renderer**

In `include/imx/renderer.h`, update the selectable declaration (line 287):

```cpp
bool selectable(const char* label, bool selected = false, int flags = 0, const Style& style = {});
```

In `renderer/components.cpp`, update the selectable function (lines 734-737):

```cpp
bool selectable(const char* label, bool selected, int flags, const Style& style) {
    before_child();
    return ImGui::Selectable(label, selected, flags);
}
```

- [ ] **Step 6: Build compiler and C++**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target hello_app
```

- [ ] **Step 7: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add spanAllColumns, allowDoubleClick, dontClosePopups to Selectable"
```

---

### Task 5: ListBox manual mode — dual-mode detection

**Files:**
- Modify: `compiler/src/components.ts:306-316`
- Modify: `compiler/src/ir.ts` (add IRBeginListBox, IREndListBox, update IRNode union)
- Modify: `compiler/src/lowering.ts:574-591` area (add ListBox dual-mode check) and `:773-775` (leaf case)
- Modify: `compiler/src/emitter.ts` (add begin_list_box/end_list_box cases and end_list_box emitter case in end container switch)
- Modify: `include/imx/renderer.h` (add begin_list_box, end_list_box)
- Modify: `renderer/components.cpp` (add begin_list_box, end_list_box)

- [ ] **Step 1: Update ListBox in components.ts**

In `compiler/src/components.ts`, update the ListBox definition (lines 306-316) to support dual-mode:

```typescript
ListBox: {
    props: withItemInteractionProps({
        label: { type: 'string', required: true },
        value: { type: 'number', required: false },
        onChange: { type: 'callback', required: false },
        items: { type: 'string', required: false },
        width: { type: 'number', required: false },
        height: { type: 'number', required: false },
        style: { type: 'style', required: false },
    }),
    hasChildren: true, isContainer: true,
},
```

Key changes: `value` and `items` become `required: false` (not needed in manual mode), add `height` prop, set `hasChildren: true, isContainer: true`.

- [ ] **Step 2: Add IRBeginListBox and IREndListBox to ir.ts**

Add the interfaces (near IRBeginCombo/IREndCombo, around line 225):

```typescript
export interface IRBeginListBox {
    kind: 'begin_list_box';
    label: string;
    width?: string;
    height?: string;
    style?: string;
    item?: IRItemInteraction;
    loc?: SourceLoc;
}
export interface IREndListBox { kind: 'end_list_box'; }
```

Add to the IRNode union (line 68):

```typescript
    | IRBeginCombo | IREndCombo
    | IRBullet
    | IRBeginListBox | IREndListBox;
```

Add `'ListBox'` to the `IRBeginContainer` and `IREndContainer` tag union types (lines 72-75 and 82-85). Actually no — ListBox manual mode uses its own IR nodes (IRBeginListBox/IREndListBox), not the generic IRBeginContainer, same as Combo uses IRBeginCombo/IREndCombo. So no change to IRBeginContainer tags.

- [ ] **Step 3: Add ListBox dual-mode detection in lowering.ts**

In `compiler/src/lowering.ts`, add a ListBox check right after the Combo check (after line 591), inside the `if (def.hasChildren && node.children.length > 0)` block:

```typescript
if (name === 'ListBox') {
    // Manual ListBox mode — has children, no items prop
    const label = attrs['label'] ?? '""';
    const item = lowerItemInteraction(attrs, rawAttrs, ctx);
    body.push({ kind: 'begin_list_box', label, width: attrs['width'], height: attrs['height'], style: attrs['style'], item, loc: getLoc(node, ctx) } as IRBeginListBox);
    for (const child of node.children) {
        lowerJsxChild(child, body, ctx);
    }
    body.push({ kind: 'end_list_box' } as IREndListBox);
    return;
}
```

The existing leaf case (line 773-775) stays unchanged for simple items mode.

Also add `IRBeginListBox, IREndListBox` to the import at the top of the file.

- [ ] **Step 4: Add begin_list_box/end_list_box emission in emitter.ts**

In the emit switch, add cases for the new IR nodes. Place them near the `begin_combo`/`end_combo` cases (around line 527-542):

```typescript
case 'begin_list_box': {
    const n = node as IRBeginListBox;
    emitLocComment(n.loc, 'ListBox (manual)', lines, indent);
    const label = asCharPtr(n.label);
    const w = n.width ?? '0.0f';
    const h = n.height ?? '0.0f';
    lines.push(`${indent}if (imx::renderer::begin_list_box(${label}, ${w}, ${h})) {`);
    break;
}
case 'end_list_box':
    lines.push(`${indent}imx::renderer::end_list_box();`);
    lines.push(`${indent}}`);
    break;
```

Also add `IRBeginListBox, IREndListBox` to the import at the top of the emitter file.

- [ ] **Step 5: Add begin_list_box/end_list_box to renderer**

In `include/imx/renderer.h`, after the `list_box` declaration (line 272):

```cpp
bool begin_list_box(const char* label, float width = 0.0f, float height = 0.0f);
void end_list_box();
```

In `renderer/components.cpp`, after the `list_box` function (line 662):

```cpp
bool begin_list_box(const char* label, float width, float height) {
    before_child();
    return ImGui::BeginListBox(label, ImVec2(width, height));
}

void end_list_box() {
    ImGui::EndListBox();
}
```

- [ ] **Step 6: Build compiler and C++**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target hello_app
```

- [ ] **Step 7: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add ListBox manual mode (BeginListBox/EndListBox) with dual-mode detection"
```

---

### Task 6: Hello example — Phase 18 demo window

**Files:**
- Modify: `examples/hello/App.tsx:65-94` (dock layout) and add Window content

- [ ] **Step 1: Add Phase 18 state variables**

In `examples/hello/App.tsx`, add state variables after the existing phase17 ones (around line 47):

```typescript
const [phase18ListIdx, setPhase18ListIdx] = useState(0);
```

- [ ] **Step 2: Add Phase 18 to dock layout**

In the dock layout section (lines 82-89), add a Phase 18 panel. Replace the innermost horizontal split that contains Phase 13 and Phase 14 with a vertical split that also includes Phase 18:

```typescript
<DockSplit direction="horizontal" size={0.5}>
  <DockPanel>
    <Window title="Phase 13" />
  </DockPanel>
  <DockSplit direction="vertical" size={0.5}>
    <DockPanel>
      <Window title="Phase 14" />
    </DockPanel>
    <DockPanel>
      <Window title="Phase 18" />
    </DockPanel>
  </DockSplit>
</DockSplit>
```

- [ ] **Step 3: Add Phase 18 Window content**

Add the Phase 18 window after the Phase 17 window (before the Modal, around line 537):

```tsx
<Window title="Phase 18">
  <Column gap={8}>
    <Font name="jetbrains-mono">
      <Text>Phase 18 showcase: text variants, bullet, selectable flags, manual ListBox.</Text>
    </Font>
    <CollapsingHeader label="Text Variants" defaultOpen>
      <Text>Normal text (no props).</Text>
      <Text color={[1.0, 0.3, 0.3, 1.0]}>Red colored text via color prop.</Text>
      <Text color={[0.3, 1.0, 0.5, 1.0]}>Green colored text.</Text>
      <Text disabled>Disabled (grayed out) text.</Text>
      <Text wrapped>This is wrapped text that will automatically wrap to fit within the available window width, which is especially useful for long descriptions, help text, or log output in narrow docked panels.</Text>
      <Text color={[1.0, 0.8, 0.2, 1.0]} wrapped>Colored AND wrapped text combined — yellow text that wraps within the panel boundary.</Text>
    </CollapsingHeader>
    <CollapsingHeader label="Bullet" defaultOpen>
      <Bullet />
      <SameLine spacing={4} />
      <Text>Standalone bullet followed by text via SameLine.</Text>
      <Bullet />
      <SameLine spacing={4} />
      <Text>Second bullet point.</Text>
      <BulletText>Classic BulletText for comparison.</BulletText>
    </CollapsingHeader>
    <CollapsingHeader label="Selectable Flags" defaultOpen>
      <Table columns={["Name", "Status", "Action"]}>
        <TableRow>
          <Selectable label="Row A" spanAllColumns selected={phase18ListIdx === 0} onSelect={() => setPhase18ListIdx(0)} />
        </TableRow>
        <TableRow>
          <Selectable label="Row B" spanAllColumns selected={phase18ListIdx === 1} onSelect={() => setPhase18ListIdx(1)} />
        </TableRow>
        <TableRow>
          <Selectable label="Row C" spanAllColumns allowDoubleClick selected={phase18ListIdx === 2} onSelect={() => setPhase18ListIdx(2)} />
        </TableRow>
      </Table>
      <Text>Selected index: {phase18ListIdx}</Text>
    </CollapsingHeader>
    <CollapsingHeader label="Manual ListBox" defaultOpen>
      <ListBox label="Colors" width={200} height={120}>
        <Selectable label="Red" selected={phase18ListIdx === 0} onSelect={() => setPhase18ListIdx(0)} />
        <Selectable label="Green" selected={phase18ListIdx === 1} onSelect={() => setPhase18ListIdx(1)} />
        <Selectable label="Blue" selected={phase18ListIdx === 2} onSelect={() => setPhase18ListIdx(2)} />
        <Selectable label="Yellow" selected={phase18ListIdx === 3} onSelect={() => setPhase18ListIdx(3)} />
      </ListBox>
      <Text>ListBox selected: {phase18ListIdx}</Text>
    </CollapsingHeader>
  </Column>
</Window>
```

- [ ] **Step 4: Build and test visually**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target hello_app
```

Run `build/Debug/hello_app.exe`. Verify:
- Colored text shows correct colors
- Disabled text is grayed out
- Wrapped text wraps in narrow panels
- Color + wrapped combo works
- Bullet dots appear standalone
- Selectable spanAllColumns spans the full table row
- ListBox manual mode shows a scrollable list with custom Selectables

Delete `build/Debug/imgui.ini` if the app freezes on startup (stale dock IDs from new layout).

- [ ] **Step 5: Commit**

```bash
git add examples/hello/App.tsx
git commit -m "feat: add Phase 18 showcase — text variants, bullet, selectable flags, manual ListBox"
```

---

### Task 7: Type definitions and docs update

**Files:**
- Modify: `compiler/src/init.ts` (IMX_DTS string)
- Modify: `examples/hello/imx.d.ts`
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`
- Modify: `docs/roadmap.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update IMX_DTS in init.ts**

In `compiler/src/init.ts`, update the TextProps interface in the IMX_DTS string:

```typescript
interface TextProps { color?: number[]; disabled?: boolean; wrapped?: boolean; style?: Style; children?: any; }
```

Add BulletProps:

```typescript
interface BulletProps { style?: Style; }
```

Update SelectableProps to include new flags:

```typescript
interface SelectableProps extends ItemInteractionProps { label: string; selected?: boolean; onSelect?: () => void; selectionIndex?: number; spanAllColumns?: boolean; allowDoubleClick?: boolean; dontClosePopups?: boolean; style?: Style; }
```

Update ListBoxProps for manual mode support:

```typescript
interface ListBoxProps extends ItemInteractionProps { label: string; value?: number; onChange?: (v: number) => void; items?: string[]; width?: number; height?: number; style?: Style; children?: any; }
```

Add `Bullet` to the function declarations section:

```typescript
declare function Bullet(props: BulletProps): any;
```

- [ ] **Step 2: Update examples/hello/imx.d.ts**

Copy the same changes from Step 1 into `examples/hello/imx.d.ts`. Update TextProps, add BulletProps, update SelectableProps, update ListBoxProps, add Bullet function declaration.

- [ ] **Step 3: Update docs/api-reference.md**

Add to the Text component section:

```markdown
| color | number[] | No | RGBA color array [r,g,b,a] — emits TextColored |
| disabled | boolean | No | Grayed-out text — emits TextDisabled |
| wrapped | boolean | No | Auto-wrapping text — emits TextWrapped |
```

Add Bullet component:

```markdown
### Bullet

Standalone bullet point (no text). Use with `<SameLine>` to place text after.

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| style | Style | No | Style overrides |
```

Update Selectable section with new props:

```markdown
| spanAllColumns | boolean | No | Span across all table columns |
| allowDoubleClick | boolean | No | React to double-click in addition to single-click |
| dontClosePopups | boolean | No | Don't close parent popup on click |
```

Add ListBox manual mode documentation:

```markdown
**Manual mode** (children instead of items):

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| label | string | Yes | Widget label |
| width | number | No | ListBox width (0 = auto) |
| height | number | No | ListBox height (0 = auto) |
| children | any | Yes | Custom content (e.g., Selectable elements) |
```

- [ ] **Step 4: Update docs/llm-prompt-reference.md**

Update the Text line:

```
Text: color?(number[]) | disabled?(boolean) | wrapped?(boolean) | style?(Style) | children — text display with optional color, disabled, or wrapped mode
```

Add Bullet:

```
Bullet: style?(Style) — standalone bullet point, use with SameLine for text
```

Update Selectable line to include new flags:

```
Selectable: label(string, required) | selected?(boolean) | onSelect?(() => void) | selectionIndex?(number) | spanAllColumns? | allowDoubleClick? | dontClosePopups? | style?(Style) — clickable list item
```

Update ListBox line to show dual-mode:

```
ListBox: label(string, required) | value?(number) | onChange?((v: number) => void) | items?(string[]) | width?(number) | height?(number) | style?(Style) | children? — simple mode with items array, or manual mode with children (BeginListBox/EndListBox)
```

- [ ] **Step 5: Update docs/roadmap.md**

Change Phase 18 header to include `(DONE)`:

```markdown
## Phase 18: Text & Display Variants (DONE)
```

- [ ] **Step 6: Update CLAUDE.md**

Update the "Current status" section to say "Phases 1-18 complete" and add the Phase 18 summary:

```markdown
- Text & Display Variants (Phase 18): `color`, `disabled`, `wrapped` props on `<Text>`, `<Bullet />` standalone, Selectable `spanAllColumns`/`allowDoubleClick`/`dontClosePopups` flags, ListBox manual mode (BeginListBox/EndListBox with children)
```

Also update the component count (~98 host components or however many there are now).

- [ ] **Step 7: Commit**

```bash
git add compiler/src/init.ts examples/hello/imx.d.ts docs/api-reference.md docs/llm-prompt-reference.md docs/roadmap.md CLAUDE.md
git commit -m "docs: complete Phase 18 documentation — types, api-reference, llm-reference, roadmap, CLAUDE.md"
```

---

### Task 8: Build compiler/dist/ and final commit

**Files:**
- Modify: `compiler/dist/` (all generated JS files)

- [ ] **Step 1: Rebuild compiler dist**

```bash
cd compiler && npm run build && cd ..
```

- [ ] **Step 2: Verify hello app builds end-to-end**

```bash
cmake --build build --target hello_app
```

Run `build/Debug/hello_app.exe` and visually verify all Phase 18 features work. Delete `build/Debug/imgui.ini` first if needed.

- [ ] **Step 3: Run compiler tests**

```bash
cd compiler && npx vitest run && cd ..
```

Fix any test failures. If tests reference the old Text component shape (no color/disabled/wrapped props), update them.

- [ ] **Step 4: Run C++ tests**

```bash
cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe
```

- [ ] **Step 5: Commit compiler/dist/**

```bash
git add compiler/dist/
git commit -m "build: update compiler/dist for Phase 18"
```
