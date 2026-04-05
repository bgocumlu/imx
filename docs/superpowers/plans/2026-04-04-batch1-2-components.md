# Phase 10 Batch 1-2: New Host Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 new host components to IMX: Modal, Radio, Selectable, InputTextMultiline, ColorPicker, PlotLines, PlotHistogram, BulletText, LabelText.

**Architecture:** Each component touches the same 8 files in the established pipeline: components.ts (definition) → ir.ts (IR node) → lowering.ts (TSX→IR) → emitter.ts (IR→C++) → renderer.h (C++ declaration) → components.cpp (ImGui wrapper) → init.ts (.d.ts types) → tests. Tasks are grouped by complexity pattern to minimize file-switching.

**Tech Stack:** C++20 (MSVC, VS 2022 generator), TypeScript (vitest), CMake, Dear ImGui

---

## File Structure

| File | Change |
|------|--------|
| `compiler/src/components.ts` | Add 9 entries to HOST_COMPONENTS |
| `compiler/src/ir.ts` | Add 7 new IR node types + extend IRNode union |
| `compiler/src/lowering.ts` | Add 9 lowering functions + switch cases |
| `compiler/src/emitter.ts` | Add 9 emission functions + switch cases |
| `compiler/src/init.ts` | Add 9 interface/declare blocks to .d.ts template |
| `compiler/tests/emitter.test.ts` | Add 9 emission tests |
| `include/imx/renderer.h` | Add 9 function declarations |
| `renderer/components.cpp` | Add 9 ImGui wrapper implementations |
| `docs/api-reference.md` | Add component documentation |
| `docs/llm-prompt-reference.md` | Add component examples |

---

### Task 1: Simple Display Components (BulletText, LabelText)

These are the simplest — no state, no callbacks. Good warm-up.

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `compiler/tests/emitter.test.ts`
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`

- [ ] **Step 1: Add component definitions to components.ts**

Add after the existing `Tooltip` entry (before `DockLayout`):

```typescript
    BulletText: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: false,
    },
    LabelText: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR nodes to ir.ts**

Add these interfaces before `IRDockLayout`:

```typescript
export interface IRBulletText { kind: 'bullet_text'; format: string; args: string[]; loc?: SourceLoc; }
export interface IRLabelText { kind: 'label_text'; label: string; value: string; loc?: SourceLoc; }
```

Add to the `IRNode` union type — change `| IRDockLayout | IRNativeWidget;` to:

```typescript
    | IRDockLayout | IRNativeWidget
    | IRBulletText | IRLabelText;
```

- [ ] **Step 3: Add renderer declarations to renderer.h**

Add before `void begin_theme(...)`:

```cpp
void bullet_text(const char* fmt, ...) IM_FMTARGS(1);
void label_text(const char* label, const char* text);
```

- [ ] **Step 4: Add renderer implementations to components.cpp**

Add before `void begin_theme(...)` (inside `namespace imx::renderer`):

```cpp
void bullet_text(const char* fmt, ...) {
    before_child();
    va_list args;
    va_start(args, fmt);
    ImGui::BulletTextV(fmt, args);
    va_end(args);
}

void label_text(const char* label, const char* text) {
    before_child();
    ImGui::LabelText(label, "%s", text);
}
```

- [ ] **Step 5: Add lowering**

In `lowering.ts`, add `IRBulletText, IRLabelText` to the import from `./ir.js`.

In `lowerJsxElement`, add a case for `BulletText` right after the `Text` case (around line 359):

```typescript
    if (name === 'BulletText') {
        lowerBulletTextElement(node, body, ctx, getLoc(node, ctx));
        return;
    }
```

In `lowerJsxSelfClosing`, add cases in the switch block (before `default`):

```typescript
        case 'BulletText':
            // Self-closing <BulletText /> - empty bullet
            body.push({ kind: 'bullet_text', format: '', args: [], loc });
            break;
        case 'LabelText':
            lowerLabelText(attrs, body, ctx, loc);
            break;
```

Add the lowering functions at the end of the file (before `getAttributes`):

```typescript
function lowerBulletTextElement(node: ts.JsxElement, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    // Same logic as lowerTextElement but produces bullet_text kind
    const children = node.children;
    const parts: string[] = [];
    const args: string[] = [];
    for (const child of children) {
        if (ts.isJsxText(child)) {
            const trimmed = child.text.trim();
            if (trimmed) parts.push(trimmed.replace(/%/g, '%%'));
        } else if (ts.isJsxExpression(child) && child.expression) {
            args.push(exprToCpp(child.expression, ctx));
            parts.push('%s');
        }
    }
    const format = parts.join(' ');
    body.push({ kind: 'bullet_text', format, args, loc });
}

function lowerLabelText(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const value = attrs['value'] ?? '""';
    body.push({ kind: 'label_text', label, value, loc });
}
```

- [ ] **Step 6: Add emission**

In `emitter.ts`, add `IRBulletText, IRLabelText` to the import from `./ir.js`.

Add cases in the `emitNode` switch (before `'native_widget'`):

```typescript
        case 'bullet_text':
            emitBulletText(node, lines, indent);
            break;
        case 'label_text':
            emitLabelText(node, lines, indent);
            break;
```

Add the emission functions:

```typescript
function emitBulletText(node: IRBulletText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'BulletText', lines, indent);
    if (node.args.length === 0) {
        lines.push(`${indent}imx::renderer::bullet_text("${node.format}");`);
    } else {
        const fmtArgs = node.args.map(a => {
            if (a.startsWith('"')) return a;
            return `std::to_string(${a}).c_str()`;
        }).join(', ');
        lines.push(`${indent}imx::renderer::bullet_text("${node.format}", ${fmtArgs});`);
    }
}

function emitLabelText(node: IRLabelText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'LabelText', lines, indent);
    lines.push(`${indent}imx::renderer::label_text(${asCharPtr(node.label)}, ${asCharPtr(node.value)});`);
}
```

- [ ] **Step 7: Add .d.ts types to init.ts**

Add these interfaces after `TooltipProps` in the `.d.ts` template string:

```typescript
interface BulletTextProps { style?: Style; children?: any; }
interface LabelTextProps { label: string; value: string; }
```

Add these declarations after the existing `declare function Tooltip(...)`:

```typescript
declare function BulletText(props: BulletTextProps): any;
declare function LabelText(props: LabelTextProps): any;
```

- [ ] **Step 8: Add emitter tests**

Add to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits BulletText', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><BulletText>Hello world</BulletText></Window>;
}
        `);
        expect(output).toContain('imx::renderer::bullet_text("Hello world")');
    });

    it('emits LabelText', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><LabelText label="Name" value="John" /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::label_text("Name", "John")');
    });
```

- [ ] **Step 9: Build and test**

Run:
```bash
cd compiler && npm run build && npx vitest run
```
Expected: All tests pass.

Then build C++:
```bash
cmake --build build --target imx_renderer
```
Expected: Build succeeds.

- [ ] **Step 10: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add BulletText and LabelText components"
```

---

### Task 2: Selectable Component

Simple click-handler component, like Button but returns selected state.

**Files:** Same 8 files as Task 1.

- [ ] **Step 1: Add component definition to components.ts**

Add after `LabelText`:

```typescript
    Selectable: {
        props: {
            label: { type: 'string', required: true },
            selected: { type: 'boolean', required: false },
            onSelect: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR node to ir.ts**

Add interface:

```typescript
export interface IRSelectable { kind: 'selectable'; label: string; selected: string; action: string[]; style?: string; loc?: SourceLoc; }
```

Add `| IRSelectable` to the `IRNode` union.

- [ ] **Step 3: Add renderer to renderer.h and components.cpp**

In `renderer.h`, add:

```cpp
bool selectable(const char* label, bool selected = false, const Style& style = {});
```

In `components.cpp`, add:

```cpp
bool selectable(const char* label, bool selected, const Style& style) {
    before_child();
    return ImGui::Selectable(label, selected);
}
```

- [ ] **Step 4: Add lowering**

In `lowering.ts`, add `IRSelectable` to the import.

In `lowerJsxSelfClosing` switch, add before `default`:

```typescript
        case 'Selectable':
            lowerSelectable(attrs, rawAttrs, body, ctx, loc);
            break;
```

Add function:

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
    body.push({ kind: 'selectable', label, selected, action, style, loc });
}
```

- [ ] **Step 5: Add emission**

In `emitter.ts`, add `IRSelectable` to the import.

Add case in `emitNode`:

```typescript
        case 'selectable':
            emitSelectable(node, lines, indent);
            break;
```

Add function:

```typescript
function emitSelectable(node: IRSelectable, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Selectable', lines, indent);
    const label = asCharPtr(node.label);
    if (node.action.length > 0) {
        lines.push(`${indent}if (imx::renderer::selectable(${label}, ${node.selected})) {`);
        for (const stmt of node.action) {
            lines.push(`${indent}${INDENT}${stmt}`);
        }
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}imx::renderer::selectable(${label}, ${node.selected});`);
    }
}
```

- [ ] **Step 6: Add .d.ts and test**

In `init.ts`, add:

```typescript
interface SelectableProps { label: string; selected?: boolean; onSelect?: () => void; style?: Style; }
```

And: `declare function Selectable(props: SelectableProps): any;`

Add test:

```typescript
    it('emits Selectable with onSelect', () => {
        const output = compile(`
function App() {
  const [sel, setSel] = useState(0);
  return <Window title="Test"><Selectable label="A" selected={sel === 0} onSelect={() => setSel(0)} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::selectable("A"');
        expect(output).toContain('sel.set(0)');
    });
```

- [ ] **Step 7: Build, test, commit**

```bash
cd compiler && npm run build && npx vitest run
cmake --build build --target imx_renderer
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add Selectable component"
```

---

### Task 3: Radio Component

Uses value/onChange pattern like SliderInt, but with an `index` prop.

**Files:** Same 8 files.

- [ ] **Step 1: Add component definition**

```typescript
    Radio: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            index: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR node**

```typescript
export interface IRRadio { kind: 'radio'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; index: string; style?: string; loc?: SourceLoc; }
```

Add `| IRRadio` to union.

- [ ] **Step 3: Add renderer**

In `renderer.h`:

```cpp
bool radio(const char* label, int* value, int v_button, const Style& style = {});
```

In `components.cpp`:

```cpp
bool radio(const char* label, int* value, int v_button, const Style& style) {
    before_child();
    return ImGui::RadioButton(label, value, v_button);
}
```

- [ ] **Step 4: Add lowering**

Add `IRRadio` to import. Add case in `lowerJsxSelfClosing`:

```typescript
        case 'Radio':
            lowerRadio(attrs, rawAttrs, body, ctx, loc);
            break;
```

Add function:

```typescript
function lowerRadio(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const index = attrs['index'] ?? '0';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'radio', label, stateVar, valueExpr, onChangeExpr, index, style, loc });
}
```

- [ ] **Step 5: Add emission**

Add `IRRadio` to import. Add case:

```typescript
        case 'radio':
            emitRadio(node, lines, indent);
            break;
```

Add function:

```typescript
function emitRadio(node: IRRadio, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Radio', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::radio(${label}, &val, ${node.index})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::radio(${label}, &val, ${node.index})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}
```

- [ ] **Step 6: Add .d.ts and test**

In `init.ts`:

```typescript
interface RadioProps { label: string; value: number; index: number; onChange?: (v: number) => void; style?: Style; }
```

And: `declare function Radio(props: RadioProps): any;`

Test:

```typescript
    it('emits Radio with state binding', () => {
        const output = compile(`
function App() {
  const [size, setSize] = useState(0);
  return (
    <Window title="Test">
      <Radio label="Small" value={size} index={0} />
      <Radio label="Large" value={size} index={1} />
    </Window>
  );
}
        `);
        expect(output).toContain('imx::renderer::radio("Small", &val, 0)');
        expect(output).toContain('imx::renderer::radio("Large", &val, 1)');
        expect(output).toContain('size.set(val)');
    });
```

- [ ] **Step 7: Build, test, commit**

```bash
cd compiler && npm run build && npx vitest run
cmake --build build --target imx_renderer
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add Radio component"
```

---

### Task 4: InputTextMultiline and ColorPicker

Both are state-bound components reusing existing patterns (TextBuffer for multiline, color array for picker).

**Files:** Same 8 files.

- [ ] **Step 1: Add component definitions**

```typescript
    InputTextMultiline: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    ColorPicker: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR nodes**

```typescript
export interface IRInputTextMultiline { kind: 'input_text_multiline'; label: string; bufferIndex: number; stateVar: string; style?: string; loc?: SourceLoc; }
export interface IRColorPicker { kind: 'color_picker'; label: string; stateVar: string; style?: string; loc?: SourceLoc; }
```

Add `| IRInputTextMultiline | IRColorPicker` to union.

- [ ] **Step 3: Add renderers**

In `renderer.h`:

```cpp
bool text_input_multiline(const char* label, TextBuffer& buffer, const Style& style = {});
bool color_picker(const char* label, float color[4], const Style& style = {});
```

In `components.cpp`:

```cpp
bool text_input_multiline(const char* label, TextBuffer& buffer, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    float item_width = style.width.value_or(0.0f);
    if (item_width > 0.0f) ImGui::SetNextItemWidth(item_width);
    bool changed = ImGui::InputTextMultiline(label, buffer.data(), buffer.capacity(), size);
    if (changed) buffer.mark_modified();
    return changed;
}

bool color_picker(const char* label, float color[4], const Style& style) {
    before_child();
    return ImGui::ColorPicker4(label, color);
}
```

- [ ] **Step 4: Add lowering**

Add `IRInputTextMultiline, IRColorPicker` to import.

In `lowerJsxSelfClosing` switch, add cases:

```typescript
        case 'InputTextMultiline':
            lowerInputTextMultiline(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'ColorPicker':
            lowerColorPicker(attrs, rawAttrs, body, ctx, loc);
            break;
```

Add functions:

```typescript
function lowerInputTextMultiline(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const bufferIndex = ctx.bufferIndex++;
    let stateVar = '';
    const valueExpr = rawAttrs.get('value');
    if (valueExpr && ts.isIdentifier(valueExpr)) {
        const varName = valueExpr.text;
        if (ctx.stateVars.has(varName)) {
            stateVar = varName;
        }
    }
    const style = attrs['style'];
    body.push({ kind: 'input_text_multiline', label, bufferIndex, stateVar, style, loc });
}

function lowerColorPicker(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    let stateVar = '';
    const valueRaw = rawAttrs.get('value');
    if (valueRaw && ts.isIdentifier(valueRaw) && ctx.stateVars.has(valueRaw.text)) {
        stateVar = valueRaw.text;
    }
    body.push({ kind: 'color_picker', label, stateVar, style, loc });
}
```

- [ ] **Step 5: Add emission**

Add `IRInputTextMultiline, IRColorPicker` to import. Add cases:

```typescript
        case 'input_text_multiline':
            emitInputTextMultiline(node, lines, indent);
            break;
        case 'color_picker':
            emitColorPicker(node, lines, indent);
            break;
```

Add functions:

```typescript
function emitInputTextMultiline(node: IRInputTextMultiline, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputTextMultiline', lines, indent);
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
    if (node.stateVar) {
        lines.push(`${indent}${INDENT}buf.sync_from(${node.stateVar}.get());`);
    }
    const styleArg = node.style ? `, ${node.style}` : '';
    lines.push(`${indent}${INDENT}if (imx::renderer::text_input_multiline(${node.label}${styleArg.length > 0 ? '' : ''}, buf${styleArg})) {`);
    if (node.stateVar) {
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(buf.value());`);
    }
    lines.push(`${indent}${INDENT}}`);
    lines.push(`${indent}}`);
}

function emitColorPicker(node: IRColorPicker, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ColorPicker', lines, indent);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_picker(${node.label}, val.data())) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}
```

Note: The `emitInputTextMultiline` function follows the exact same pattern as the existing `emitTextInput`. Let me check the existing emitTextInput to make sure:

The existing emitTextInput is:
```typescript
lines.push(`${indent}{`);
lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
if (node.stateVar) lines.push(`${indent}${INDENT}buf.sync_from(${node.stateVar}.get());`);
lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${node.label}, buf)) {`);
if (node.stateVar) lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(buf.value());`);
lines.push(`${indent}${INDENT}}`);
lines.push(`${indent}}`);
```

So the multiline version should call `text_input_multiline` instead and pass style. Simplified:

```typescript
function emitInputTextMultiline(node: IRInputTextMultiline, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputTextMultiline', lines, indent);
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
    if (node.stateVar) {
        lines.push(`${indent}${INDENT}buf.sync_from(${node.stateVar}.get());`);
    }
    const styleArg = node.style ? `, ${node.style}` : '';
    lines.push(`${indent}${INDENT}if (imx::renderer::text_input_multiline(${node.label}, buf${styleArg})) {`);
    if (node.stateVar) {
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(buf.value());`);
    }
    lines.push(`${indent}${INDENT}}`);
    lines.push(`${indent}}`);
}
```

- [ ] **Step 6: Add .d.ts and tests**

In `init.ts`:

```typescript
interface InputTextMultilineProps { label: string; value: string; style?: Style; }
interface ColorPickerProps { label: string; value: number[]; style?: Style; }
```

And:
```typescript
declare function InputTextMultiline(props: InputTextMultilineProps): any;
declare function ColorPicker(props: ColorPickerProps): any;
```

Tests:

```typescript
    it('emits InputTextMultiline with state binding', () => {
        const output = compile(`
function App() {
  const [notes, setNotes] = useState("");
  return <Window title="Test"><InputTextMultiline label="Notes" value={notes} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::text_input_multiline("Notes", buf)');
        expect(output).toContain('buf.sync_from(notes.get())');
        expect(output).toContain('notes.set(buf.value())');
    });

    it('emits ColorPicker with state binding', () => {
        const output = compile(`
function App() {
  const [col, setCol] = useState([1.0, 0.0, 0.0, 1.0]);
  return <Window title="Test"><ColorPicker label="Color" value={col} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::color_picker("Color", val.data())');
        expect(output).toContain('col.set(val)');
    });
```

- [ ] **Step 7: Build, test, commit**

```bash
cd compiler && npm run build && npx vitest run
cmake --build build --target imx_renderer
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add InputTextMultiline and ColorPicker components"
```

---

### Task 5: PlotLines and PlotHistogram

Array-based display components. Need to handle number[] props → `const float[]` + count in C++.

**Files:** Same 8 files.

- [ ] **Step 1: Add component definitions**

```typescript
    PlotLines: {
        props: {
            label: { type: 'string', required: true },
            values: { type: 'string', required: true },
            overlay: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    PlotHistogram: {
        props: {
            label: { type: 'string', required: true },
            values: { type: 'string', required: true },
            overlay: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

Note: `values` uses type `'string'` because it's passed as an expression (array literal) and lowered to a C++ expression. The actual TypeScript type checking is in .d.ts.

- [ ] **Step 2: Add IR nodes**

```typescript
export interface IRPlotLines { kind: 'plot_lines'; label: string; values: string; overlay?: string; style?: string; loc?: SourceLoc; }
export interface IRPlotHistogram { kind: 'plot_histogram'; label: string; values: string; overlay?: string; style?: string; loc?: SourceLoc; }
```

Add `| IRPlotLines | IRPlotHistogram` to union.

- [ ] **Step 3: Add renderers**

In `renderer.h`:

```cpp
void plot_lines(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});
void plot_histogram(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});
```

In `components.cpp`:

```cpp
void plot_lines(const char* label, const float* values, int count, const char* overlay, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    ImGui::PlotLines(label, values, count, 0, overlay, FLT_MAX, FLT_MAX, size);
}

void plot_histogram(const char* label, const float* values, int count, const char* overlay, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    ImGui::PlotHistogram(label, values, count, 0, overlay, FLT_MAX, FLT_MAX, size);
}
```

- [ ] **Step 4: Add lowering**

Add `IRPlotLines, IRPlotHistogram` to import. Add cases in switch:

```typescript
        case 'PlotLines':
            lowerPlotLines(attrs, body, ctx, loc);
            break;
        case 'PlotHistogram':
            lowerPlotHistogram(attrs, body, ctx, loc);
            break;
```

Add functions:

```typescript
function lowerPlotLines(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const values = attrs['values'] ?? '';
    const overlay = attrs['overlay'];
    const style = attrs['style'];
    body.push({ kind: 'plot_lines', label, values, overlay, style, loc });
}

function lowerPlotHistogram(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const values = attrs['values'] ?? '';
    const overlay = attrs['overlay'];
    const style = attrs['style'];
    body.push({ kind: 'plot_histogram', label, values, overlay, style, loc });
}
```

- [ ] **Step 5: Add emission**

Add `IRPlotLines, IRPlotHistogram` to import. Add cases:

```typescript
        case 'plot_lines':
            emitPlotLines(node, lines, indent);
            break;
        case 'plot_histogram':
            emitPlotHistogram(node, lines, indent);
            break;
```

Add a counter near the other counters:

```typescript
let plotCounter = 0;
```

Reset it in `emitComponent`: `plotCounter = 0;`

Add functions:

```typescript
function emitPlotLines(node: IRPlotLines, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'PlotLines', lines, indent);
    const idx = plotCounter++;
    const varName = `_plot_${idx}`;
    const values = node.values.split(',').map(v => ensureFloatLiteral(v.trim()));
    const count = values.length;
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}float ${varName}[] = {${values.join(', ')}};`);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    const styleArg = node.style ? `, ${node.style}` : '';
    lines.push(`${indent}${INDENT}imx::renderer::plot_lines(${node.label}, ${varName}, ${count}${overlay}${styleArg});`);
    lines.push(`${indent}}`);
}

function emitPlotHistogram(node: IRPlotHistogram, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'PlotHistogram', lines, indent);
    const idx = plotCounter++;
    const varName = `_plot_${idx}`;
    const values = node.values.split(',').map(v => ensureFloatLiteral(v.trim()));
    const count = values.length;
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}float ${varName}[] = {${values.join(', ')}};`);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    const styleArg = node.style ? `, ${node.style}` : '';
    lines.push(`${indent}${INDENT}imx::renderer::plot_histogram(${node.label}, ${varName}, ${count}${overlay}${styleArg});`);
    lines.push(`${indent}}`);
}
```

Note: `ensureFloatLiteral` is an existing function in emitter.ts that converts "5" → "5.0f".

- [ ] **Step 6: Add .d.ts and tests**

In `init.ts`:

```typescript
interface PlotLinesProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface PlotHistogramProps { label: string; values: number[]; overlay?: string; style?: Style; }
```

And:
```typescript
declare function PlotLines(props: PlotLinesProps): any;
declare function PlotHistogram(props: PlotHistogramProps): any;
```

Tests:

```typescript
    it('emits PlotLines with array values', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><PlotLines label="FPS" values={[60, 58, 62]} /></Window>;
}
        `);
        expect(output).toContain('float _plot_0[] = {60.0f, 58.0f, 62.0f}');
        expect(output).toContain('imx::renderer::plot_lines("FPS", _plot_0, 3');
    });

    it('emits PlotHistogram with overlay', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><PlotHistogram label="Dist" values={[1, 3, 5]} overlay="avg" /></Window>;
}
        `);
        expect(output).toContain('float _plot_0[] = {1.0f, 3.0f, 5.0f}');
        expect(output).toContain('imx::renderer::plot_histogram("Dist", _plot_0, 3, "avg"');
    });
```

- [ ] **Step 7: Build, test, commit**

```bash
cd compiler && npm run build && npx vitest run
cmake --build build --target imx_renderer
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add PlotLines and PlotHistogram components"
```

---

### Task 6: Modal Component

Most complex — container with open/onClose pattern like Window.

**Files:** Same 8 files.

- [ ] **Step 1: Add component definition**

```typescript
    Modal: {
        props: {
            title: { type: 'string', required: true },
            open: { type: 'boolean', required: false },
            onClose: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add to container tag types in ir.ts**

In `ir.ts`, add `'Modal'` to the `tag` union in both `IRBeginContainer` and `IREndContainer`:

Change:
```typescript
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu'
       | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader'
       | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel';
```

to:
```typescript
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu'
       | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader'
       | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal';
```

Do this for BOTH `IRBeginContainer` and `IREndContainer`.

- [ ] **Step 3: Add renderer**

In `renderer.h`:

```cpp
void begin_modal(const char* title, bool open, bool* p_open, const Style& style = {});
void end_modal();
```

In `components.cpp`:

```cpp
void begin_modal(const char* title, bool open, bool* p_open, const Style& style) {
    before_child();
    if (open) {
        ImGui::OpenPopup(title);
    }
    ImGui::BeginPopupModal(title, p_open);
}

void end_modal() {
    ImGui::EndPopup();
}
```

- [ ] **Step 4: Add emission for Modal container**

In `emitter.ts`, add the `'Modal'` case in `emitBeginContainer`:

```typescript
        case 'Modal': {
            const title = asCharPtr(node.props['title'] ?? '""');
            const openExpr = node.props['open'];
            const onCloseExpr = node.props['onClose'];
            if (openExpr) {
                windowOpenStack.push(true);
                lines.push(`${indent}{`);
                lines.push(`${indent}    bool modal_open = true;`);
                lines.push(`${indent}    imx::renderer::begin_modal(${title}, ${openExpr}, &modal_open);`);
                if (onCloseExpr) {
                    lines.push(`${indent}    if (!modal_open) { ${onCloseExpr}; }`);
                }
            } else {
                windowOpenStack.push(false);
                lines.push(`${indent}imx::renderer::begin_modal(${title}, true, nullptr);`);
            }
            break;
        }
```

Add `'Modal'` case in `emitEndContainer`:

```typescript
        case 'Modal': {
            lines.push(`${indent}imx::renderer::end_modal();`);
            const hadOpen = windowOpenStack.pop() ?? false;
            if (hadOpen) {
                lines.push(`${indent}}`);
            }
            break;
        }
```

No changes needed in lowering — Modal is a container, and containers are already handled generically by `lowerJsxElement` via `def.isContainer`.

- [ ] **Step 5: Add .d.ts and test**

In `init.ts`:

```typescript
interface ModalProps { title: string; open?: boolean; onClose?: () => void; style?: Style; children?: any; }
```

And: `declare function Modal(props: ModalProps): any;`

Test:

```typescript
    it('emits Modal with open and onClose', () => {
        const output = compile(`
function App() {
  const [show, setShow] = useState(false);
  return (
    <Window title="Test">
      <Modal title="Confirm" open={show} onClose={() => setShow(false)}>
        <Text>Are you sure?</Text>
      </Modal>
    </Window>
  );
}
        `);
        expect(output).toContain('imx::renderer::begin_modal("Confirm", show.get(), &modal_open)');
        expect(output).toContain('if (!modal_open)');
        expect(output).toContain('show.set(false)');
        expect(output).toContain('imx::renderer::end_modal()');
    });
```

- [ ] **Step 6: Build, test, commit**

```bash
cd compiler && npm run build && npx vitest run
cmake --build build --target imx_renderer
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add Modal component"
```

---

### Task 7: End-to-End Build + Documentation

**Files:**
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`

- [ ] **Step 1: Build compiler and all targets**

```bash
cd compiler && npm run build && npx vitest run
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --target hello_app
cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe
```

Expected: All pass.

- [ ] **Step 2: Add component documentation to api-reference.md**

Find the "Components" section in `docs/api-reference.md` and add documentation for all 9 new components with their props, usage examples, and notes. Follow the existing format used for Button, Checkbox, etc.

- [ ] **Step 3: Add component examples to llm-prompt-reference.md**

Add examples for all 9 new components to help LLMs generate correct code.

- [ ] **Step 4: Commit**

```bash
git add docs/api-reference.md docs/llm-prompt-reference.md
git commit -m "docs: add Batch 1-2 component documentation (9 components)"
```
