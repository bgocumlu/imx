# C++ Struct Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable TSX components to directly read/write C++ struct fields via pointer binding, making IMX a pure UI layer on existing C++ applications.

**Architecture:** When a value prop references `props.field` without an `onChange` callback, the emitter generates `&props.field` (direct pointer) instead of a temp-variable + setter block. The root component receives the struct as a mutable reference (`T&`) instead of `const T&`. A new `render_root` overload accepts the user's struct and passes it through.

**Tech Stack:** TypeScript (compiler), C++20 (runtime), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-04-05-cpp-binding-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `compiler/src/ir.ts` | Modify | Add `directBind` flag to widget IR nodes |
| `compiler/src/lowering.ts` | Modify | Detect props without onChange, set `directBind` flag |
| `compiler/src/emitter.ts` | Modify | Emit `&props.field` for direct-bound widgets; change root props to mutable ref; new `emitRoot` overload |
| `compiler/src/validator.ts` | Modify | Allow root component to have props with type reference (not inline type literal) |
| `compiler/tests/emitter.test.ts` | Modify | Tests for direct binding emission |
| `compiler/tests/lowering.test.ts` | Modify | Tests for directBind IR flag |
| `include/imx/runtime.h` | Modify | Add template `render_root` overload |
| `compiler/src/init.ts` | Modify | Update scaffold to show binding + useState example |
| `examples/gpa/` | Create/Modify | GPA calculator example using struct binding |
| `docs/api-reference.md` | Modify | Document C++ binding pattern |
| `docs/llm-prompt-reference.md` | Modify | Document binding pattern for LLMs |

---

## Task 1: Add directBind flag to IR

**Files:**
- Modify: `compiler/src/ir.ts`

- [ ] **Step 1: Add directBind to widget IR interfaces**

In `compiler/src/ir.ts`, add `directBind?: boolean;` to every widget IR interface that has `valueExpr`. These are: `IRCheckbox`, `IRSliderFloat`, `IRSliderInt`, `IRDragFloat`, `IRDragInt`, `IRCombo`, `IRInputInt`, `IRInputFloat`, `IRColorEdit`, `IRListBox`, `IRRadio`, `IRColorPicker`.

For `IRCheckbox` (line 64), change:
```typescript
export interface IRCheckbox { kind: 'checkbox'; label: string; stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean; style?: string; loc?: SourceLoc; }
```

Apply the same pattern to all other widget IR interfaces that have `valueExpr`:
- `IRSliderFloat` (line 73): add `directBind?: boolean;`
- `IRSliderInt` (line 74): add `directBind?: boolean;`
- `IRDragFloat` (line 75): add `directBind?: boolean;`
- `IRDragInt` (line 76): add `directBind?: boolean;`
- `IRCombo` (line 77): add `directBind?: boolean;`
- `IRInputInt` (line 78): add `directBind?: boolean;`
- `IRInputFloat` (line 79): add `directBind?: boolean;`
- `IRColorEdit` (line 80): add `directBind?: boolean;`
- `IRListBox` (line 81): add `directBind?: boolean;`
- `IRRadio` (line 97): add `directBind?: boolean;`
- `IRColorPicker` (line 99): add `directBind?: boolean;`

- [ ] **Step 2: Build compiler**

Run: `cd compiler && npm run build`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add compiler/src/ir.ts
git commit -m "feat: add directBind flag to widget IR interfaces"
```

---

## Task 2: Detect direct binding in lowering

**Files:**
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/tests/lowering.test.ts`

- [ ] **Step 1: Write failing lowering test**

Append to `compiler/tests/lowering.test.ts`:

```typescript
    it('sets directBind for props value without onChange', () => {
        const ir = lower(`
function App(props: { speed: number }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
    </Window>
  );
}
        `);
        const slider = ir.body[1];
        expect(slider.kind).toBe('slider_float');
        if (slider.kind === 'slider_float') {
            expect(slider.directBind).toBe(true);
            expect(slider.valueExpr).toBe('props.speed');
        }
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/lowering.test.ts`
Expected: FAIL — `directBind` is undefined.

- [ ] **Step 3: Modify lowerValueOnChange to detect direct binding**

In `compiler/src/lowering.ts`, modify the `lowerValueOnChange` function (around line 1097). Change the return type and add directBind detection:

```typescript
function lowerValueOnChange(rawAttrs: Map<string, ts.Expression | null>, ctx: LoweringContext): { stateVar: string; valueExpr?: string; onChangeExpr?: string; directBind?: boolean } {
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
            if (!onChangeExpr.startsWith('[') && !onChangeExpr.endsWith(')')) {
                onChangeExpr = `${onChangeExpr}()`;
            }
        } else if (valueExpr.startsWith('props.')) {
            // No onChange + props reference = direct pointer binding
            directBind = true;
        }
    }
    return { stateVar, valueExpr, onChangeExpr, directBind };
}
```

- [ ] **Step 4: Pass directBind through to all widget lowering functions**

Every function that calls `lowerValueOnChange` needs to include `directBind` in the pushed IR node. These are: `lowerSliderFloat`, `lowerSliderInt`, `lowerDragFloat`, `lowerDragInt`, `lowerCombo`, `lowerInputInt`, `lowerInputFloat`, `lowerListBox`, `lowerRadio`.

For example, `lowerSliderFloat` (around line 1117):
```typescript
function lowerSliderFloat(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const min = attrs['min'] ?? '0.0f';
    const max = attrs['max'] ?? '1.0f';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr, directBind } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'slider_float', label, stateVar, valueExpr, onChangeExpr, directBind, min, max, style, loc });
}
```

Apply the same change to all other widget lowering functions — destructure `directBind` from `lowerValueOnChange` and include it in the pushed IR node.

Also update `lowerCheckbox` (around line 561) which has its own value/onChange detection inline — add the same `directBind` logic:

```typescript
    // In lowerCheckbox, after the valueExpr detection:
    if (!stateVar) {
        const onChangeRaw = rawAttrs.get('onChange');
        if (onChangeRaw) {
            // ... existing onChange handling ...
        } else if (valueExprStr && valueExprStr.startsWith('props.')) {
            directBind = true;
        }
    }
    body.push({ kind: 'checkbox', label, stateVar, valueExpr: valueExprStr, onChangeExpr: onChangeExprStr, directBind, style, loc });
```

- [ ] **Step 5: Run tests**

Run: `cd compiler && npx vitest run tests/lowering.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add compiler/src/lowering.ts compiler/tests/lowering.test.ts
git commit -m "feat: detect direct binding in lowering (props without onChange)"
```

---

## Task 3: Emit direct pointer binding

**Files:**
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing emitter test**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits direct pointer binding for props without onChange', () => {
        const output = compile(`
function App(props: { speed: number, muted: boolean }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
      <Checkbox label="Muted" value={props.muted} />
    </Window>
  );
}
        `);
        expect(output).toContain('&props.speed');
        expect(output).toContain('&props.muted');
        // Should NOT contain temp variable pattern
        expect(output).not.toContain('float val = props.speed');
        expect(output).not.toContain('bool val = props.muted');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL — emitter still uses temp variable pattern.

- [ ] **Step 3: Add direct binding path to emitCheckbox**

In `compiler/src/emitter.ts`, modify `emitCheckbox` (around line 1017). Add a new branch before the existing `valueExpr` branch:

```typescript
function emitCheckbox(node: IRCheckbox, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Checkbox', lines, indent);
    const label = asCharPtr(node.label && node.label !== '""' ? node.label : `"##checkbox_${checkboxCounter}"`);
    checkboxCounter++;

    if (node.stateVar) {
        // State-bound case (unchanged)
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}bool val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::checkbox(${label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        // Direct pointer binding — no temp variable
        lines.push(`${indent}imx::renderer::checkbox(${label}, &${node.valueExpr});`);
    } else if (node.valueExpr !== undefined) {
        // Props-bound / expression-bound case (unchanged)
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}bool val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::checkbox(${label}, &val)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}imx::renderer::checkbox(${label}, nullptr);`);
    }
}
```

- [ ] **Step 4: Add direct binding path to emitSliderFloat**

In `emitSliderFloat` (around line 1122):

```typescript
function emitSliderFloat(node: IRSliderFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'SliderFloat', lines, indent);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        // State-bound (unchanged)
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_float(${node.label}, &val, ${min}, ${max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        // Direct pointer binding
        lines.push(`${indent}imx::renderer::slider_float(${node.label}, &${node.valueExpr}, ${min}, ${max});`);
    } else if (node.valueExpr !== undefined) {
        // Expression-bound (unchanged)
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_float(${node.label}, &val, ${min}, ${max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}
```

- [ ] **Step 5: Add direct binding path to ALL remaining widget emitters**

Apply the same pattern to: `emitSliderInt`, `emitDragFloat`, `emitDragInt`, `emitCombo`, `emitInputInt`, `emitInputFloat`, `emitColorEdit`, `emitListBox`, `emitRadio`, `emitColorPicker`.

The pattern for each is identical — insert this branch after `node.stateVar` check and before the `node.valueExpr` check:

```typescript
    } else if (node.directBind && node.valueExpr) {
        // Direct pointer binding
        lines.push(`${indent}imx::renderer::<widget_func>(${label}, &${node.valueExpr}, ...other_args...);`);
    } else if (node.valueExpr !== undefined) {
```

For Combo and ListBox, the direct binding call uses `&${node.valueExpr}` for the current_item pointer, same as the others.

For ColorEdit and ColorPicker, `valueExpr` is an array — the direct bind emits `${node.valueExpr}.data()` (since the prop is a float[4] or std::array).

- [ ] **Step 6: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: emit direct pointer binding for props without onChange"
```

---

## Task 4: Mutable reference for root props

**Files:**
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing test for mutable ref**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits mutable reference for root component with props', () => {
        const output = compile(`
function App(props: { speed: number }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
    </Window>
  );
}
        `);
        // Should use non-const reference for props (mutable binding)
        expect(output).toContain('AppProps& props');
        expect(output).not.toContain('const AppProps& props');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL — currently emits `const AppProps& props`.

- [ ] **Step 3: Change emitter to use mutable reference**

In `compiler/src/emitter.ts`, find the function signature generation (around line 227):

Change:
```typescript
    const propsArg = hasProps ? `, const ${comp.name}Props& props` : '';
```
To:
```typescript
    const propsArg = hasProps ? `, ${comp.name}Props& props` : '';
```

Also update `emitComponentHeader` (around line 142):

Change:
```typescript
    lines.push(`void ${comp.name}_render(imx::RenderContext& ctx, const ${comp.name}Props& props);`);
```
To:
```typescript
    lines.push(`void ${comp.name}_render(imx::RenderContext& ctx, ${comp.name}Props& props);`);
```

- [ ] **Step 4: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: use mutable reference for component props"
```

---

## Task 5: Template render_root overload

**Files:**
- Modify: `include/imx/runtime.h`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add template render_root to runtime.h**

In `include/imx/runtime.h`, after the existing `render_root` declaration (line 143), add:

```cpp
void render_root(Runtime& runtime);

// Overload for C++ struct binding — passes state to root component
template <typename T>
void render_root(Runtime& runtime, T& state);
```

Note: The template is declared here but defined in the generated `app_root.gen.cpp` (via explicit instantiation or inline definition). Since it's generated code, the template body lives in the generated file.

- [ ] **Step 2: Write failing emitter test for root with state param**

Append to `compiler/tests/emitter.test.ts`. The `emitRoot` function needs to be tested with props. First, check how to access it from the test. The `compile()` helper only returns the component output, not the root. We need a separate test:

```typescript
    it('emits render_root with state parameter when root has props', () => {
        const parsed = parseFile('Test.tsx', `
function App(props: { speed: number }) {
  return (
    <Window title="Test">
      <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
    </Window>
  );
}
        `);
        expect(parsed.errors).toHaveLength(0);
        const validation = validate(parsed);
        expect(validation.errors).toHaveLength(0);
        const ir = lowerComponent(parsed, validation);
        const root = emitRoot(ir.name, ir.stateSlots.length, ir.bufferCount, undefined, ir.params.length > 0 ? ir.name + 'Props' : undefined);
        expect(root).toContain('render_root(Runtime& runtime, AppProps& state)');
        expect(root).toContain('App_render(ctx, state)');
    });
```

- [ ] **Step 3: Modify emitRoot to accept optional props type**

In `compiler/src/emitter.ts`, modify `emitRoot` (around line 253):

```typescript
export function emitRoot(rootName: string, stateCount: number, bufferCount: number, sourceFile?: string, propsType?: string): string {
    const lines: string[] = [];

    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    lines.push('#include <imx/runtime.h>');

    if (propsType) {
        lines.push(`#include "${rootName}.gen.h"`);
        lines.push('');
        lines.push(`void ${rootName}_render(imx::RenderContext& ctx, ${propsType}& props);`);
        lines.push('');
        lines.push('namespace imx {');
        lines.push(`void render_root(Runtime& runtime, ${propsType}& state) {`);
        lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
        lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
        lines.push(`${INDENT}${rootName}_render(ctx, state);`);
        lines.push(`${INDENT}ctx.end_instance();`);
        lines.push(`${INDENT}runtime.end_frame();`);
        lines.push('}');
        lines.push('} // namespace imx');
    } else {
        lines.push('');
        lines.push(`void ${rootName}_render(imx::RenderContext& ctx);`);
        lines.push('');
        lines.push('namespace imx {');
        lines.push('void render_root(Runtime& runtime) {');
        lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
        lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
        lines.push(`${INDENT}${rootName}_render(ctx);`);
        lines.push(`${INDENT}ctx.end_instance();`);
        lines.push(`${INDENT}runtime.end_frame();`);
        lines.push('}');
        lines.push('} // namespace imx');
    }

    lines.push('');
    return lines.join('\n');
}
```

- [ ] **Step 4: Update compile.ts to pass propsType to emitRoot**

Find where `emitRoot` is called in `compiler/src/compile.ts` and pass the props type when the root component has params:

```typescript
const propsType = rootIR.params.length > 0 ? rootIR.name + 'Props' : undefined;
const rootSrc = emitRoot(rootIR.name, rootIR.stateSlots.length, rootIR.bufferCount, rootFile, propsType);
```

- [ ] **Step 5: Run tests**

Run: `cd compiler && npx vitest run`
Expected: All pass.

- [ ] **Step 6: Build C++ to verify**

Run: `cmake --build build --target hello_app`
Expected: Still builds (hello_app doesn't use binding mode).

- [ ] **Step 7: Commit**

```bash
git add include/imx/runtime.h compiler/src/emitter.ts compiler/src/compile.ts compiler/tests/emitter.test.ts
git commit -m "feat: add template render_root overload for C++ struct binding"
```

---

## Task 6: Vector .map() with reference binding

**Files:**
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing test for vector map with reference**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits auto& reference in .map() loop for direct binding', () => {
        const output = compile(`
function App(props: { items: number[] }) {
  return (
    <Window title="Test">
      {props.items.map((item, i) => (
        <Text key={i}>{item}</Text>
      ))}
    </Window>
  );
}
        `);
        expect(output).toContain('auto& item = props.items[i]');
    });
```

- [ ] **Step 2: Check current emitListMap**

The current `emitListMap` already emits `auto& ${node.itemVar} = ${node.array}[i];`. Verify this works for props arrays. If the test passes already, this task is done — the existing code handles it.

- [ ] **Step 3: Run test**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: Likely PASS (existing code should handle this). If not, adjust the emitter.

- [ ] **Step 4: Commit (if changes were needed)**

```bash
git add compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: verify vector .map() with reference binding"
```

---

## Task 7: GPA calculator example

**Files:**
- Modify: `examples/gpa/App.tsx`
- Modify: `examples/gpa/main.cpp`
- Modify: `examples/gpa/imx.d.ts`

- [ ] **Step 1: Write the C++ struct and main.cpp**

Replace `examples/gpa/main.cpp` with a version that defines the GPA state struct and passes it to `render_root`:

```cpp
#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include <vector>
#include <functional>

struct Course {
    float credit = 3.0f;
    int grade_index = 0;
};

struct AppState {
    std::vector<Course> courses;
    float gpa = 0.0f;
    int course_count = 6;
    std::function<void()> onAddCourse;
    std::function<void()> onRemoveCourse;
};

static const float GRADE_VALUES[] = {4.0f, 3.7f, 3.3f, 3.0f, 2.7f, 2.3f, 2.0f, 1.7f, 1.3f, 1.0f, 0.0f};

static void calculate_gpa(AppState& s) {
    float total = 0.0f, credits = 0.0f;
    for (auto& c : s.courses) {
        total += c.credit * GRADE_VALUES[c.grade_index];
        credits += c.credit;
    }
    s.gpa = credits > 0.0f ? total / credits : 0.0f;
}

// ... standard GLFW/ImGui boilerplate (same as current main.cpp) ...
// In the main function, before the render loop:

// AppState state;
// state.courses.resize(6);
// state.onAddCourse = [&]() { state.courses.push_back({}); };
// state.onRemoveCourse = [&]() { if (!state.courses.empty()) state.courses.pop_back(); };
// 
// In the render loop:
// calculate_gpa(state);
// imx::render_root(runtime, state);
```

Write the complete main.cpp with the full GLFW boilerplate (copy from current gpa/main.cpp) plus the struct and render_root call.

- [ ] **Step 2: Write the TSX**

Replace `examples/gpa/App.tsx`:

```tsx
export default function App(props: AppState) {
  return (
    <Theme preset="dark"
      backgroundColor={[0.1, 0.105, 0.11, 1.0]}
      surfaceColor={[0.15, 0.15, 0.151, 1.0]}
      borderColor={[0.25, 0.25, 0.26, 1.0]}
      accentColor={[0.28, 0.28, 0.29, 1.0]}
      textColor={[0.9, 0.9, 0.9, 1.0]}
      rounding={2}
    >
      <Window title="GPA Calculator" noResize noMove noCollapse>
        <Row style={{ gap: 8 }}>
          <Button title="+" onPress={props.onAddCourse} />
          <Button title="-" onPress={props.onRemoveCourse} />
          <Text>Courses: {props.courses.length}</Text>
        </Row>
        <Table columns={"Credit", "Grade"}>
          {props.courses.map((course, i) => (
            <TableRow key={i}>
              <DragFloat label={"##k" + i} value={course.credit} speed={0.5} />
              <Combo label={"##g" + i} value={course.grade_index}
                     items={["A (4.0)", "A- (3.7)", "B+ (3.3)", "B (3.0)", "B- (2.7)", "C+ (2.3)", "C (2.0)", "C- (1.7)", "D+ (1.3)", "D (1.0)", "F (0.0)"]} />
            </TableRow>
          ))}
        </Table>
        <Separator />
        <Text>GPA: {props.gpa}</Text>
      </Window>
    </Theme>
  );
}
```

- [ ] **Step 3: Update imx.d.ts for the gpa example**

Add the AppState and Course types to `examples/gpa/imx.d.ts`:

```typescript
interface Course {
    credit: number;
    grade_index: number;
}

interface AppState {
    courses: Course[];
    gpa: number;
    course_count: number;
    onAddCourse: () => void;
    onRemoveCourse: () => void;
}
```

- [ ] **Step 4: Build and test**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target gpa_app`
Expected: Compiles and runs. GPA calculator with dynamic rows, direct struct binding.

- [ ] **Step 5: Commit**

```bash
git add examples/gpa/
git commit -m "feat: add GPA calculator example with C++ struct binding"
```

---

## Task 8: Update imxc init scaffold

**Files:**
- Modify: `compiler/src/init.ts`

- [ ] **Step 1: Update the scaffold App.tsx to show both patterns**

In `compiler/src/init.ts`, replace the `APP_TSX` constant with:

```typescript
const APP_TSX = `export default function App(props: AppState) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Controls">
        <Column gap={8}>
          <Text>Count: {props.count}</Text>
          <Button title="Increment" onPress={props.onIncrement} />
          <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      {showAbout && <Window title="About">
        <Text>Built with IMX</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
      </Window>}
    </DockSpace>
  );
}
`;
```

- [ ] **Step 2: Update the scaffold main.cpp**

In `compiler/src/init.ts`, update the `MAIN_CPP` constant. Add the AppState struct and render_root call. Add after the includes:

```cpp
struct AppState {
    int count = 0;
    float speed = 5.0f;
    std::function<void()> onIncrement;
};
```

Before the main loop, add:
```cpp
    AppState state;
    state.onIncrement = [&]() { state.count++; };
```

Change the render call from `imx::render_root(app.runtime)` to `imx::render_root(app.runtime, state)`.

- [ ] **Step 3: Update the scaffold imx.d.ts**

Add the AppState interface to the `IMX_DTS` constant:

```typescript
interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}
```

- [ ] **Step 4: Build compiler**

Run: `cd compiler && npm run build`
Expected: No errors.

- [ ] **Step 5: Smoke test imxc init**

Run: `cd /tmp && rm -rf test-bind && mkdir test-bind && cd test-bind && node /path/to/compiler/dist/index.js init .`
Verify the generated files show the binding pattern.

- [ ] **Step 6: Commit**

```bash
git add compiler/src/init.ts compiler/dist/
git commit -m "feat: update imxc init scaffold to show C++ struct binding"
```

---

## Task 9: Update docs

**Files:**
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add C++ Binding section to api-reference.md**

Add a new section after "Custom Theme Presets" covering:
- The struct binding pattern (C++ struct + TSX props)
- Direct mutation vs onChange
- Vector iteration
- Callbacks for actions
- Thread safety warning
- Example showing both binding and useState

- [ ] **Step 2: Add binding section to llm-prompt-reference.md**

Add concise binding reference:
```
## C++ Struct Binding

Root component receives C++ struct as mutable reference.
value={props.field} without onChange → direct pointer (&props.field).
std::function callbacks for actions. useState for UI-only state.
Thread safety: developer's responsibility.
```

- [ ] **Step 3: Update CLAUDE.md**

Update the "Current status" and "Key architecture decisions" sections to mention struct binding.

- [ ] **Step 4: Commit**

```bash
git add docs/api-reference.md docs/llm-prompt-reference.md CLAUDE.md
git commit -m "docs: add C++ struct binding documentation and thread safety notes"
```
