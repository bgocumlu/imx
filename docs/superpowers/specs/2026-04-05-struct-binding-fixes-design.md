# Struct Binding Fixes Design

## Problem

Four compiler pipeline issues prevent TSX from being a pure UI layer over C++ struct state:

1. **TextInput** can't bind to `std::string` struct fields — forced to use `useState`
2. **Custom component props** are copies — `<Checkbox value={props.done} />` inside a custom component modifies a copy, not the original struct field
3. **DragDrop payloads** are hardcoded to `float` — ignores the `onDrop` callback's type annotation
4. **Nested `.map()`** with same index variable names causes C++ variable shadowing bugs

## Fix 1: TextInput struct binding

### Current state

`IRTextInput` has no `valueExpr`, `onChangeExpr`, or `directBind` fields (unlike `IRCheckbox` which has all three). Lowering ignores `onChange`. The emitter only handles `useState`-bound text.

### Design

Mirror the Checkbox pattern exactly. The Checkbox pipeline already solves this problem — TextInput just never got the same treatment.

**IR** (`ir.ts`): Add to `IRTextInput`:
```typescript
valueExpr?: string;
onChangeExpr?: string;
directBind?: boolean;
```

**Lowering** (`lowering.ts`): `lowerTextInput` calls `lowerValueOnChange()` (same helper Checkbox uses) to extract valueExpr/onChangeExpr/directBind from the JSX attributes.

**Emitter** (`emitter.ts`): Three modes for `emitTextInput`:

1. `directBind=true` (value={props.name}, no onChange):
```cpp
{
    auto& buf = ctx.get_buffer(0);
    buf.sync_from(props.name);
    if (imx::renderer::text_input("##name", buf)) {
        props.name = buf.value();
    }
}
```

2. `onChangeExpr` present (value={expr} onChange={callback}):
```cpp
{
    auto& buf = ctx.get_buffer(0);
    buf.sync_from(valueExpr);
    if (imx::renderer::text_input("##name", buf)) {
        onChangeExpr;
    }
}
```

3. `stateVar` present (value bound to useState — existing behavior, unchanged):
```cpp
{
    auto& buf = ctx.get_buffer(0);
    buf.sync_from(stateVar.get());
    if (imx::renderer::text_input("##name", buf)) {
        stateVar.set(buf.value());
    }
}
```

Note: TextInput still needs a `TextBuffer` even with struct binding because `ImGui::InputText` requires a mutable `char*` buffer. The buffer syncs from the struct field each frame and writes back on change.

### onChange callback convention

When `onChange` is provided, the callback receives the new string value. The emitter generates:
```cpp
if (imx::renderer::text_input("##name", buf)) {
    (onChangeExpr)(buf.value());
}
```

This matches how other widgets pass the new value to onChange.

## Fix 2: Custom component pointer propagation

### Current state

Custom component props are always passed by value:
```cpp
TodoItemProps p;
p.done = item.done;      // copy
TodoItem_render(ctx, p);
```

Inside the component, `<Checkbox value={props.done} />` emits `&props.done` — a pointer to the copy, not the original struct field.

### Design

**Detection**: During the resolve phase (`compile.ts`), scan each custom component's IR body for widgets using `directBind=true` with `props.X` expressions. Collect those prop names as "bound props" on the component metadata.

**Props struct**: For bound props, emit `T*` instead of `T`:
```cpp
struct TodoItemProps {
    bool* done = nullptr;    // bound prop → pointer
    std::string text;        // normal prop → value
    std::function<void()> onToggle;
};
```

**Call site**: For bound props, emit `&expr` instead of `expr`:
```cpp
TodoItemProps p;
p.done = &item.done;     // pass address
p.text = item.text;      // pass value
TodoItem_render(ctx, p);
```

**Inside component — directBind**: The widget emitter uses `props.done` directly (it's already `bool*`), no `&` prefix:
```cpp
imx::renderer::checkbox("##done", props.done);  // already a pointer
```

**Inside component — reading value**: Any expression reading `props.X` where X is a bound prop needs dereferencing. The `exprToCpp` function checks the component's bound props set and emits `(*props.X)` instead of `props.X`:
```cpp
if (*props.done) { ... }     // reading a bound prop
ImGui::Text(*props.name);   // reading a bound string prop
```

**Inside component — TextInput directBind**: Same pattern, dereference for sync:
```cpp
{
    auto& buf = ctx.get_buffer(0);
    buf.sync_from(*props.name);
    if (imx::renderer::text_input("##name", buf)) {
        *props.name = buf.value();
    }
}
```

### Bound prop detection algorithm

A prop is "bound" if all of these are true:
1. A widget in the component body has `directBind=true`
2. The widget's `valueExpr` is `props.X` (a direct prop reference)

This is checked during resolve by walking the IR tree. Nested components are not scanned — only direct widget children.

### What this enables

```tsx
function TodoItem(props: { done: boolean, text: string }) {
    return (
        <Row>
            <Checkbox value={props.done} />      {/* direct binding works! */}
            <Text>{props.text}</Text>
        </Row>
    );
}

// In parent:
{props.items.map((item, i) => (
    <TodoItem done={item.done} text={item.text} />
))}
```

The checkbox inside TodoItem now modifies the parent struct's `items[i].done` directly.

## Fix 3: DragDrop typed payloads

### Current state

The emitter hardcodes `float` for DragDrop payloads (`emitter.ts` line 978):
```cpp
float _dd_payload = static_cast<float>(${payload});
```

The lowering already parses the `onDrop` callback's type annotation and stores it as `cppType` in the `onDrop` prop string (`cppType|paramName|bodyCode`). But the source emitter ignores it.

### Design

**Propagate the payload type from DragDropTarget to DragDropSource.**

Since DragDropSource and DragDropTarget are paired by `type` string, the compiler can:

1. During resolve, scan for DragDropTarget nodes and extract the `cppType` from the `onDrop` prop
2. Store a map of `type → cppType` on the component
3. When emitting DragDropSource, look up the type and use the matching cppType

**Simpler alternative (recommended):** Add an optional `payloadType` field to DragDropSource IR. In lowering, if the source's `payload` expression is a property access on an `int` field (or if a `payloadType` attribute is specified), use `int`. Default remains `float`.

Actually, the simplest correct approach: **match the DragDropTarget's cppType.** The lowering already extracts it. Pass it through to the source emitter.

**Implementation:** During resolve, build a `dragDropTypes: Map<string, string>` (type string → C++ type). Populate from DragDropTarget nodes. Apply to DragDropSource emission.

**Emitter change** for DragDropSource:
```cpp
// Before: float _dd_payload = static_cast<float>(${payload});
// After:
${cppType} _dd_payload = static_cast<${cppType}>(${payload});
ImGui::SetDragDropPayload(${typeStr}, &_dd_payload, sizeof(_dd_payload));
```

**DragDropTarget emitter** already uses the correct type from the parsed `onDrop` string — no change needed there.

## Fix 4: Auto-generated map index names

### Current state

`.map()` lowering uses the user's parameter names directly as C++ loop variables. Nested maps with the same index name (e.g., both using `i`) cause variable shadowing.

### Design

Use compiler-generated unique loop counter names, with the user's variable name as an alias inside the loop body.

**Lowering**: Add `mapCounter: number` to `LoweringContext` (starts at 0, increments per map). Store the generated name in the IR alongside the user's name.

**IR**: Add `internalIndexVar: string` to `IRListMap`.

**Emitter** generates:
```cpp
for (size_t _map_idx_0 = 0; _map_idx_0 < items.size(); _map_idx_0++) {
    auto& item = items[_map_idx_0];
    size_t i = _map_idx_0;
    ctx.begin_instance("ListItem", (int)_map_idx_0, 0, 0);
    // ... body uses 'item' and 'i' normally
    ctx.end_instance();
}
```

Nested maps:
```cpp
for (size_t _map_idx_0 = 0; _map_idx_0 < columns.size(); _map_idx_0++) {
    auto& col = columns[_map_idx_0];
    size_t i = _map_idx_0;
    for (size_t _map_idx_1 = 0; _map_idx_1 < col.items.size(); _map_idx_1++) {
        auto& item = col.items[_map_idx_1];
        size_t i = _map_idx_1;  // C++ inner scope shadows outer — correct
        // ...
    }
}
```

Even if both maps use `i`, the actual loop counters are `_map_idx_0` and `_map_idx_1` — no collision. The user's `i` is just a scoped alias that shadows correctly.

## Files to change

| File | Fixes |
|------|-------|
| `compiler/src/ir.ts` | 1, 2, 4 — add fields to IRTextInput, IRCustomComponent, IRListMap |
| `compiler/src/lowering.ts` | 1, 4 — TextInput uses lowerValueOnChange, map counter |
| `compiler/src/emitter.ts` | 1, 2, 3, 4 — TextInput modes, pointer props, DragDrop type, map aliases |
| `compiler/src/compile.ts` | 2, 3 — resolve phase: bound prop detection, DragDrop type map |
| `compiler/src/init.ts` | 1 — update imx.d.ts to make onChange optional for TextInput |
| `compiler/dist/` | all — rebuild |
| `tests/` | all — emitter tests for each fix |

## What does NOT change

- `runtime/` — no changes (TextBuffer, ComponentInstance all work as-is)
- `renderer/` — no changes (text_input already returns bool, checkbox takes pointer)
- `include/imx/` — no changes
- Existing examples — they already work, no breakage
