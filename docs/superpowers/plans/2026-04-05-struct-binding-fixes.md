# Struct Binding Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 4 compiler pipeline issues so TSX is a pure UI layer over C++ struct state: TextInput binding, custom component pointer propagation, DragDrop typed payloads, auto-generated map indices.

**Architecture:** All fixes are in the compiler pipeline (ir.ts, lowering.ts, emitter.ts, compile.ts). No runtime or renderer changes. Each fix follows the same pattern: extend the IR, modify lowering, update emission. Fix 2 (pointer propagation) also adds a resolve-phase analysis pass.

**Tech Stack:** TypeScript (compiler), Vitest (tests)

---

## File Map

| File | Fixes | Changes |
|------|-------|---------|
| `compiler/src/ir.ts` | 1, 4 | Add fields to IRTextInput, IRListMap |
| `compiler/src/components.ts` | 1 | Make TextInput onChange optional |
| `compiler/src/lowering.ts` | 1, 4 | TextInput uses lowerValueOnChange; map generates unique index names |
| `compiler/src/emitter.ts` | 1, 2, 3, 4 | TextInput modes; pointer prop emission; DragDrop type lookup; map alias emission |
| `compiler/src/compile.ts` | 2, 3 | Resolve phase: bound prop detection + DragDrop type map |
| `compiler/src/init.ts` | 1 | Update TextInputProps in imx.d.ts (onChange optional) |
| `compiler/tests/emitter.test.ts` | all | Tests for all 4 fixes |
| `compiler/dist/` | all | Rebuild |

---

### Task 1: TextInput struct binding

**Files:**
- Modify: `compiler/src/components.ts:58`
- Modify: `compiler/src/ir.ts:67`
- Modify: `compiler/src/lowering.ts:699-715`
- Modify: `compiler/src/emitter.ts:1070-1086`
- Modify: `compiler/src/init.ts:187`
- Test: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing test for TextInput direct binding**

Add to `compiler/tests/emitter.test.ts`:

```typescript
it('emits TextInput with direct struct binding', () => {
    const output = compile(`
function App(props: { name: string }) {
  return (
    <Window title="Test">
      <TextInput value={props.name} label="Name" />
    </Window>
  );
}
    `);

    expect(output).toContain('buf.sync_from(props.name)');
    expect(output).toContain('imx::renderer::text_input("Name"');
    expect(output).toContain('props.name = buf.value()');
    expect(output).not.toContain('.get()');
    expect(output).not.toContain('.set(');
});

it('emits TextInput with onChange callback', () => {
    const output = compile(`
function App(props: { name: string, onNameChange: (v: string) => void }) {
  return (
    <Window title="Test">
      <TextInput value={props.name} onChange={(v: string) => props.onNameChange(v)} label="Name" />
    </Window>
  );
}
    `);

    expect(output).toContain('buf.sync_from(props.name)');
    expect(output).toContain('imx::renderer::text_input("Name"');
    expect(output).toContain('onNameChange');
    expect(output).not.toContain('props.name = buf.value()');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: 2 new tests fail (TextInput doesn't support directBind or onChange yet).

- [ ] **Step 3: Make TextInput onChange optional**

In `compiler/src/components.ts`, line 58, change:
```typescript
onChange: { type: 'callback', required: true },
```
To:
```typescript
onChange: { type: 'callback', required: false },
```

In `compiler/src/init.ts`, line 187, change:
```typescript
interface TextInputProps { value: string; onChange: (v: string) => void; label?: string; placeholder?: string; style?: Style; }
```
To:
```typescript
interface TextInputProps { value: string; onChange?: (v: string) => void; label?: string; placeholder?: string; style?: Style; }
```

- [ ] **Step 4: Add fields to IRTextInput**

In `compiler/src/ir.ts`, line 67, change:
```typescript
export interface IRTextInput { kind: 'text_input'; label: string; bufferIndex: number; stateVar: string; style?: string; loc?: SourceLoc; }
```
To:
```typescript
export interface IRTextInput { kind: 'text_input'; label: string; bufferIndex: number; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; style?: string; loc?: SourceLoc; }
```

- [ ] **Step 5: Update lowerTextInput to use lowerValueOnChange**

In `compiler/src/lowering.ts`, replace lines 699-714 (`lowerTextInput` function body):

```typescript
function lowerTextInput(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const bufferIndex = ctx.bufferIndex++;
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr, directBind } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'text_input', label, bufferIndex, stateVar: stateVar, valueExpr, onChangeExpr, directBind, style, loc });
}
```

- [ ] **Step 6: Update emitTextInput for new modes**

In `compiler/src/emitter.ts`, replace the `emitTextInput` function (lines 1070-1086):

```typescript
function emitTextInput(node: IRTextInput, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'TextInput', lines, indent);
    const label = asCharPtr(node.label && node.label !== '""' ? node.label : `"##textinput_${node.bufferIndex}"`);

    if (node.stateVar) {
        // useState-bound (existing behavior)
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${node.stateVar}.get());`);
        lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${label}, buf)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(buf.value());`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        // Direct struct binding — sync from field, write back on change
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${node.valueExpr});`);
        lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${label}, buf)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.valueExpr} = buf.value();`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        // Value + onChange callback
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${node.valueExpr});`);
        lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${label}, buf)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}auto& buf_${node.bufferIndex} = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}imx::renderer::text_input(${label}, buf_${node.bufferIndex});`);
    }
}
```

- [ ] **Step 7: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: All tests pass, including the 2 new ones.

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts
git commit -m "feat: TextInput supports struct binding and onChange"
```

---

### Task 2: Auto-generated map index names

**Files:**
- Modify: `compiler/src/ir.ts:74`
- Modify: `compiler/src/lowering.ts:903-941`
- Modify: `compiler/src/emitter.ts:1132-1143`
- Test: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing test for unique map indices**

Add to `compiler/tests/emitter.test.ts`:

```typescript
it('emits unique loop counters for nested maps', () => {
    const output = compile(`
function App(props: { groups: { items: number[] }[] }) {
  return (
    <Window title="Test">
      {props.groups.map((group, i) => (
        <View>
          {group.items.map((item, i) => (
            <Text>{item}</Text>
          ))}
        </View>
      ))}
    </Window>
  );
}
    `);

    // Should have two different loop counter names
    expect(output).toContain('_map_idx_0');
    expect(output).toContain('_map_idx_1');
    // User's 'i' is aliased inside each loop
    expect(output).toMatch(/size_t i = _map_idx_0/);
    expect(output).toMatch(/size_t i = _map_idx_1/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: Fails — currently emits `i` as the loop variable directly.

- [ ] **Step 3: Add mapCounter to LoweringContext**

In `compiler/src/lowering.ts`, find the `LoweringContext` interface/class and add:

```typescript
mapCounter: number;
```

Initialize it to `0` wherever LoweringContext is constructed.

- [ ] **Step 4: Add internalIndexVar to IRListMap**

In `compiler/src/ir.ts`, line 74, change:
```typescript
export interface IRListMap { kind: 'list_map'; array: string; itemVar: string; indexVar: string; key: string; componentName: string; stateCount: number; bufferCount: number; body: IRNode[]; loc?: SourceLoc; }
```
To:
```typescript
export interface IRListMap { kind: 'list_map'; array: string; itemVar: string; indexVar: string; internalIndexVar: string; key: string; componentName: string; stateCount: number; bufferCount: number; body: IRNode[]; loc?: SourceLoc; }
```

- [ ] **Step 5: Generate unique index in lowerListMap**

In `compiler/src/lowering.ts`, in `lowerListMap` (lines 903-941), add after line 909:

```typescript
const internalIndexVar = `_map_idx_${ctx.mapCounter++}`;
```

Update the `body.push(...)` at line 929 to include the new field:

```typescript
body.push({
    kind: 'list_map',
    array,
    itemVar,
    indexVar,
    internalIndexVar,
    key: internalIndexVar,
    componentName: 'ListItem',
    stateCount: 0,
    bufferCount: 0,
    body: mapBody,
    loc,
});
```

- [ ] **Step 6: Update emitListMap to use internal index + alias**

In `compiler/src/emitter.ts`, replace `emitListMap` (lines 1132-1143):

```typescript
function emitListMap(node: IRListMap, lines: string[], indent: string, depth: number): void {
    if (node.loc) {
        lines.push(`${indent}// ${node.loc.file}:${node.loc.line} .map()`);
    }
    const idx = node.internalIndexVar;
    lines.push(`${indent}for (size_t ${idx} = 0; ${idx} < ${node.array}.size(); ${idx}++) {`);
    lines.push(`${indent}${INDENT}auto& ${node.itemVar} = ${node.array}[${idx}];`);
    lines.push(`${indent}${INDENT}size_t ${node.indexVar} = ${idx};`);
    lines.push(`${indent}${INDENT}ctx.begin_instance("${node.componentName}", (int)${idx}, ${node.stateCount}, ${node.bufferCount});`);
    emitNodes(node.body, lines, depth + 2);
    lines.push(`${indent}${INDENT}ctx.end_instance();`);
    lines.push(`${indent}}`);
}
```

- [ ] **Step 7: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: All tests pass. Existing map tests may need updating if they check for `for (size_t i =` — update them to check for `_map_idx_`.

- [ ] **Step 8: Fix any broken existing tests**

Existing tests that match exact loop variable names (e.g., `for (size_t i =`) need to be updated to match the new `_map_idx_N` pattern. Find and update them.

- [ ] **Step 9: Commit**

```bash
git add compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: auto-generate unique map loop indices"
```

---

### Task 3: DragDrop typed payloads

**Files:**
- Modify: `compiler/src/compile.ts:147-162`
- Modify: `compiler/src/emitter.ts:972-982`
- Test: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing test for int payload**

Add to `compiler/tests/emitter.test.ts`:

```typescript
it('emits DragDrop payload type matching target onDrop annotation', () => {
    const output = compile(`
function App(props: { items: { id: number, name: string }[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <DragDropSource type="item" payload={item.id}>
          <Text>{item.name}</Text>
        </DragDropSource>
      ))}
      <DragDropTarget type="item" onDrop={(id: number) => {}}>
        <Text>Drop here</Text>
      </DragDropTarget>
    </Window>
  );
}
    `);

    // Source should use int, not float, because target's onDrop says (id: number) -> int
    expect(output).toContain('int _dd_payload');
    expect(output).not.toContain('float _dd_payload');
});
```

Note: The lowering already maps TSX `number` to C++ `float` by default. The test verifies that when a DragDropTarget's onDrop param is annotated as `number`, the compiler uses the matched type for the source. Since the default cppType for `number` is `float`, this test will need adjustment — look at how lowering maps types. If `number` always maps to `float`, the test should check that the source matches whatever the target's cppType is.

Actually, looking at lowering.ts line 478: `let cppType = 'float';` — `number` maps to `float`. So the current behavior already matches for `float`. The fix would only matter if we added `int` support.

**Revised approach:** The real fix is to propagate the target's cppType to the source, rather than hardcoding `float` in the source. For `number`, both will be `float`. But if a user annotates `(id: number)` and we later support `int` annotations, or if a user uses `boolean` or `string`, the types match.

Let me adjust the test:

```typescript
it('emits DragDrop payload type from target onDrop annotation for boolean', () => {
    const output = compile(`
function App(props: { items: boolean[] }) {
  return (
    <Window title="Test">
      <DragDropSource type="flag" payload={true}>
        <Text>Drag</Text>
      </DragDropSource>
      <DragDropTarget type="flag" onDrop={(v: boolean) => {}}>
        <Text>Drop here</Text>
      </DragDropTarget>
    </Window>
  );
}
    `);

    expect(output).toContain('bool _dd_payload');
    expect(output).not.toContain('float _dd_payload');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: Fails — source always emits `float _dd_payload`.

- [ ] **Step 3: Add DragDrop type resolution to compile.ts**

In `compiler/src/compile.ts`, add a new function after `resolveCustomComponents`:

```typescript
function resolveDragDropTypes(nodes: IRNode[]): Map<string, string> {
    const typeMap = new Map<string, string>();
    collectDragDropTypes(nodes, typeMap);
    applyDragDropTypes(nodes, typeMap);
    return typeMap;
}

function collectDragDropTypes(nodes: IRNode[], typeMap: Map<string, string>): void {
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'DragDropTarget') {
            const onDrop = node.props['onDrop'] ?? '';
            const parts = onDrop.split('|');
            if (parts.length >= 3) {
                const cppType = parts[0];
                const typeStr = node.props['type'] ?? '';
                // Strip quotes from type string for map key
                const key = typeStr.replace(/^"|"$/g, '');
                if (key) typeMap.set(key, cppType);
            }
        } else if (node.kind === 'conditional') {
            collectDragDropTypes(node.body, typeMap);
            if (node.elseBody) collectDragDropTypes(node.elseBody, typeMap);
        } else if (node.kind === 'list_map') {
            collectDragDropTypes(node.body, typeMap);
        }
    }
}

function applyDragDropTypes(nodes: IRNode[], typeMap: Map<string, string>): void {
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'DragDropSource') {
            const typeStr = node.props['type'] ?? '';
            const key = typeStr.replace(/^"|"$/g, '');
            const cppType = typeMap.get(key);
            if (cppType) {
                node.props['_payloadType'] = cppType;
            }
        } else if (node.kind === 'conditional') {
            applyDragDropTypes(node.body, typeMap);
            if (node.elseBody) applyDragDropTypes(node.elseBody, typeMap);
        } else if (node.kind === 'list_map') {
            applyDragDropTypes(node.body, typeMap);
        }
    }
}
```

Call `resolveDragDropTypes` in the Phase 3 loop (around line 94), after `resolveCustomComponents`:

```typescript
resolveCustomComponents(comp.ir.body, componentMap);
resolveDragDropTypes(comp.ir.body);
```

- [ ] **Step 4: Update DragDropSource emitter to use resolved type**

In `compiler/src/emitter.ts`, in the `DragDropSource` case (lines 972-982), change:

```typescript
case 'DragDropSource': {
    const props = dragDropSourceStack.pop() ?? {};
    const typeStr = asCharPtr(props['type'] ?? '""');
    const payload = props['payload'] ?? '0';
    const payloadType = props['_payloadType'] ?? 'float';
    lines.push(`${indent}ImGui::EndGroup();`);
    lines.push(`${indent}if (ImGui::BeginDragDropSource(ImGuiDragDropFlags_SourceAllowNullID)) {`);
    lines.push(`${indent}    ${payloadType} _dd_payload = static_cast<${payloadType}>(${payload});`);
    lines.push(`${indent}    ImGui::SetDragDropPayload(${typeStr}, &_dd_payload, sizeof(_dd_payload));`);
    lines.push(`${indent}    ImGui::Text("Dragging...");`);
    lines.push(`${indent}    ImGui::EndDragDropSource();`);
    lines.push(`${indent}}`);
    break;
}
```

- [ ] **Step 5: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add compiler/src/compile.ts compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: DragDrop payload type matches target onDrop annotation"
```

---

### Task 4: Custom component pointer propagation

This is the most complex fix. It requires:
1. Detecting which props are used for direct binding inside a component
2. Emitting those props as `T*` in the Props struct
3. Passing `&expr` at call sites
4. Adjusting code inside the component for pointer semantics

**Files:**
- Modify: `compiler/src/compile.ts`
- Modify: `compiler/src/emitter.ts:120-146` (emitComponentHeader)
- Modify: `compiler/src/emitter.ts:1145-1166` (emitCustomComponent)
- Modify: `compiler/src/emitter.ts:153+` (emitComponent — add bound props context)
- Test: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing test for pointer propagation**

Add to `compiler/tests/emitter.test.ts`. This test needs multi-component compilation. Add a helper:

```typescript
import { compileMulti } from '../src/compile.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

function compileMultiFiles(files: Record<string, string>): Record<string, string> {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imx-test-'));
    const outDir = path.join(tmpDir, 'out');
    fs.mkdirSync(outDir, { recursive: true });

    const paths: string[] = [];
    for (const [name, content] of Object.entries(files)) {
        const filePath = path.join(tmpDir, name);
        fs.writeFileSync(filePath, content);
        paths.push(filePath);
    }

    compileMulti(paths, outDir);

    const result: Record<string, string> = {};
    for (const file of fs.readdirSync(outDir)) {
        result[file] = fs.readFileSync(path.join(outDir, file), 'utf-8');
    }

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
    return result;
}
```

Then the test:

```typescript
it('emits pointer props for custom components with direct binding', () => {
    const files = compileMultiFiles({
        'App.tsx': `
import { TodoItem } from './TodoItem';
export default function App(props: { items: { done: boolean, text: string }[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <TodoItem done={item.done} text={item.text} />
      ))}
    </Window>
  );
}`,
        'TodoItem.tsx': `
export function TodoItem(props: { done: boolean, text: string }) {
  return (
    <Row>
      <Checkbox value={props.done} />
      <Text>{props.text}</Text>
    </Row>
  );
}`
    });

    const header = files['TodoItem.gen.h'] ?? '';
    const todoCpp = files['TodoItem.gen.cpp'] ?? '';
    const appCpp = files['App.gen.cpp'] ?? '';

    // Props struct should have bool* for bound prop, std::string for non-bound
    expect(header).toContain('bool* done');
    expect(header).not.toContain('bool done');

    // Call site should pass &item.done
    expect(appCpp).toContain('p.done = &item.done');

    // Inside TodoItem, checkbox should use props.done directly (it's already bool*)
    expect(todoCpp).toContain('imx::renderer::checkbox');
    expect(todoCpp).toContain('props.done');
    // Text should dereference: (*props.text) would only apply if text were bound — it's not
    expect(todoCpp).not.toContain('(*props.text)');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: Fails — props struct has `bool done` (value), call site has `p.done = item.done` (no &).

- [ ] **Step 3: Add bound prop detection to compile.ts**

Add a function to scan a component's IR body for directBind patterns:

```typescript
function detectBoundProps(nodes: IRNode[]): Set<string> {
    const bound = new Set<string>();
    walkNodes(nodes, (node) => {
        // Check all widget types that support directBind
        if ('directBind' in node && node.directBind && 'valueExpr' in node) {
            const expr = (node as any).valueExpr as string;
            if (expr && expr.startsWith('props.')) {
                const propName = expr.slice('props.'.length).split('.')[0].split('[')[0];
                bound.add(propName);
            }
        }
    });
    return bound;
}

function walkNodes(nodes: IRNode[], visitor: (node: IRNode) => void): void {
    for (const node of nodes) {
        visitor(node);
        if (node.kind === 'conditional') {
            walkNodes(node.body, visitor);
            if (node.elseBody) walkNodes(node.elseBody, visitor);
        } else if (node.kind === 'list_map') {
            walkNodes(node.body, visitor);
        }
    }
}
```

Store the bound props on the `CompiledComponent` type. Add `boundProps: Set<string>` to the interface.

In the resolve phase (Phase 3), after `resolveCustomComponents`, detect bound props for each component:

```typescript
comp.boundProps = detectBoundProps(comp.ir.body);
```

- [ ] **Step 4: Pass boundProps to emitter**

Modify `emitComponent` signature to accept `boundProps?: Set<string>`. Pass it through to `emitComponentHeader` as well. Store it in a module-level variable (like `currentCompName`) so emit functions can access it:

```typescript
let currentBoundProps: Set<string> = new Set();
```

Set it at the start of `emitComponent`:
```typescript
currentBoundProps = boundProps ?? new Set();
```

Update the call in `compile.ts`:
```typescript
const cppOutput = emitComponent(comp.ir, importInfos, comp.sourceFile, comp.boundProps);
```

- [ ] **Step 5: Update emitComponentHeader for pointer props**

In `emitComponentHeader`, for bound props, emit `T*` with a default `nullptr`:

```typescript
lines.push(`struct ${comp.name}Props {`);
for (const p of comp.params) {
    if (boundProps && boundProps.has(p.name)) {
        lines.push(`${INDENT}${cppPropType(p.type)}* ${p.name} = nullptr;`);
    } else {
        lines.push(`${INDENT}${cppPropType(p.type)} ${p.name};`);
    }
}
lines.push('};');
```

Pass `boundProps` to `emitComponentHeader` — update its signature.

- [ ] **Step 6: Update emitCustomComponent for pointer call sites**

In `emitCustomComponent`, when assigning props, check if the child component's prop is bound. The emitter needs to know the child's bound props. Store a map of `componentName -> boundProps` at module level, populated during emit setup.

Add to compile.ts — pass a `boundPropsMap: Map<string, Set<string>>` to the emitter:

```typescript
const boundPropsMap = new Map<string, Set<string>>();
for (const comp of compiled) {
    boundPropsMap.set(comp.name, comp.boundProps ?? new Set());
}
```

Pass it to `emitComponent`. Store it module-level in emitter.ts:

```typescript
let allBoundProps: Map<string, Set<string>> = new Map();
```

Update `emitCustomComponent`:

```typescript
function emitCustomComponent(node: IRCustomComponent, lines: string[], indent: string): void {
    emitLocComment(node.loc, node.name, lines, indent);
    const instanceIndex = customComponentCounter++;
    const propsEntries = Object.entries(node.props);
    const childBound = allBoundProps.get(node.name) ?? new Set();

    lines.push(`${indent}ctx.begin_instance("${node.name}", ${instanceIndex}, ${node.stateCount}, ${node.bufferCount});`);

    if (propsEntries.length > 0) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}${node.name}Props p;`);
        for (const [k, v] of propsEntries) {
            if (childBound.has(k)) {
                lines.push(`${indent}${INDENT}p.${k} = &${v};`);
            } else {
                lines.push(`${indent}${INDENT}p.${k} = ${v};`);
            }
        }
        lines.push(`${indent}${INDENT}${node.name}_render(ctx, p);`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}${node.name}_render(ctx);`);
    }

    lines.push(`${indent}ctx.end_instance();`);
}
```

- [ ] **Step 7: Adjust component body emission for pointer semantics**

In the component body, bound props need two adjustments:

**a) directBind widgets**: Replace `&props.X` with `props.X` (already a pointer).

In emitters for checkbox, slider, drag, combo, etc., when `directBind=true` and `currentBoundProps.has(propName)`:

```typescript
// In emitCheckbox, the directBind case (line 1101-1103):
} else if (node.directBind && node.valueExpr) {
    const propName = node.valueExpr.startsWith('props.') ? node.valueExpr.slice(6).split('.')[0].split('[')[0] : '';
    if (currentBoundProps.has(propName)) {
        lines.push(`${indent}imx::renderer::checkbox(${label}, ${node.valueExpr});`);
    } else {
        lines.push(`${indent}imx::renderer::checkbox(${label}, &${node.valueExpr});`);
    }
}
```

Apply the same pattern to all directBind emitters: `emitSliderFloat`, `emitSliderInt`, `emitDragFloat`, `emitDragInt`, `emitCombo`, `emitInputInt`, `emitInputFloat`, `emitRadio`, `emitListBox`, `emitColorEdit`, `emitColorPicker`, and the new `emitTextInput` directBind case.

Create a helper function to avoid repetition:

```typescript
function emitDirectBind(valueExpr: string): string {
    const propName = valueExpr.startsWith('props.') ? valueExpr.slice(6).split('.')[0].split('[')[0] : '';
    if (currentBoundProps.has(propName)) {
        return valueExpr;  // already a pointer
    }
    return `&${valueExpr}`;
}
```

**b) Reading bound props in expressions**: Add a post-processing step in `emitComponent` after all nodes are emitted. For each bound prop, replace `props.X` (not preceded by `&` or `*`) with `(*props.X)`:

```typescript
if (currentBoundProps.size > 0) {
    for (let i = 0; i < lines.length; i++) {
        for (const prop of currentBoundProps) {
            // Skip lines that are comments
            if (lines[i].trimStart().startsWith('//')) continue;
            // Replace &props.X with props.X (handled by emitDirectBind above, but as safety net)
            lines[i] = lines[i].replace(new RegExp(`&(props\\.${prop})\\b`, 'g'), '$1');
            // Replace props.X with (*props.X) for reads
            // Negative lookbehind: not preceded by & or * or . (already handled)
            lines[i] = lines[i].replace(new RegExp(`(?<![&*.])\\bprops\\.${prop}\\b`, 'g'), `(*props.${prop})`);
        }
    }
}
```

- [ ] **Step 8: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: All tests pass, including the pointer propagation test.

- [ ] **Step 9: Commit**

```bash
git add compiler/src/compile.ts compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: custom component props use pointers for direct-bound fields"
```

---

### Task 5: Rebuild compiler + update dist

**Files:**
- Rebuild: `compiler/dist/`

- [ ] **Step 1: Rebuild compiler**

Run: `cd compiler && npm run build`
Expected: Builds successfully.

- [ ] **Step 2: Run all compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Commit dist**

```bash
git add compiler/dist/
git commit -m "chore: rebuild compiler dist"
```

---

### Task 6: Final verification

- [ ] **Step 1: Run compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Build all C++ targets**

Run: `cmake --build build`
Expected: All examples build successfully. The generated C++ for existing examples should still work (map indices change from `i` to `_map_idx_0` with `i` alias — functionally equivalent).

- [ ] **Step 3: Run runtime tests**

Run: `cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe`
Expected: All tests pass (runtime unchanged).

- [ ] **Step 4: Smoke test hello_app**

Launch `build/Debug/hello_app.exe`. Verify UI works as before.
