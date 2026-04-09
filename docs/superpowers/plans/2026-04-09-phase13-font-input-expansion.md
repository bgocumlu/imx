# Phase 13: Font Loading & Input Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add font loading API, 24 vector input components, 7 button/slider variants, 2 color variants, and 7 advanced drawing primitives to IMX.

**Architecture:** All new components follow established patterns — `components.ts` → `ir.ts` → `lowering.ts` → `emitter.ts` → `renderer.h` → `components.cpp` → `init.ts` + `imx.d.ts`. Font loading is the only new subsystem (C++ font registry with `PushFont/PopFont` wrapper). Vector inputs use shared renderer helpers (`_n` suffix) dispatching by count to avoid 24 copy-paste functions.

**Tech Stack:** TypeScript (compiler), C++20 (renderer/runtime), ImGui, Vitest (compiler tests)

---

### Task 1: Font Loading — Renderer

**Files:**
- Modify: `include/imx/renderer.h:131-234`
- Modify: `renderer/components.cpp:1-714`

- [ ] **Step 1: Add font API declarations to renderer.h**

Add after the `register_theme` declaration (line 129) and inside the `renderer` namespace (before `before_child`):

In the `imx` namespace (after `register_theme` line 129, before `namespace renderer`):

```cpp
// Font loading — call before first frame, after ImGui context created
void load_font(const char* name, const char* path, float size);
void load_font_embedded(const char* name, const unsigned char* data, int data_size, float size);
```

Inside `namespace renderer` (after `draw_text` line 232, before the closing `}`):

```cpp
void begin_font(const char* name);
void end_font();
```

- [ ] **Step 2: Implement font registry and begin/end in components.cpp**

Add at the top of the file (after the existing static variables):

```cpp
static std::unordered_map<std::string, ImFont*> g_font_registry;
```

Add the font loading functions (in the `imx` namespace, before `namespace renderer`):

```cpp
void load_font(const char* name, const char* path, float size) {
    ImFont* font = ImGui::GetIO().Fonts->AddFontFromFileTTF(path, size);
    if (font) {
        g_font_registry[name] = font;
    }
}

void load_font_embedded(const char* name, const unsigned char* data, int data_size, float size) {
    ImFontConfig cfg;
    cfg.FontDataOwnedByAtlas = false;
    ImFont* font = ImGui::GetIO().Fonts->AddFontFromMemoryTTF(
        const_cast<void*>(static_cast<const void*>(data)), data_size, size, &cfg);
    if (font) {
        g_font_registry[name] = font;
    }
}
```

Add the renderer begin/end functions (after `draw_text`):

```cpp
void begin_font(const char* name) {
    before_child();
    auto it = g_font_registry.find(name);
    if (it != g_font_registry.end()) {
        ImGui::PushFont(it->second);
    } else {
        ImGui::PushFont(nullptr); // default font as fallback
    }
}

void end_font() {
    ImGui::PopFont();
}
```

- [ ] **Step 3: Build and verify C++ compiles**

Run: `cmake --build build --target imx_renderer`
Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git add include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add font loading API and begin_font/end_font renderer"
```

---

### Task 2: Font Loading — Compiler Pipeline

**Files:**
- Modify: `compiler/src/components.ts:466` (before closing `};`)
- Modify: `compiler/src/ir.ts:53` (tag union)
- Modify: `compiler/src/emitter.ts:904-912` (begin_container) and `emitter.ts:1026-1028` (end_container)

- [ ] **Step 1: Add Font to HOST_COMPONENTS in components.ts**

Add before the closing `};` on line 466:

```typescript
    Font: {
        props: {
            name: { type: 'string', required: true },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add 'Font' to the container tag union in ir.ts**

On line 51-53, add `'Font'` to the tag union in `IRBeginContainer`:

```typescript
       | 'Group' | 'ID' | 'StyleColor' | 'StyleVar' | 'DragDropSource' | 'DragDropTarget' | 'Canvas' | 'Disabled' | 'Child' | 'Font';
```

And the same on line 61-63 for `IREndContainer`.

- [ ] **Step 3: Add Font begin/end emission in emitter.ts**

In the `begin_container` switch (after the `Canvas` case around line 912), add:

```typescript
        case 'Font': {
            const name = asCharPtr(node.props['name'] ?? '""');
            lines.push(`${indent}imx::renderer::begin_font(${name});`);
            break;
        }
```

In the `end_container` switch (after the `Canvas` case around line 1028), add:

```typescript
        case 'Font':
            lines.push(`${indent}imx::renderer::end_font();`);
            break;
```

- [ ] **Step 4: Add Font to imx.d.ts in init.ts**

After the `ChildProps` interface (line 342), add:

```typescript
interface FontProps { name: string; children?: any; }
declare function Font(props: FontProps): any;
```

- [ ] **Step 5: Add Font to examples/hello/imx.d.ts**

Add the same `FontProps` interface and `declare function Font` after the existing `Child` declaration.

- [ ] **Step 6: Add emitter test for Font**

Add to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits Font with PushFont/PopFont', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Font name="custom">
        <Text>Hello</Text>
      </Font>
    </Window>
  );
}
        `);
        expect(output).toContain('begin_font("custom")');
        expect(output).toContain('end_font()');
    });
```

- [ ] **Step 7: Build compiler and run tests**

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/emitter.ts compiler/src/init.ts examples/hello/imx.d.ts compiler/tests/emitter.test.ts
git commit -m "feat: add Font container component to compiler pipeline"
```

---

### Task 3: Vector Inputs — Renderer (6 shared helpers)

**Files:**
- Modify: `include/imx/renderer.h:188-208`
- Modify: `renderer/components.cpp:219-249`

- [ ] **Step 1: Add vector input declarations to renderer.h**

After `drag_int` (line 191), add:

```cpp
bool input_float_n(const char* label, float* values, int count, const Style& style = {});
bool input_int_n(const char* label, int* values, int count, const Style& style = {});
bool drag_float_n(const char* label, float* values, int count, float speed = 1.0f, const Style& style = {});
bool drag_int_n(const char* label, int* values, int count, float speed = 1.0f, const Style& style = {});
bool slider_float_n(const char* label, float* values, int count, float min, float max, const Style& style = {});
bool slider_int_n(const char* label, int* values, int count, int min, int max, const Style& style = {});
```

- [ ] **Step 2: Implement vector input helpers in components.cpp**

After the existing `drag_int` function (around line 249), add:

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

bool input_int_n(const char* label, int* values, int count, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::InputInt2(label, values); break;
        case 3: r = ImGui::InputInt3(label, values); break;
        case 4: r = ImGui::InputInt4(label, values); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool drag_float_n(const char* label, float* values, int count, float speed, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::DragFloat2(label, values, speed); break;
        case 3: r = ImGui::DragFloat3(label, values, speed); break;
        case 4: r = ImGui::DragFloat4(label, values, speed); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool drag_int_n(const char* label, int* values, int count, float speed, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::DragInt2(label, values, speed); break;
        case 3: r = ImGui::DragInt3(label, values, speed); break;
        case 4: r = ImGui::DragInt4(label, values, speed); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool slider_float_n(const char* label, float* values, int count, float min, float max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::SliderFloat2(label, values, min, max); break;
        case 3: r = ImGui::SliderFloat3(label, values, min, max); break;
        case 4: r = ImGui::SliderFloat4(label, values, min, max); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool slider_int_n(const char* label, int* values, int count, int min, int max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::SliderInt2(label, values, min, max); break;
        case 3: r = ImGui::SliderInt3(label, values, min, max); break;
        case 4: r = ImGui::SliderInt4(label, values, min, max); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}
```

- [ ] **Step 3: Build and verify**

Run: `cmake --build build --target imx_renderer`
Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git add include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add vector input renderer helpers (input/drag/slider float/int 2/3/4)"
```

---

### Task 4: Vector Inputs — Compiler Pipeline (24 components)

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`

- [ ] **Step 1: Add 24 vector input entries to HOST_COMPONENTS in components.ts**

Add before the closing `};`. All follow the same pattern per family:

```typescript
    InputFloat2: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputFloat3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputFloat4: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputInt2: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputInt3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputInt4: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragFloat2: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragFloat3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragFloat4: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragInt2: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragInt3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragInt4: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderFloat2: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderFloat3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderFloat4: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderInt2: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderInt3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderInt4: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add 6 vector IR types to ir.ts**

Add to the `IRNode` union type (line 32-46):

```typescript
    | IRInputFloatN | IRInputIntN | IRDragFloatN | IRDragIntN | IRSliderFloatN | IRSliderIntN
```

Add the interface definitions (after `IRColorPicker` around line 103):

```typescript
export interface IRInputFloatN { kind: 'input_float_n'; label: string; count: number; valueExpr: string; directBind?: boolean; onChangeExpr?: string; style?: string; loc?: SourceLoc; }
export interface IRInputIntN { kind: 'input_int_n'; label: string; count: number; valueExpr: string; directBind?: boolean; onChangeExpr?: string; style?: string; loc?: SourceLoc; }
export interface IRDragFloatN { kind: 'drag_float_n'; label: string; count: number; valueExpr: string; directBind?: boolean; onChangeExpr?: string; speed: string; style?: string; loc?: SourceLoc; }
export interface IRDragIntN { kind: 'drag_int_n'; label: string; count: number; valueExpr: string; directBind?: boolean; onChangeExpr?: string; speed: string; style?: string; loc?: SourceLoc; }
export interface IRSliderFloatN { kind: 'slider_float_n'; label: string; count: number; valueExpr: string; directBind?: boolean; onChangeExpr?: string; min: string; max: string; style?: string; loc?: SourceLoc; }
export interface IRSliderIntN { kind: 'slider_int_n'; label: string; count: number; valueExpr: string; directBind?: boolean; onChangeExpr?: string; min: string; max: string; style?: string; loc?: SourceLoc; }
```

- [ ] **Step 3: Add vector input lowering in lowering.ts**

Add a shared helper and 24 case statements. First, the helper function (after `lowerColorEdit` around line 1321):

```typescript
function lowerVectorInput(
    family: 'input_float_n' | 'input_int_n' | 'drag_float_n' | 'drag_int_n' | 'slider_float_n' | 'slider_int_n',
    count: number,
    attrs: Record<string, string>,
    rawAttrs: Map<string, ts.Expression | null>,
    body: IRNode[],
    ctx: LoweringContext,
    loc: SourceLoc
): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    const valueRaw = rawAttrs.get('value');
    let valueExpr = '';
    let directBind: boolean | undefined;
    let onChangeExpr: string | undefined;

    if (valueRaw) {
        valueExpr = exprToCpp(valueRaw, ctx);
        const onChangeRaw = rawAttrs.get('onChange');
        if (onChangeRaw) {
            onChangeExpr = exprToCpp(onChangeRaw, ctx);
            if (onChangeExpr.startsWith('[')) {
                onChangeExpr = `(${onChangeExpr})()`;
            } else if (!onChangeExpr.endsWith(')')) {
                onChangeExpr = `${onChangeExpr}()`;
            }
        } else if (ts.isPropertyAccessExpression(valueRaw)) {
            directBind = true;
        }
    }

    const base: any = { kind: family, label, count, valueExpr, directBind, onChangeExpr, style, loc };

    if (family === 'drag_float_n' || family === 'drag_int_n') {
        base.speed = attrs['speed'] ?? '1.0f';
    }
    if (family === 'slider_float_n') {
        base.min = attrs['min'] ?? '0.0f';
        base.max = attrs['max'] ?? '1.0f';
    }
    if (family === 'slider_int_n') {
        base.min = attrs['min'] ?? '0';
        base.max = attrs['max'] ?? '100';
    }

    body.push(base);
}
```

Then in the switch statement (after the `DrawText` case around line 669), add:

```typescript
        case 'InputFloat2': lowerVectorInput('input_float_n', 2, attrs, rawAttrs, body, ctx, loc); break;
        case 'InputFloat3': lowerVectorInput('input_float_n', 3, attrs, rawAttrs, body, ctx, loc); break;
        case 'InputFloat4': lowerVectorInput('input_float_n', 4, attrs, rawAttrs, body, ctx, loc); break;
        case 'InputInt2': lowerVectorInput('input_int_n', 2, attrs, rawAttrs, body, ctx, loc); break;
        case 'InputInt3': lowerVectorInput('input_int_n', 3, attrs, rawAttrs, body, ctx, loc); break;
        case 'InputInt4': lowerVectorInput('input_int_n', 4, attrs, rawAttrs, body, ctx, loc); break;
        case 'DragFloat2': lowerVectorInput('drag_float_n', 2, attrs, rawAttrs, body, ctx, loc); break;
        case 'DragFloat3': lowerVectorInput('drag_float_n', 3, attrs, rawAttrs, body, ctx, loc); break;
        case 'DragFloat4': lowerVectorInput('drag_float_n', 4, attrs, rawAttrs, body, ctx, loc); break;
        case 'DragInt2': lowerVectorInput('drag_int_n', 2, attrs, rawAttrs, body, ctx, loc); break;
        case 'DragInt3': lowerVectorInput('drag_int_n', 3, attrs, rawAttrs, body, ctx, loc); break;
        case 'DragInt4': lowerVectorInput('drag_int_n', 4, attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderFloat2': lowerVectorInput('slider_float_n', 2, attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderFloat3': lowerVectorInput('slider_float_n', 3, attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderFloat4': lowerVectorInput('slider_float_n', 4, attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderInt2': lowerVectorInput('slider_int_n', 2, attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderInt3': lowerVectorInput('slider_int_n', 3, attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderInt4': lowerVectorInput('slider_int_n', 4, attrs, rawAttrs, body, ctx, loc); break;
```

Note: The lowering switch uses `rawAttrs` — get it by adding `const rawAttrs = getRawAttributes(node.openingElement.attributes);` if not already present at the call site for self-closing elements. Check how the existing self-closing path works — if `rawAttrs` is already available at the switch statement, use it directly. Otherwise extract it like the existing `SliderFloat` case does.

- [ ] **Step 4: Add vector input emission in emitter.ts**

Add shared emitter helper (after `emitColorPicker` around line 1650):

```typescript
function emitVectorInput(
    node: any,
    rendererFn: string,
    cppType: string,
    lines: string[],
    indent: string,
    extraArgs: string = ''
): void {
    const label = asCharPtr(node.label);
    const count = node.count;

    if (node.directBind && node.valueExpr) {
        const style = node.style ? `, ${node.style}` : '';
        lines.push(`${indent}imx::renderer::${rendererFn}(${label}, ${node.valueExpr}, ${count}${extraArgs}${style});`);
    } else if (node.valueExpr) {
        const style = node.style ? `, ${node.style}` : '';
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}${cppType} _vec_val[${count}];`);
        lines.push(`${indent}${INDENT}// Copy from source — user must provide array expression`);
        lines.push(`${indent}${INDENT}auto& _vec_src = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}for (int i = 0; i < ${count}; ++i) _vec_val[i] = _vec_src[i];`);
        lines.push(`${indent}${INDENT}if (imx::renderer::${rendererFn}(${label}, _vec_val, ${count}${extraArgs}${style})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        } else {
            lines.push(`${indent}${INDENT}${INDENT}for (int i = 0; i < ${count}; ++i) _vec_src[i] = _vec_val[i];`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}
```

Add cases in the emitNode switch (after the `draw_text` case around line 493):

```typescript
        case 'input_float_n':
            emitVectorInput(node, 'input_float_n', 'float', lines, indent);
            break;
        case 'input_int_n':
            emitVectorInput(node, 'input_int_n', 'int', lines, indent);
            break;
        case 'drag_float_n': {
            const speed = ensureFloatLiteral((node as any).speed);
            emitVectorInput(node, 'drag_float_n', 'float', lines, indent, `, ${speed}`);
            break;
        }
        case 'drag_int_n': {
            const speed = ensureFloatLiteral((node as any).speed);
            emitVectorInput(node, 'drag_int_n', 'int', lines, indent, `, ${speed}`);
            break;
        }
        case 'slider_float_n': {
            const min = ensureFloatLiteral((node as any).min);
            const max = ensureFloatLiteral((node as any).max);
            emitVectorInput(node, 'slider_float_n', 'float', lines, indent, `, ${min}, ${max}`);
            break;
        }
        case 'slider_int_n': {
            emitVectorInput(node, 'slider_int_n', 'int', lines, indent, `, ${(node as any).min}, ${(node as any).max}`);
            break;
        }
```

- [ ] **Step 5: Add emitter test for vector inputs**

Add to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits InputFloat3 with direct binding', () => {
        const output = compile(`
export function App(props: AppState) {
  return (
    <Window title="Test">
      <InputFloat3 label="Position" value={props.position} />
    </Window>
  );
}
        `);
        expect(output).toContain('input_float_n("Position"');
        expect(output).toContain(', 3');
    });

    it('emits SliderFloat2 with direct binding', () => {
        const output = compile(`
export function App(props: AppState) {
  return (
    <Window title="Test">
      <SliderFloat2 label="Range" value={props.range} min={0} max={1} />
    </Window>
  );
}
        `);
        expect(output).toContain('slider_float_n("Range"');
        expect(output).toContain(', 2');
    });

    it('emits DragInt4 with direct binding', () => {
        const output = compile(`
export function App(props: AppState) {
  return (
    <Window title="Test">
      <DragInt4 label="Margins" value={props.margins} speed={1} />
    </Window>
  );
}
        `);
        expect(output).toContain('drag_int_n("Margins"');
        expect(output).toContain(', 4');
    });
```

- [ ] **Step 6: Build compiler and run tests**

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: add 24 vector input components to compiler pipeline"
```

---

### Task 5: Vector Inputs — Type Definitions

**Files:**
- Modify: `compiler/src/init.ts`
- Modify: `examples/hello/imx.d.ts`

- [ ] **Step 1: Add vector input interfaces to init.ts IMX_DTS**

After the existing `InputFloatProps` interface (line 222), add:

```typescript
interface InputFloat2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; style?: Style; }
interface InputFloat3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; style?: Style; }
interface InputFloat4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; style?: Style; }
interface InputInt2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; style?: Style; }
interface InputInt3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; style?: Style; }
interface InputInt4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; style?: Style; }
interface DragFloat2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; speed?: number; style?: Style; }
interface DragFloat3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; speed?: number; style?: Style; }
interface DragFloat4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; speed?: number; style?: Style; }
interface DragInt2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; speed?: number; style?: Style; }
interface DragInt3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; speed?: number; style?: Style; }
interface DragInt4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; speed?: number; style?: Style; }
interface SliderFloat2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; min: number; max: number; style?: Style; }
interface SliderFloat3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; min: number; max: number; style?: Style; }
interface SliderFloat4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; min: number; max: number; style?: Style; }
interface SliderInt2Props { label: string; value: [number, number]; onChange?: (v: [number, number]) => void; min: number; max: number; style?: Style; }
interface SliderInt3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; min: number; max: number; style?: Style; }
interface SliderInt4Props { label: string; value: [number, number, number, number]; onChange?: (v: [number, number, number, number]) => void; min: number; max: number; style?: Style; }
```

Add declare functions after the existing `InputFloat` declare (around line 300):

```typescript
declare function InputFloat2(props: InputFloat2Props): any;
declare function InputFloat3(props: InputFloat3Props): any;
declare function InputFloat4(props: InputFloat4Props): any;
declare function InputInt2(props: InputInt2Props): any;
declare function InputInt3(props: InputInt3Props): any;
declare function InputInt4(props: InputInt4Props): any;
declare function DragFloat2(props: DragFloat2Props): any;
declare function DragFloat3(props: DragFloat3Props): any;
declare function DragFloat4(props: DragFloat4Props): any;
declare function DragInt2(props: DragInt2Props): any;
declare function DragInt3(props: DragInt3Props): any;
declare function DragInt4(props: DragInt4Props): any;
declare function SliderFloat2(props: SliderFloat2Props): any;
declare function SliderFloat3(props: SliderFloat3Props): any;
declare function SliderFloat4(props: SliderFloat4Props): any;
declare function SliderInt2(props: SliderInt2Props): any;
declare function SliderInt3(props: SliderInt3Props): any;
declare function SliderInt4(props: SliderInt4Props): any;
```

- [ ] **Step 2: Add the same to examples/hello/imx.d.ts**

Copy the same interfaces and declare functions to the example's `imx.d.ts`.

- [ ] **Step 3: Build compiler and run tests**

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add compiler/src/init.ts examples/hello/imx.d.ts
git commit -m "feat: add vector input type definitions to imx.d.ts"
```

---

### Task 6: Button Variants — Renderer (SmallButton, ArrowButton, InvisibleButton, ImageButton)

**Files:**
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`

- [ ] **Step 1: Add button variant declarations to renderer.h**

After `button` (line 149), add:

```cpp
bool small_button(const char* label);
bool arrow_button(const char* id, int direction);
bool invisible_button(const char* id, float width, float height);
bool image_button(const char* id, const char* src, float width, float height);
```

- [ ] **Step 2: Implement button variants in components.cpp**

Add after the existing `button` function:

```cpp
bool small_button(const char* label) {
    before_child();
    return ImGui::SmallButton(label);
}

bool arrow_button(const char* id, int direction) {
    before_child();
    return ImGui::ArrowButton(id, static_cast<ImGuiDir>(direction));
}

bool invisible_button(const char* id, float width, float height) {
    before_child();
    return ImGui::InvisibleButton(id, ImVec2(width, height));
}

bool image_button(const char* id, const char* src, float width, float height) {
    before_child();
    auto tex = get_or_load_texture(src);
    if (tex.id == 0) return false;
    float w = width > 0 ? width : static_cast<float>(tex.width);
    float h = height > 0 ? height : static_cast<float>(tex.height);
    return ImGui::ImageButton(id, (ImTextureID)(intptr_t)tex.id, ImVec2(w, h));
}
```

Note: `get_or_load_texture` is the existing texture helper used by the `Image` component in `texture.cpp`. Check that `image_button` can access it — it may need a forward declaration or to be in the same translation unit. If not accessible, expose it in the renderer header.

- [ ] **Step 3: Build and verify**

Run: `cmake --build build --target imx_renderer`
Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git add include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add SmallButton, ArrowButton, InvisibleButton, ImageButton renderer"
```

---

### Task 7: Button Variants — Compiler Pipeline

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `examples/hello/imx.d.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add button variants to HOST_COMPONENTS**

```typescript
    SmallButton: {
        props: {
            label: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    ArrowButton: {
        props: {
            id: { type: 'string', required: true },
            direction: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    InvisibleButton: {
        props: {
            id: { type: 'string', required: true },
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            onPress: { type: 'callback', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    ImageButton: {
        props: {
            id: { type: 'string', required: true },
            src: { type: 'string', required: true },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            onPress: { type: 'callback', required: true },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR types**

Add to `IRNode` union:

```typescript
    | IRSmallButton | IRArrowButton | IRInvisibleButton | IRImageButton
```

Add interfaces:

```typescript
export interface IRSmallButton { kind: 'small_button'; label: string; action: string[]; loc?: SourceLoc; }
export interface IRArrowButton { kind: 'arrow_button'; id: string; direction: string; action: string[]; loc?: SourceLoc; }
export interface IRInvisibleButton { kind: 'invisible_button'; id: string; width: string; height: string; action: string[]; loc?: SourceLoc; }
export interface IRImageButton { kind: 'image_button'; id: string; src: string; width?: string; height?: string; action: string[]; loc?: SourceLoc; }
```

- [ ] **Step 3: Add lowering**

Add lowering functions (after the existing `lowerTooltip`):

```typescript
function lowerSmallButton(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const action = lowerCallback(rawAttrs.get('onPress'), ctx);
    body.push({ kind: 'small_button', label, action, loc });
}

function lowerArrowButton(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const id = attrs['id'] ?? '""';
    const direction = attrs['direction'] ?? '"left"';
    const action = lowerCallback(rawAttrs.get('onPress'), ctx);
    body.push({ kind: 'arrow_button', id, direction, action, loc });
}

function lowerInvisibleButton(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const id = attrs['id'] ?? '""';
    const width = attrs['width'] ?? '100';
    const height = attrs['height'] ?? '100';
    const action = lowerCallback(rawAttrs.get('onPress'), ctx);
    body.push({ kind: 'invisible_button', id, width, height, action, loc });
}

function lowerImageButton(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const id = attrs['id'] ?? '""';
    const src = attrs['src'] ?? '""';
    const width = attrs['width'];
    const height = attrs['height'];
    const action = lowerCallback(rawAttrs.get('onPress'), ctx);
    body.push({ kind: 'image_button', id, src, width, height, action, loc });
}
```

Note: `lowerCallback` — check if this helper exists. If not, extract the callback lowering pattern from the existing `Button` lowering (look for how `onPress` is handled — it typically collects action lines from arrow function bodies). Use the same pattern.

Add switch cases:

```typescript
        case 'SmallButton': lowerSmallButton(attrs, rawAttrs, body, ctx, loc); break;
        case 'ArrowButton': lowerArrowButton(attrs, rawAttrs, body, ctx, loc); break;
        case 'InvisibleButton': lowerInvisibleButton(attrs, rawAttrs, body, ctx, loc); break;
        case 'ImageButton': lowerImageButton(attrs, rawAttrs, body, ctx, loc); break;
```

- [ ] **Step 4: Add emission**

Add emitter functions:

```typescript
function emitSmallButton(node: IRSmallButton, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'SmallButton', lines, indent);
    const label = asCharPtr(node.label);
    lines.push(`${indent}if (imx::renderer::small_button(${label})) {`);
    for (const line of node.action) {
        lines.push(`${indent}${INDENT}${line};`);
    }
    lines.push(`${indent}}`);
}

function emitArrowButton(node: IRArrowButton, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ArrowButton', lines, indent);
    const id = asCharPtr(node.id);
    const dirMap: Record<string, string> = { '"left"': '0', '"right"': '1', '"up"': '2', '"down"': '3' };
    const dir = dirMap[node.direction] ?? '0';
    lines.push(`${indent}if (imx::renderer::arrow_button(${id}, ${dir})) {`);
    for (const line of node.action) {
        lines.push(`${indent}${INDENT}${line};`);
    }
    lines.push(`${indent}}`);
}

function emitInvisibleButton(node: IRInvisibleButton, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InvisibleButton', lines, indent);
    const id = asCharPtr(node.id);
    const width = emitFloat(node.width);
    const height = emitFloat(node.height);
    lines.push(`${indent}if (imx::renderer::invisible_button(${id}, ${width}, ${height})) {`);
    for (const line of node.action) {
        lines.push(`${indent}${INDENT}${line};`);
    }
    lines.push(`${indent}}`);
}

function emitImageButton(node: IRImageButton, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ImageButton', lines, indent);
    const id = asCharPtr(node.id);
    const src = asCharPtr(node.src);
    const width = node.width ? emitFloat(node.width) : '0';
    const height = node.height ? emitFloat(node.height) : '0';
    lines.push(`${indent}if (imx::renderer::image_button(${id}, ${src}, ${width}, ${height})) {`);
    for (const line of node.action) {
        lines.push(`${indent}${INDENT}${line};`);
    }
    lines.push(`${indent}}`);
}
```

Add switch cases:

```typescript
        case 'small_button': emitSmallButton(node, lines, indent); break;
        case 'arrow_button': emitArrowButton(node, lines, indent); break;
        case 'invisible_button': emitInvisibleButton(node, lines, indent); break;
        case 'image_button': emitImageButton(node, lines, indent); break;
```

- [ ] **Step 5: Add type definitions to init.ts and examples/hello/imx.d.ts**

```typescript
interface SmallButtonProps { label: string; onPress: () => void; }
interface ArrowButtonProps { id: string; direction: "left" | "right" | "up" | "down"; onPress: () => void; }
interface InvisibleButtonProps { id: string; width: number; height: number; onPress: () => void; }
interface ImageButtonProps { id: string; src: string; width?: number; height?: number; onPress: () => void; }
declare function SmallButton(props: SmallButtonProps): any;
declare function ArrowButton(props: ArrowButtonProps): any;
declare function InvisibleButton(props: InvisibleButtonProps): any;
declare function ImageButton(props: ImageButtonProps): any;
```

- [ ] **Step 6: Add emitter tests**

```typescript
    it('emits SmallButton', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <SmallButton label="x" onPress={() => {}} />
    </Window>
  );
}
        `);
        expect(output).toContain('small_button("x")');
    });

    it('emits ArrowButton', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <ArrowButton id="nav" direction="left" onPress={() => {}} />
    </Window>
  );
}
        `);
        expect(output).toContain('arrow_button("nav"');
    });
```

- [ ] **Step 7: Build and test**

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts examples/hello/imx.d.ts compiler/tests/emitter.test.ts
git commit -m "feat: add SmallButton, ArrowButton, InvisibleButton, ImageButton to compiler"
```

---

### Task 8: Vertical Sliders & SliderAngle — Full Stack

**Files:**
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `examples/hello/imx.d.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add renderer declarations**

```cpp
bool vslider_float(const char* label, float width, float height, float* value, float min, float max, const Style& style = {});
bool vslider_int(const char* label, float width, float height, int* value, int min, int max, const Style& style = {});
bool slider_angle(const char* label, float* value, float min = -360.0f, float max = 360.0f, const Style& style = {});
```

- [ ] **Step 2: Implement in components.cpp**

```cpp
bool vslider_float(const char* label, float width, float height, float* value, float min, float max, const Style& style) {
    before_child();
    return ImGui::VSliderFloat(label, ImVec2(width, height), value, min, max);
}

bool vslider_int(const char* label, float width, float height, int* value, int min, int max, const Style& style) {
    before_child();
    return ImGui::VSliderInt(label, ImVec2(width, height), value, min, max);
}

bool slider_angle(const char* label, float* value, float min, float max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::SliderAngle(label, value, min, max);
    if (style.width) ImGui::PopItemWidth();
    return r;
}
```

- [ ] **Step 3: Add to HOST_COMPONENTS**

```typescript
    VSliderFloat: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    VSliderInt: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderAngle: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: false },
            max: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 4: Add IR types**

```typescript
    | IRVSliderFloat | IRVSliderInt | IRSliderAngle
```

```typescript
export interface IRVSliderFloat { kind: 'vslider_float'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; width: string; height: string; min: string; max: string; style?: string; loc?: SourceLoc; }
export interface IRVSliderInt { kind: 'vslider_int'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; width: string; height: string; min: string; max: string; style?: string; loc?: SourceLoc; }
export interface IRSliderAngle { kind: 'slider_angle'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; min: string; max: string; style?: string; loc?: SourceLoc; }
```

- [ ] **Step 5: Add lowering**

```typescript
function lowerVSliderFloat(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const width = attrs['width'] ?? '20';
    const height = attrs['height'] ?? '100';
    const min = attrs['min'] ?? '0.0f';
    const max = attrs['max'] ?? '1.0f';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr, directBind } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'vslider_float', label, stateVar, valueExpr, onChangeExpr, directBind, width, height, min, max, style, loc });
}

function lowerVSliderInt(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const width = attrs['width'] ?? '20';
    const height = attrs['height'] ?? '100';
    const min = attrs['min'] ?? '0';
    const max = attrs['max'] ?? '100';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr, directBind } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'vslider_int', label, stateVar, valueExpr, onChangeExpr, directBind, width, height, min, max, style, loc });
}

function lowerSliderAngle(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const min = attrs['min'] ?? '-360.0f';
    const max = attrs['max'] ?? '360.0f';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr, directBind } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'slider_angle', label, stateVar, valueExpr, onChangeExpr, directBind, min, max, style, loc });
}
```

Switch cases:

```typescript
        case 'VSliderFloat': lowerVSliderFloat(attrs, rawAttrs, body, ctx, loc); break;
        case 'VSliderInt': lowerVSliderInt(attrs, rawAttrs, body, ctx, loc); break;
        case 'SliderAngle': lowerSliderAngle(attrs, rawAttrs, body, ctx, loc); break;
```

- [ ] **Step 6: Add emission**

Follow exact same 3-binding-mode pattern as `emitSliderFloat`, but with `vslider_float(label, width, height, &val, min, max)` signature. For `SliderAngle`, same pattern as `SliderFloat` but calling `slider_angle`.

```typescript
function emitVSliderFloat(node: IRVSliderFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'VSliderFloat', lines, indent);
    const label = asCharPtr(node.label);
    const width = emitFloat(node.width);
    const height = emitFloat(node.height);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::vslider_float(${label}, ${width}, ${height}, &val, ${min}, ${max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::vslider_float(${label}, ${width}, ${height}, ${emitDirectBindPtr(node.valueExpr)}, ${min}, ${max});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::vslider_float(${label}, ${width}, ${height}, &val, ${min}, ${max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitVSliderInt(node: IRVSliderInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'VSliderInt', lines, indent);
    const label = asCharPtr(node.label);
    const width = emitFloat(node.width);
    const height = emitFloat(node.height);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::vslider_int(${label}, ${width}, ${height}, &val, ${node.min}, ${node.max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::vslider_int(${label}, ${width}, ${height}, ${emitDirectBindPtr(node.valueExpr)}, ${node.min}, ${node.max});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::vslider_int(${label}, ${width}, ${height}, &val, ${node.min}, ${node.max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitSliderAngle(node: IRSliderAngle, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'SliderAngle', lines, indent);
    const label = asCharPtr(node.label);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_angle(${label}, &val, ${min}, ${max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::slider_angle(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${min}, ${max});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_angle(${label}, &val, ${min}, ${max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}
```

Switch cases:

```typescript
        case 'vslider_float': emitVSliderFloat(node, lines, indent); break;
        case 'vslider_int': emitVSliderInt(node, lines, indent); break;
        case 'slider_angle': emitSliderAngle(node, lines, indent); break;
```

- [ ] **Step 7: Add type definitions**

In init.ts and examples/hello/imx.d.ts:

```typescript
interface VSliderFloatProps { label: string; value: number; onChange?: (v: number) => void; width: number; height: number; min: number; max: number; style?: Style; }
interface VSliderIntProps { label: string; value: number; onChange?: (v: number) => void; width: number; height: number; min: number; max: number; style?: Style; }
interface SliderAngleProps { label: string; value: number; onChange?: (v: number) => void; min?: number; max?: number; style?: Style; }
declare function VSliderFloat(props: VSliderFloatProps): any;
declare function VSliderInt(props: VSliderIntProps): any;
declare function SliderAngle(props: SliderAngleProps): any;
```

- [ ] **Step 8: Add tests and verify**

```typescript
    it('emits VSliderFloat with direct binding', () => {
        const output = compile(`
export function App(props: AppState) {
  return (
    <Window title="Test">
      <VSliderFloat label="Vol" value={props.volume} width={20} height={100} min={0} max={1} />
    </Window>
  );
}
        `);
        expect(output).toContain('vslider_float("Vol"');
    });

    it('emits SliderAngle with direct binding', () => {
        const output = compile(`
export function App(props: AppState) {
  return (
    <Window title="Test">
      <SliderAngle label="Rot" value={props.angle} min={-360} max={360} />
    </Window>
  );
}
        `);
        expect(output).toContain('slider_angle("Rot"');
    });
```

Run: `cd compiler && npm run build && npx vitest run`
Expected: All tests pass

- [ ] **Step 9: Build C++ and commit**

Run: `cmake --build build --target imx_renderer`

```bash
git add include/imx/renderer.h renderer/components.cpp compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts examples/hello/imx.d.ts compiler/tests/emitter.test.ts
git commit -m "feat: add VSliderFloat, VSliderInt, SliderAngle full stack"
```

---

### Task 9: Color Variants — Full Stack (ColorEdit3, ColorPicker3)

**Files:**
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `examples/hello/imx.d.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add renderer**

Declaration:

```cpp
bool color_edit3(const char* label, float color[3], const Style& style = {});
bool color_picker3(const char* label, float color[3], const Style& style = {});
```

Implementation:

```cpp
bool color_edit3(const char* label, float color[3], const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::ColorEdit3(label, color);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool color_picker3(const char* label, float color[3], const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::ColorPicker3(label, color);
    if (style.width) ImGui::PopItemWidth();
    return r;
}
```

- [ ] **Step 2: Add compiler pipeline**

HOST_COMPONENTS (same pattern as ColorEdit/ColorPicker):

```typescript
    ColorEdit3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    ColorPicker3: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

IR types:

```typescript
    | IRColorEdit3 | IRColorPicker3
```

```typescript
export interface IRColorEdit3 { kind: 'color_edit3'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; style?: string; loc?: SourceLoc; }
export interface IRColorPicker3 { kind: 'color_picker3'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; style?: string; loc?: SourceLoc; }
```

Lowering — reuse the same pattern as `lowerColorEdit` (the special color lowering that handles the value/onChange differently from `lowerValueOnChange`):

```typescript
function lowerColorEdit3(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    let stateVar = '';
    let valueExpr: string | undefined;
    let onChangeExpr: string | undefined;
    let directBind: boolean | undefined;
    const valueRaw = rawAttrs.get('value');
    if (valueRaw && ts.isIdentifier(valueRaw) && ctx.stateVars.has(valueRaw.text)) {
        stateVar = valueRaw.text;
    } else if (valueRaw) {
        valueExpr = exprToCpp(valueRaw, ctx);
        const onChangeRaw = rawAttrs.get('onChange');
        if (onChangeRaw) {
            onChangeExpr = exprToCpp(onChangeRaw, ctx);
            if (onChangeExpr.startsWith('[')) onChangeExpr = `(${onChangeExpr})()`;
            else if (!onChangeExpr.endsWith(')')) onChangeExpr = `${onChangeExpr}()`;
        } else if (valueRaw && ts.isPropertyAccessExpression(valueRaw)) {
            directBind = true;
        }
    }
    body.push({ kind: 'color_edit3', label, stateVar, valueExpr, onChangeExpr, directBind, style, loc });
}

function lowerColorPicker3(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    let stateVar = '';
    let valueExpr: string | undefined;
    let onChangeExpr: string | undefined;
    let directBind: boolean | undefined;
    const valueRaw = rawAttrs.get('value');
    if (valueRaw && ts.isIdentifier(valueRaw) && ctx.stateVars.has(valueRaw.text)) {
        stateVar = valueRaw.text;
    } else if (valueRaw) {
        valueExpr = exprToCpp(valueRaw, ctx);
        const onChangeRaw = rawAttrs.get('onChange');
        if (onChangeRaw) {
            onChangeExpr = exprToCpp(onChangeRaw, ctx);
            if (onChangeExpr.startsWith('[')) onChangeExpr = `(${onChangeExpr})()`;
            else if (!onChangeExpr.endsWith(')')) onChangeExpr = `${onChangeExpr}()`;
        } else if (valueRaw && ts.isPropertyAccessExpression(valueRaw)) {
            directBind = true;
        }
    }
    body.push({ kind: 'color_picker3', label, stateVar, valueExpr, onChangeExpr, directBind, style, loc });
}
```

Switch cases:

```typescript
        case 'ColorEdit3': lowerColorEdit3(attrs, rawAttrs, body, ctx, loc); break;
        case 'ColorPicker3': lowerColorPicker3(attrs, rawAttrs, body, ctx, loc); break;
```

Emission — same as `emitColorEdit`/`emitColorPicker` but using `color_edit3`/`color_picker3` and `float[3]` instead of `float[4]`.

Switch cases:

```typescript
        case 'color_edit3': emitColorEdit3(node, lines, indent); break;
        case 'color_picker3': emitColorPicker3(node, lines, indent); break;
```

- [ ] **Step 3: Type definitions**

```typescript
interface ColorEdit3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; style?: Style; }
interface ColorPicker3Props { label: string; value: [number, number, number]; onChange?: (v: [number, number, number]) => void; style?: Style; }
declare function ColorEdit3(props: ColorEdit3Props): any;
declare function ColorPicker3(props: ColorPicker3Props): any;
```

- [ ] **Step 4: Tests, build, commit**

Run: `cd compiler && npm run build && npx vitest run`
Run: `cmake --build build --target imx_renderer`

```bash
git add include/imx/renderer.h renderer/components.cpp compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts examples/hello/imx.d.ts compiler/tests/emitter.test.ts
git commit -m "feat: add ColorEdit3, ColorPicker3 full stack"
```

---

### Task 10: DrawList Advanced — Renderer (7 primitives)

**Files:**
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`

- [ ] **Step 1: Add declarations to renderer.h**

After `draw_text` (line 232):

```cpp
void draw_bezier_cubic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, float p4x, float p4y, ImVec4 color, float thickness = 1.0f, int segments = 0);
void draw_bezier_quadratic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, float thickness = 1.0f, int segments = 0);
void draw_polyline(const float* points, int point_count, ImVec4 color, float thickness = 1.0f, bool closed = false);
void draw_convex_poly_filled(const float* points, int point_count, ImVec4 color);
void draw_ngon(float cx, float cy, float radius, ImVec4 color, int num_segments, float thickness = 1.0f);
void draw_ngon_filled(float cx, float cy, float radius, ImVec4 color, int num_segments);
void draw_triangle(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, bool filled = false, float thickness = 1.0f);
```

- [ ] **Step 2: Implement in components.cpp**

After `draw_text`:

```cpp
void draw_bezier_cubic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, float p4x, float p4y, ImVec4 color, float thickness, int segments) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddBezierCubic(
        ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
        ImVec2(o.x + p3x, o.y + p3y), ImVec2(o.x + p4x, o.y + p4y),
        ImGui::ColorConvertFloat4ToU32(color), thickness, segments);
}

void draw_bezier_quadratic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, float thickness, int segments) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddBezierQuadratic(
        ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
        ImVec2(o.x + p3x, o.y + p3y),
        ImGui::ColorConvertFloat4ToU32(color), thickness, segments);
}

void draw_polyline(const float* points, int point_count, ImVec4 color, float thickness, bool closed) {
    ImVec2 o = canvas_origin();
    std::vector<ImVec2> pts(point_count);
    for (int i = 0; i < point_count; ++i) {
        pts[i] = ImVec2(o.x + points[i * 2], o.y + points[i * 2 + 1]);
    }
    ImGui::GetWindowDrawList()->AddPolyline(pts.data(), point_count,
        ImGui::ColorConvertFloat4ToU32(color), closed ? ImDrawFlags_Closed : ImDrawFlags_None, thickness);
}

void draw_convex_poly_filled(const float* points, int point_count, ImVec4 color) {
    ImVec2 o = canvas_origin();
    std::vector<ImVec2> pts(point_count);
    for (int i = 0; i < point_count; ++i) {
        pts[i] = ImVec2(o.x + points[i * 2], o.y + points[i * 2 + 1]);
    }
    ImGui::GetWindowDrawList()->AddConvexPolyFilled(pts.data(), point_count,
        ImGui::ColorConvertFloat4ToU32(color));
}

void draw_ngon(float cx, float cy, float radius, ImVec4 color, int num_segments, float thickness) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddNgon(ImVec2(o.x + cx, o.y + cy), radius,
        ImGui::ColorConvertFloat4ToU32(color), num_segments, thickness);
}

void draw_ngon_filled(float cx, float cy, float radius, ImVec4 color, int num_segments) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddNgonFilled(ImVec2(o.x + cx, o.y + cy), radius,
        ImGui::ColorConvertFloat4ToU32(color), num_segments);
}

void draw_triangle(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, bool filled, float thickness) {
    ImVec2 o = canvas_origin();
    ImU32 col = ImGui::ColorConvertFloat4ToU32(color);
    if (filled) {
        ImGui::GetWindowDrawList()->AddTriangleFilled(
            ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
            ImVec2(o.x + p3x, o.y + p3y), col);
    } else {
        ImGui::GetWindowDrawList()->AddTriangle(
            ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
            ImVec2(o.x + p3x, o.y + p3y), col, thickness);
    }
}
```

- [ ] **Step 3: Build and verify**

Run: `cmake --build build --target imx_renderer`
Expected: BUILD SUCCEEDED

- [ ] **Step 4: Commit**

```bash
git add include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add 7 advanced DrawList primitives (bezier, polyline, ngon, triangle)"
```

---

### Task 11: DrawList Advanced — Compiler Pipeline

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `examples/hello/imx.d.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add to HOST_COMPONENTS**

```typescript
    DrawBezierCubic: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            p3: { type: 'style', required: true },
            p4: { type: 'style', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
            segments: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawBezierQuadratic: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            p3: { type: 'style', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
            segments: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawPolyline: {
        props: {
            points: { type: 'string', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
            closed: { type: 'boolean', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawConvexPolyFilled: {
        props: {
            points: { type: 'string', required: true },
            color: { type: 'style', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    DrawNgon: {
        props: {
            center: { type: 'style', required: true },
            radius: { type: 'number', required: true },
            color: { type: 'style', required: true },
            numSegments: { type: 'number', required: true },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawNgonFilled: {
        props: {
            center: { type: 'style', required: true },
            radius: { type: 'number', required: true },
            color: { type: 'style', required: true },
            numSegments: { type: 'number', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    DrawTriangle: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            p3: { type: 'style', required: true },
            color: { type: 'style', required: true },
            filled: { type: 'boolean', required: false },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR types**

```typescript
    | IRDrawBezierCubic | IRDrawBezierQuadratic | IRDrawPolyline | IRDrawConvexPolyFilled
    | IRDrawNgon | IRDrawNgonFilled | IRDrawTriangle
```

```typescript
export interface IRDrawBezierCubic { kind: 'draw_bezier_cubic'; p1: string; p2: string; p3: string; p4: string; color: string; thickness: string; segments: string; loc?: SourceLoc; }
export interface IRDrawBezierQuadratic { kind: 'draw_bezier_quadratic'; p1: string; p2: string; p3: string; color: string; thickness: string; segments: string; loc?: SourceLoc; }
export interface IRDrawPolyline { kind: 'draw_polyline'; points: string; color: string; thickness: string; closed: string; loc?: SourceLoc; }
export interface IRDrawConvexPolyFilled { kind: 'draw_convex_poly_filled'; points: string; color: string; loc?: SourceLoc; }
export interface IRDrawNgon { kind: 'draw_ngon'; center: string; radius: string; color: string; numSegments: string; thickness: string; loc?: SourceLoc; }
export interface IRDrawNgonFilled { kind: 'draw_ngon_filled'; center: string; radius: string; color: string; numSegments: string; loc?: SourceLoc; }
export interface IRDrawTriangle { kind: 'draw_triangle'; p1: string; p2: string; p3: string; color: string; filled: string; thickness: string; loc?: SourceLoc; }
```

- [ ] **Step 3: Add lowering**

Follow existing DrawLine/DrawRect/DrawCircle pattern — extract props with defaults, push IR node. Add cases in the switch after DrawText:

```typescript
        case 'DrawBezierCubic': {
            const p1 = attrs['p1'] ?? '0, 0';
            const p2 = attrs['p2'] ?? '0, 0';
            const p3 = attrs['p3'] ?? '0, 0';
            const p4 = attrs['p4'] ?? '0, 0';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            const thickness = attrs['thickness'] ?? '1.0';
            const segments = attrs['segments'] ?? '0';
            body.push({ kind: 'draw_bezier_cubic', p1, p2, p3, p4, color, thickness, segments, loc } as IRDrawBezierCubic);
            break;
        }
        case 'DrawBezierQuadratic': {
            const p1 = attrs['p1'] ?? '0, 0';
            const p2 = attrs['p2'] ?? '0, 0';
            const p3 = attrs['p3'] ?? '0, 0';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            const thickness = attrs['thickness'] ?? '1.0';
            const segments = attrs['segments'] ?? '0';
            body.push({ kind: 'draw_bezier_quadratic', p1, p2, p3, color, thickness, segments, loc } as IRDrawBezierQuadratic);
            break;
        }
        case 'DrawPolyline': {
            const points = attrs['points'] ?? '';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            const thickness = attrs['thickness'] ?? '1.0';
            const closed = attrs['closed'] ?? 'false';
            body.push({ kind: 'draw_polyline', points, color, thickness, closed, loc } as IRDrawPolyline);
            break;
        }
        case 'DrawConvexPolyFilled': {
            const points = attrs['points'] ?? '';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            body.push({ kind: 'draw_convex_poly_filled', points, color, loc } as IRDrawConvexPolyFilled);
            break;
        }
        case 'DrawNgon': {
            const center = attrs['center'] ?? '0, 0';
            const radius = attrs['radius'] ?? '0';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            const numSegments = attrs['numSegments'] ?? '6';
            const thickness = attrs['thickness'] ?? '1.0';
            body.push({ kind: 'draw_ngon', center, radius, color, numSegments, thickness, loc } as IRDrawNgon);
            break;
        }
        case 'DrawNgonFilled': {
            const center = attrs['center'] ?? '0, 0';
            const radius = attrs['radius'] ?? '0';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            const numSegments = attrs['numSegments'] ?? '6';
            body.push({ kind: 'draw_ngon_filled', center, radius, color, numSegments, loc } as IRDrawNgonFilled);
            break;
        }
        case 'DrawTriangle': {
            const p1 = attrs['p1'] ?? '0, 0';
            const p2 = attrs['p2'] ?? '0, 0';
            const p3 = attrs['p3'] ?? '0, 0';
            const color = attrs['color'] ?? '1, 1, 1, 1';
            const filled = attrs['filled'] ?? 'false';
            const thickness = attrs['thickness'] ?? '1.0';
            body.push({ kind: 'draw_triangle', p1, p2, p3, color, filled, thickness, loc } as IRDrawTriangle);
            break;
        }
```

- [ ] **Step 4: Add emission**

Follow existing `emitDrawLine` pattern — split point strings, emit float, call renderer:

```typescript
function emitDrawBezierCubic(node: any, lines: string[], indent: string): void {
    const p1 = node.p1.split(',').map((s: string) => emitFloat(s.trim()));
    const p2 = node.p2.split(',').map((s: string) => emitFloat(s.trim()));
    const p3 = node.p3.split(',').map((s: string) => emitFloat(s.trim()));
    const p4 = node.p4.split(',').map((s: string) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    const segments = node.segments;
    lines.push(`${indent}imx::renderer::draw_bezier_cubic(${p1.join(', ')}, ${p2.join(', ')}, ${p3.join(', ')}, ${p4.join(', ')}, ${color}, ${thickness}, ${segments});`);
}

function emitDrawBezierQuadratic(node: any, lines: string[], indent: string): void {
    const p1 = node.p1.split(',').map((s: string) => emitFloat(s.trim()));
    const p2 = node.p2.split(',').map((s: string) => emitFloat(s.trim()));
    const p3 = node.p3.split(',').map((s: string) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    const segments = node.segments;
    lines.push(`${indent}imx::renderer::draw_bezier_quadratic(${p1.join(', ')}, ${p2.join(', ')}, ${p3.join(', ')}, ${color}, ${thickness}, ${segments});`);
}

function emitDrawPolyline(node: any, lines: string[], indent: string): void {
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    const closed = node.closed;
    // points is a flattened array expression from TSX
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}float _poly_pts[] = {${node.points}};`);
    lines.push(`${indent}${INDENT}imx::renderer::draw_polyline(_poly_pts, sizeof(_poly_pts) / (2 * sizeof(float)), ${color}, ${thickness}, ${closed});`);
    lines.push(`${indent}}`);
}

function emitDrawConvexPolyFilled(node: any, lines: string[], indent: string): void {
    const color = emitImVec4(node.color);
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}float _poly_pts[] = {${node.points}};`);
    lines.push(`${indent}${INDENT}imx::renderer::draw_convex_poly_filled(_poly_pts, sizeof(_poly_pts) / (2 * sizeof(float)), ${color});`);
    lines.push(`${indent}}`);
}

function emitDrawNgon(node: any, lines: string[], indent: string): void {
    const center = node.center.split(',').map((s: string) => emitFloat(s.trim()));
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const numSegments = node.numSegments;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_ngon(${center.join(', ')}, ${radius}, ${color}, ${numSegments}, ${thickness});`);
}

function emitDrawNgonFilled(node: any, lines: string[], indent: string): void {
    const center = node.center.split(',').map((s: string) => emitFloat(s.trim()));
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const numSegments = node.numSegments;
    lines.push(`${indent}imx::renderer::draw_ngon_filled(${center.join(', ')}, ${radius}, ${color}, ${numSegments});`);
}

function emitDrawTriangle(node: any, lines: string[], indent: string): void {
    const p1 = node.p1.split(',').map((s: string) => emitFloat(s.trim()));
    const p2 = node.p2.split(',').map((s: string) => emitFloat(s.trim()));
    const p3 = node.p3.split(',').map((s: string) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_triangle(${p1.join(', ')}, ${p2.join(', ')}, ${p3.join(', ')}, ${color}, ${filled}, ${thickness});`);
}
```

Switch cases in emitNode:

```typescript
        case 'draw_bezier_cubic': emitDrawBezierCubic(node, lines, indent); break;
        case 'draw_bezier_quadratic': emitDrawBezierQuadratic(node, lines, indent); break;
        case 'draw_polyline': emitDrawPolyline(node, lines, indent); break;
        case 'draw_convex_poly_filled': emitDrawConvexPolyFilled(node, lines, indent); break;
        case 'draw_ngon': emitDrawNgon(node, lines, indent); break;
        case 'draw_ngon_filled': emitDrawNgonFilled(node, lines, indent); break;
        case 'draw_triangle': emitDrawTriangle(node, lines, indent); break;
```

- [ ] **Step 5: Add type definitions to init.ts and examples/hello/imx.d.ts**

```typescript
interface DrawBezierCubicProps { p1: [number, number]; p2: [number, number]; p3: [number, number]; p4: [number, number]; color: [number, number, number, number]; thickness?: number; segments?: number; }
interface DrawBezierQuadraticProps { p1: [number, number]; p2: [number, number]; p3: [number, number]; color: [number, number, number, number]; thickness?: number; segments?: number; }
interface DrawPolylineProps { points: [number, number][]; color: [number, number, number, number]; thickness?: number; closed?: boolean; }
interface DrawConvexPolyFilledProps { points: [number, number][]; color: [number, number, number, number]; }
interface DrawNgonProps { center: [number, number]; radius: number; color: [number, number, number, number]; numSegments: number; thickness?: number; }
interface DrawNgonFilledProps { center: [number, number]; radius: number; color: [number, number, number, number]; numSegments: number; }
interface DrawTriangleProps { p1: [number, number]; p2: [number, number]; p3: [number, number]; color: [number, number, number, number]; filled?: boolean; thickness?: number; }
declare function DrawBezierCubic(props: DrawBezierCubicProps): any;
declare function DrawBezierQuadratic(props: DrawBezierQuadraticProps): any;
declare function DrawPolyline(props: DrawPolylineProps): any;
declare function DrawConvexPolyFilled(props: DrawConvexPolyFilledProps): any;
declare function DrawNgon(props: DrawNgonProps): any;
declare function DrawNgonFilled(props: DrawNgonFilledProps): any;
declare function DrawTriangle(props: DrawTriangleProps): any;
```

- [ ] **Step 6: Add emitter test**

```typescript
    it('emits DrawBezierCubic', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Canvas width={200} height={200}>
        <DrawBezierCubic p1={[0,0]} p2={[50,0]} p3={[50,100]} p4={[100,100]} color={[1,1,1,1]} thickness={2} />
      </Canvas>
    </Window>
  );
}
        `);
        expect(output).toContain('draw_bezier_cubic(');
    });

    it('emits DrawTriangle', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Canvas width={200} height={200}>
        <DrawTriangle p1={[0,0]} p2={[50,100]} p3={[100,0]} color={[1,0,0,1]} filled={true} />
      </Canvas>
    </Window>
  );
}
        `);
        expect(output).toContain('draw_triangle(');
    });

    it('emits DrawNgon', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Canvas width={200} height={200}>
        <DrawNgon center={[50,50]} radius={30} color={[1,1,1,1]} numSegments={6} />
      </Canvas>
    </Window>
  );
}
        `);
        expect(output).toContain('draw_ngon(');
    });
```

- [ ] **Step 7: Build and test**

Run: `cd compiler && npm run build && npx vitest run`
Run: `cmake --build build --target imx_renderer`

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts examples/hello/imx.d.ts compiler/tests/emitter.test.ts
git commit -m "feat: add 7 advanced DrawList primitives to compiler pipeline"
```

---

### Task 12: Build compiler/dist, Update Docs, Final Verification

**Files:**
- Modify: `compiler/dist/` (rebuild from source)
- Modify: `CLAUDE.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`

- [ ] **Step 1: Rebuild compiler/dist**

Run: `cd compiler && npm run build`

This updates the compiled JS in `compiler/dist/` which is committed so FetchContent users get the latest.

- [ ] **Step 2: Run full test suite**

Run: `cd compiler && npx vitest run`
Run: `cmake -B build && cmake --build build --target hello_app`

Verify the example app builds and runs.

- [ ] **Step 3: Update CLAUDE.md current status**

Update the "Current status" section to reflect Phase 13 completion:
- 41 new components (Font, 24 vector inputs, 4 button variants, 3 slider variants, 2 color variants, 7 draw primitives)
- Total component count: ~95
- Font loading API

- [ ] **Step 4: Mark Phase 13 as DONE in roadmap.md**

Change the Phase 13 header or add `(DONE)` marker.

- [ ] **Step 5: Update api-reference.md and llm-prompt-reference.md**

Add entries for all new components with their props and usage examples.

- [ ] **Step 6: Commit dist and docs**

```bash
git add compiler/dist/ CLAUDE.md docs/roadmap.md docs/api-reference.md docs/llm-prompt-reference.md
git commit -m "docs: update for Phase 13 — font loading & input expansion complete"
```

- [ ] **Step 7: Final full build verification**

Run: `cmake --build build --target hello_app`
Expected: BUILD SUCCEEDED, app launches correctly
