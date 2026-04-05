# Custom Widgets & Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let advanced users register existing C++ ImGui widgets and theme functions, then use them from TSX as first-class `<Knob>`, `<Fader>` etc. components with full TypeScript type checking.

**Architecture:** Three changes — (1) C++ `WidgetArgs` class + `register_widget`/`register_theme`/`call_widget` API in the renderer, (2) compiler `IRNativeWidget` node type with lowering + emission for unknown JSX elements, (3) validator relaxation so unknown elements pass through to C++ dispatch. Theme uses existing `begin_theme` with a registry lookup before built-in presets.

**Tech Stack:** C++20 (MSVC), TypeScript (vitest), CMake, Dear ImGui

---

## File Structure

| File | Responsibility |
|------|---------------|
| `include/imx/renderer.h` | Modify — add `WidgetArgs` class, `register_widget`, `register_theme`, `call_widget` declarations |
| `renderer/widget_args.cpp` | **Create** — `WidgetArgs` method implementations |
| `renderer/components.cpp` | Modify — add registries, `call_widget`, `begin_theme` custom lookup |
| `CMakeLists.txt` | Modify — add `widget_args.cpp` to `imx_renderer` sources |
| `compiler/src/ir.ts` | Modify — add `IRNativeWidget` to node union |
| `compiler/src/lowering.ts` | Modify — emit `IRNativeWidget` for unknown JSX elements |
| `compiler/src/emitter.ts` | Modify — emit `WidgetArgs` + `call_widget` C++ code |
| `compiler/src/validator.ts` | Modify — pass unknown elements instead of erroring |
| `compiler/src/init.ts` | Modify — `.d.ts` template: custom widget example + `ThemeProps.preset` to `string` |
| `compiler/tests/validator.test.ts` | Modify — update "errors on unknown component" test |
| `compiler/tests/lowering.test.ts` | Modify — add native widget lowering test |
| `compiler/tests/emitter.test.ts` | Modify — add native widget emission test |
| `docs/api-reference.md` | Modify — add Custom Widgets & Themes section |
| `docs/quick-start.md` | Modify — brief advanced subsection |
| `docs/llm-prompt-reference.md` | Modify — native widget syntax |

---

### Task 1: WidgetArgs C++ Class

**Files:**
- Modify: `include/imx/renderer.h`
- Create: `renderer/widget_args.cpp`
- Modify: `CMakeLists.txt:70-74`

- [ ] **Step 1: Add WidgetArgs class and function declarations to renderer.h**

Add these includes and declarations to `include/imx/renderer.h`. Insert the `WidgetArgs` class and free functions *before* the `namespace renderer {` block (but inside `namespace imx {`), since WidgetArgs is not a renderer-specific type — it's used by user code in `main.cpp`.

```cpp
// Add these includes at the top of the file, after the existing includes:
#include <any>
#include <functional>
#include <string>
#include <unordered_map>

// Add this class BEFORE `namespace renderer {`, inside `namespace imx {`:

class WidgetArgs {
public:
    explicit WidgetArgs(const char* label);

    const char* label() const;

    template <typename T>
    void set(const char* name, const T& value) {
        values_[name] = value;
    }

    void set_callback(const char* name, std::function<void(std::any)> cb);

    template <typename T>
    T get(const char* name) const {
        auto it = values_.find(name);
        if (it == values_.end()) {
            return T{};
        }
        return std::any_cast<T>(it->second);
    }

    template <typename T>
    T get(const char* name, const T& default_value) const {
        auto it = values_.find(name);
        if (it == values_.end()) {
            return default_value;
        }
        return std::any_cast<T>(it->second);
    }

    bool has(const char* name) const;

    void call(const char* name) const;

    template <typename T>
    void call(const char* name, const T& value) const {
        auto it = callbacks_.find(name);
        if (it != callbacks_.end()) {
            it->second(std::any(value));
        }
    }

private:
    std::string label_;
    std::unordered_map<std::string, std::any> values_;
    std::unordered_map<std::string, std::function<void(std::any)>> callbacks_;
};

using WidgetFunc = std::function<void(WidgetArgs&)>;
void register_widget(const std::string& name, WidgetFunc func);
void call_widget(const std::string& name, WidgetArgs& args);

using ThemeFunc = std::function<void()>;
void register_theme(const std::string& name, ThemeFunc func);
```

Note: `set`, `get`, and the templated `call` are defined inline in the header (template methods must be). The non-template methods go in the .cpp file.

- [ ] **Step 2: Create widget_args.cpp with non-template implementations**

Create `renderer/widget_args.cpp`:

```cpp
#include <imx/renderer.h>

namespace imx {

WidgetArgs::WidgetArgs(const char* label) : label_(label) {}

const char* WidgetArgs::label() const {
    return label_.c_str();
}

void WidgetArgs::set_callback(const char* name, std::function<void(std::any)> cb) {
    callbacks_[name] = std::move(cb);
}

bool WidgetArgs::has(const char* name) const {
    return values_.find(name) != values_.end();
}

void WidgetArgs::call(const char* name) const {
    auto it = callbacks_.find(name);
    if (it != callbacks_.end()) {
        it->second(std::any{});
    }
}

} // namespace imx
```

- [ ] **Step 3: Add widget_args.cpp to CMakeLists.txt**

In `CMakeLists.txt`, add `renderer/widget_args.cpp` to the `imx_renderer` library sources. Change line 70-74 from:

```cmake
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
)
```

to:

```cmake
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
    renderer/widget_args.cpp
)
```

- [ ] **Step 4: Build to verify compilation**

Run:
```bash
cmake -B build -G "Visual Studio 17 2022" && cmake --build build --target imx_renderer
```
Expected: Build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add include/imx/renderer.h renderer/widget_args.cpp CMakeLists.txt
git commit -m "feat: add WidgetArgs class and registration API for custom widgets/themes"
```

---

### Task 2: Widget and Theme Registries in Renderer

**Files:**
- Modify: `renderer/components.cpp:1-17` (add registries at top)
- Modify: `renderer/components.cpp:239-300` (begin_theme custom lookup)

- [ ] **Step 1: Add widget/theme registries and call_widget to components.cpp**

At the top of `renderer/components.cpp`, after the existing static variables (line 17, after `static std::vector<ThemeState> g_theme_stack;`), add:

```cpp
} // temporarily close namespace imx::renderer

namespace imx {

static std::unordered_map<std::string, WidgetFunc> g_widget_registry;
static std::unordered_map<std::string, ThemeFunc> g_theme_registry;

void register_widget(const std::string& name, WidgetFunc func) {
    g_widget_registry[name] = std::move(func);
}

void call_widget(const std::string& name, WidgetArgs& args) {
    auto it = g_widget_registry.find(name);
    if (it != g_widget_registry.end()) {
        renderer::before_child();
        it->second(args);
    }
}

void register_theme(const std::string& name, ThemeFunc func) {
    g_theme_registry[name] = std::move(func);
}

} // namespace imx

namespace imx::renderer {
```

Note: The registries live in `namespace imx` (not `imx::renderer`) to match the header declarations. We temporarily close and reopen the renderer namespace.

- [ ] **Step 2: Modify begin_theme to check custom registry**

In `renderer/components.cpp`, change the preset check in `begin_theme` (lines 239-245) from:

```cpp
void begin_theme(const char* preset, const ThemeConfig& config) {
    before_child();

    // Apply preset
    if (std::strcmp(preset, "dark") == 0) ImGui::StyleColorsDark();
    else if (std::strcmp(preset, "light") == 0) ImGui::StyleColorsLight();
    else if (std::strcmp(preset, "classic") == 0) ImGui::StyleColorsClassic();
```

to:

```cpp
void begin_theme(const char* preset, const ThemeConfig& config) {
    before_child();

    // Apply preset — check custom registry first, then built-ins
    auto it = g_theme_registry.find(preset);
    if (it != g_theme_registry.end()) {
        it->second();
    } else if (std::strcmp(preset, "dark") == 0) {
        ImGui::StyleColorsDark();
    } else if (std::strcmp(preset, "light") == 0) {
        ImGui::StyleColorsLight();
    } else if (std::strcmp(preset, "classic") == 0) {
        ImGui::StyleColorsClassic();
    }
```

- [ ] **Step 3: Build to verify compilation**

Run:
```bash
cmake --build build --target imx_renderer
```
Expected: Build succeeds.

- [ ] **Step 4: Run existing C++ tests to confirm no regressions**

Run:
```bash
cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add renderer/components.cpp
git commit -m "feat: add widget/theme registries and custom theme lookup in begin_theme"
```

---

### Task 3: Compiler — IR Node and Validator

**Files:**
- Modify: `compiler/src/ir.ts:31-39`
- Modify: `compiler/src/validator.ts:122-128`
- Modify: `compiler/tests/validator.test.ts:15-19`

- [ ] **Step 1: Add IRNativeWidget to ir.ts**

In `compiler/src/ir.ts`, add the interface after the existing `IRTooltip` interface (before `IRDockLayout`):

```typescript
export interface IRNativeWidget {
    kind: 'native_widget';
    name: string;
    props: Record<string, string>;
    callbackProps: Record<string, string>;
    key?: string;
    loc?: SourceLoc;
}
```

Then add `IRNativeWidget` to the `IRNode` union type. Change line 31-39 from:

```typescript
export type IRNode =
    | IRBeginContainer | IREndContainer | IRText | IRButton
    | IRTextInput | IRCheckbox | IRSeparator
    | IRBeginPopup | IREndPopup | IROpenPopup
    | IRConditional | IRListMap | IRCustomComponent
    | IRMenuItem
    | IRSliderFloat | IRSliderInt | IRDragFloat | IRDragInt | IRCombo
    | IRInputInt | IRInputFloat | IRColorEdit | IRListBox | IRProgressBar | IRTooltip
    | IRDockLayout;
```

to:

```typescript
export type IRNode =
    | IRBeginContainer | IREndContainer | IRText | IRButton
    | IRTextInput | IRCheckbox | IRSeparator
    | IRBeginPopup | IREndPopup | IROpenPopup
    | IRConditional | IRListMap | IRCustomComponent
    | IRMenuItem
    | IRSliderFloat | IRSliderInt | IRDragFloat | IRDragInt | IRCombo
    | IRInputInt | IRInputFloat | IRColorEdit | IRListBox | IRProgressBar | IRTooltip
    | IRDockLayout | IRNativeWidget;
```

- [ ] **Step 2: Relax validator to pass unknown elements**

In `compiler/src/validator.ts`, change the `validateJsxTag` function (lines 122-128) from:

```typescript
function validateJsxTag(tagName: ts.JsxTagNameExpression, node: ts.Node, sf: ts.SourceFile, customComponents: Map<string, string>, errors: ParseError[]): void {
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;
    if (!isHostComponent(name) && !customComponents.has(name)) {
        errors.push(err(sf, node, `Unknown component: <${name}>`));
    }
}
```

to:

```typescript
function validateJsxTag(tagName: ts.JsxTagNameExpression, node: ts.Node, sf: ts.SourceFile, customComponents: Map<string, string>, errors: ParseError[]): void {
    if (!ts.isIdentifier(tagName)) return;
    // Host components and imported custom components are validated.
    // Unknown elements are treated as native widgets (validated by TypeScript + C++ linker).
}
```

- [ ] **Step 3: Update validator test for unknown components**

In `compiler/tests/validator.test.ts`, change the test at lines 15-19 from:

```typescript
    it('errors on unknown component', () => {
        const source = `function App() { return <Slider value={0} />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Unknown component');
    });
```

to:

```typescript
    it('passes unknown elements as native widgets', () => {
        const source = `function App() { return <Knob value={0} />; }`;
        const parsed = parseFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
    });
```

- [ ] **Step 4: Run validator tests**

Run:
```bash
cd compiler && npx vitest run tests/validator.test.ts
```
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add compiler/src/ir.ts compiler/src/validator.ts compiler/tests/validator.test.ts
git commit -m "feat: add IRNativeWidget node and relax validator for native widgets"
```

---

### Task 4: Compiler — Lowering Native Widgets

**Files:**
- Modify: `compiler/src/lowering.ts:1-13` (imports)
- Modify: `compiler/src/lowering.ts:395-399` (lowerJsxElement unknown branch)
- Modify: `compiler/src/lowering.ts:407-409` (lowerJsxSelfClosing unknown branch)
- Modify: `compiler/tests/lowering.test.ts`

- [ ] **Step 1: Add IRNativeWidget to lowering.ts imports**

In `compiler/src/lowering.ts`, add `IRNativeWidget` to the import from `./ir.js`. Change lines 5-13 from:

```typescript
import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType, IRExpr, SourceLoc,
    IRBeginContainer, IREndContainer, IRText, IRButton, IRTextInput,
    IRCheckbox, IRSeparator, IRConditional, IRListMap, IRCustomComponent,
    IRBeginPopup, IREndPopup, IROpenPopup, IRMenuItem,
    IRSliderFloat, IRSliderInt, IRDragFloat, IRDragInt, IRCombo,
    IRInputInt, IRInputFloat, IRColorEdit, IRListBox, IRProgressBar, IRTooltip,
    IRDockLayout, IRDockSplit, IRDockPanel,
} from './ir.js';
```

to:

```typescript
import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType, IRExpr, SourceLoc,
    IRBeginContainer, IREndContainer, IRText, IRButton, IRTextInput,
    IRCheckbox, IRSeparator, IRConditional, IRListMap, IRCustomComponent,
    IRBeginPopup, IREndPopup, IROpenPopup, IRMenuItem,
    IRSliderFloat, IRSliderInt, IRDragFloat, IRDragInt, IRCombo,
    IRInputInt, IRInputFloat, IRColorEdit, IRListBox, IRProgressBar, IRTooltip,
    IRDockLayout, IRDockSplit, IRDockPanel, IRNativeWidget,
} from './ir.js';
```

- [ ] **Step 2: Add lowerNativeWidget function**

Add this function after the existing `lowerCustomComponent` function (after line 721). Callbacks need special handling: parameterized callbacks like `(v: number) => setVol(v)` must unwrap `std::any`, while void callbacks like `() => doSomething()` ignore the parameter.

```typescript
function lowerNativeWidget(name: string, attributes: ts.JsxAttributes, body: IRNode[], ctx: LoweringContext, loc?: SourceLoc): void {
    const props: Record<string, string> = {};
    const callbackProps: Record<string, string> = {};
    const rawAttrs = getRawAttributes(attributes);

    for (const [attrName, expr] of rawAttrs) {
        if (attrName === 'key') continue;
        if (!expr) {
            props[attrName] = 'true';
            continue;
        }

        if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
            // Callback prop — generate std::function<void(std::any)> lambda
            const params = expr.parameters;
            if (params.length > 0) {
                // Parameterized callback: (v: number) => setVol(v)
                const param = params[0];
                const paramName = ts.isIdentifier(param.name) ? param.name.text : '_p';
                let cppType = 'float';
                if (param.type) {
                    const typeText = param.type.getText();
                    if (typeText === 'number') cppType = 'float';
                    else if (typeText === 'boolean') cppType = 'bool';
                    else if (typeText === 'string') cppType = 'std::string';
                }
                const bodyCode = ts.isBlock(expr.body)
                    ? expr.body.statements.map(s => stmtToCpp(s, ctx)).join(' ')
                    : exprToCpp(expr.body as ts.Expression, ctx) + ';';
                callbackProps[attrName] = `[&](std::any _v) { auto ${paramName} = std::any_cast<${cppType}>(_v); ${bodyCode} }`;
            } else {
                // Void callback: () => doSomething()
                const bodyCode = ts.isBlock(expr.body)
                    ? expr.body.statements.map(s => stmtToCpp(s, ctx)).join(' ')
                    : exprToCpp(expr.body as ts.Expression, ctx) + ';';
                callbackProps[attrName] = `[&](std::any) { ${bodyCode} }`;
            }
        } else {
            props[attrName] = exprToCpp(expr, ctx);
        }
    }

    // Extract key prop if present
    const keyAttr = rawAttrs.get('key');
    const key = keyAttr ? exprToCpp(keyAttr, ctx) : undefined;

    body.push({
        kind: 'native_widget',
        name,
        props,
        callbackProps,
        key,
        loc,
    });
}
```

Note: `stmtToCpp` is already defined in `lowering.ts` (line 261).

- [ ] **Step 3: Route unknown elements to lowerNativeWidget**

In `lowerJsxElement` (around line 396), the existing code routes unknown elements to `lowerCustomComponent`. We need to distinguish imported custom components from native widgets. Change lines 395-399 from:

```typescript
    // Custom component with children - treat as container-like (not common but handle gracefully)
    if (!isHostComponent(name)) {
        lowerCustomComponent(name, node.openingElement.attributes, body, ctx, getLoc(node, ctx));
        return;
    }
```

to:

```typescript
    // Custom TSX component (imported) or native C++ widget (unknown)
    if (!isHostComponent(name)) {
        if (ctx.customComponents && ctx.customComponents.has(name)) {
            lowerCustomComponent(name, node.openingElement.attributes, body, ctx, getLoc(node, ctx));
        } else {
            lowerNativeWidget(name, node.openingElement.attributes, body, ctx, getLoc(node, ctx));
        }
        return;
    }
```

Similarly, in `lowerJsxSelfClosing` (around line 407), change lines 407-409 from:

```typescript
    if (!isHostComponent(name)) {
        lowerCustomComponent(name, node.attributes, body, ctx, getLoc(node, ctx));
        return;
    }
```

to:

```typescript
    if (!isHostComponent(name)) {
        if (ctx.customComponents && ctx.customComponents.has(name)) {
            lowerCustomComponent(name, node.attributes, body, ctx, getLoc(node, ctx));
        } else {
            lowerNativeWidget(name, node.attributes, body, ctx, getLoc(node, ctx));
        }
        return;
    }
```

- [ ] **Step 4: Add customComponents to LoweringContext**

The `LoweringContext` interface (lines 15-21) needs to include the custom components map so the lowering code can distinguish imported components from native widgets. Change:

```typescript
interface LoweringContext {
    stateVars: Map<string, IRStateSlot>;
    setterMap: Map<string, string>;  // setter name -> state var name
    propsParam: string | null;       // name of props parameter, if any
    bufferIndex: number;
    sourceFile: ts.SourceFile;
}
```

to:

```typescript
interface LoweringContext {
    stateVars: Map<string, IRStateSlot>;
    setterMap: Map<string, string>;  // setter name -> state var name
    propsParam: string | null;       // name of props parameter, if any
    bufferIndex: number;
    sourceFile: ts.SourceFile;
    customComponents: Map<string, string>;
}
```

And in `lowerComponent` (around line 69), add it to the context construction. Change:

```typescript
    const ctx: LoweringContext = {
        stateVars,
        setterMap,
        propsParam,
        bufferIndex: 0,
        sourceFile: parsed.sourceFile,
    };
```

to:

```typescript
    const ctx: LoweringContext = {
        stateVars,
        setterMap,
        propsParam,
        bufferIndex: 0,
        sourceFile: parsed.sourceFile,
        customComponents: validation.customComponents,
    };
```

Note: `lowerComponent` already receives the `validation` parameter which contains `customComponents`.

- [ ] **Step 5: Add lowering test for native widget**

Add this test to `compiler/tests/lowering.test.ts`:

```typescript
    it('lowers unknown JSX element as native widget', () => {
        const ir = lower(`
function App() {
  const [vol, setVol] = useState(0.5);
  return (
    <Window title="Test">
      <Knob value={vol} min={0} max={1} onChange={(v: number) => setVol(v)} />
    </Window>
  );
}
        `);

        // body: begin_container(Window), native_widget, end_container(Window)
        expect(ir.body.length).toBe(3);
        const widget = ir.body[1];
        expect(widget.kind).toBe('native_widget');
        if (widget.kind === 'native_widget') {
            expect(widget.name).toBe('Knob');
            expect(widget.props['value']).toContain('vol.get()');
            expect(widget.props['min']).toBe('0');
            expect(widget.props['max']).toBe('1');
            expect(widget.callbackProps['onChange']).toContain('std::any_cast<float>');
            expect(widget.callbackProps['onChange']).toContain('vol.set(v)');
        }
    });
```

- [ ] **Step 6: Run lowering tests**

Run:
```bash
cd compiler && npx vitest run tests/lowering.test.ts
```
Expected: All tests pass including the new native widget test.

- [ ] **Step 7: Commit**

```bash
git add compiler/src/lowering.ts compiler/tests/lowering.test.ts
git commit -m "feat: lower unknown JSX elements as native widgets"
```

---

### Task 5: Compiler — Emitting Native Widgets

**Files:**
- Modify: `compiler/src/emitter.ts:1-9` (imports)
- Modify: `compiler/src/emitter.ts:255-354` (emitNode switch)
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add IRNativeWidget to emitter.ts imports**

In `compiler/src/emitter.ts`, add `IRNativeWidget` to the import. Change lines 1-9 from:

```typescript
import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType, SourceLoc,
    IRBeginContainer, IREndContainer, IRText, IRButton, IRTextInput,
    IRCheckbox, IRSeparator, IRConditional, IRListMap, IRCustomComponent,
    IRBeginPopup, IREndPopup, IROpenPopup, IRMenuItem,
    IRSliderFloat, IRSliderInt, IRDragFloat, IRDragInt, IRCombo,
    IRInputInt, IRInputFloat, IRColorEdit, IRListBox, IRProgressBar, IRTooltip,
    IRDockLayout, IRDockSplit, IRDockPanel,
} from './ir.js';
```

to:

```typescript
import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType, SourceLoc,
    IRBeginContainer, IREndContainer, IRText, IRButton, IRTextInput,
    IRCheckbox, IRSeparator, IRConditional, IRListMap, IRCustomComponent,
    IRBeginPopup, IREndPopup, IROpenPopup, IRMenuItem,
    IRSliderFloat, IRSliderInt, IRDragFloat, IRDragInt, IRCombo,
    IRInputInt, IRInputFloat, IRColorEdit, IRListBox, IRProgressBar, IRTooltip,
    IRDockLayout, IRDockSplit, IRDockPanel, IRNativeWidget,
} from './ir.js';
```

- [ ] **Step 2: Add native_widget case to emitNode switch**

In the `emitNode` function, add a case for `native_widget` in the switch block. Add it before the `dock_layout` case (before line 337):

```typescript
        case 'native_widget':
            emitNativeWidget(node, lines, indent);
            break;
```

- [ ] **Step 3: Add emitNativeWidget function**

Add a counter at the top with the other counters (around line 356-360):

```typescript
let nativeWidgetCounter = 0;
```

Reset it in `emitComponent` alongside the other counter resets (around line 144-149). Add after the existing resets:

```typescript
    nativeWidgetCounter = 0;
```

Then add the `emitNativeWidget` function (after `emitCustomComponent`, around line 740). The callback strings are already fully-formed `std::function<void(std::any)>` lambdas from the lowering step, so the emitter just plugs them in:

```typescript
function emitNativeWidget(node: IRNativeWidget, lines: string[], indent: string): void {
    emitLocComment(node.loc, node.name, lines, indent);
    const idx = nativeWidgetCounter++;
    const label = `${node.name}##nw_${idx}`;

    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}imx::WidgetArgs _wa("${label}");`);

    // Value props
    for (const [k, v] of Object.entries(node.props)) {
        lines.push(`${indent}${INDENT}_wa.set("${k}", ${v});`);
    }

    // Callback props — already lowered to [&](std::any _v) { ... } lambdas
    for (const [k, v] of Object.entries(node.callbackProps)) {
        lines.push(`${indent}${INDENT}_wa.set_callback("${k}", ${v});`);
    }

    lines.push(`${indent}${INDENT}imx::call_widget("${node.name}", _wa);`);
    lines.push(`${indent}}`);
}
```

- [ ] **Step 4: Add emitter test for native widget**

Add this test to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits native widget with WidgetArgs dispatch', () => {
        const output = compile(`
function App() {
  const [vol, setVol] = useState(0.5);
  return (
    <Window title="Test">
      <Knob value={vol} min={0} max={1} onChange={(v: number) => setVol(v)} />
    </Window>
  );
}
        `);

        expect(output).toContain('imx::WidgetArgs _wa("Knob##nw_0")');
        expect(output).toContain('_wa.set("value", vol.get())');
        expect(output).toContain('_wa.set("min", 0)');
        expect(output).toContain('_wa.set("max", 1)');
        expect(output).toContain('_wa.set_callback("onChange"');
        expect(output).toContain('std::any_cast<float>(_v)');
        expect(output).toContain('vol.set(');
        expect(output).toContain('imx::call_widget("Knob", _wa)');
    });

    it('emits native widget void callback', () => {
        const output = compile(`
function App() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Test">
      <MyButton onPress={() => setCount(count + 1)} />
    </Window>
  );
}
        `);

        expect(output).toContain('imx::WidgetArgs _wa("MyButton##nw_0")');
        expect(output).toContain('_wa.set_callback("onPress"');
        expect(output).toContain('[&](std::any)');
        expect(output).toContain('count.set(count.get() + 1)');
        expect(output).toContain('imx::call_widget("MyButton", _wa)');
    });
```

- [ ] **Step 5: Run emitter tests**

Run:
```bash
cd compiler && npx vitest run tests/emitter.test.ts
```
Expected: All tests pass.

- [ ] **Step 6: Run full compiler test suite**

Run:
```bash
cd compiler && npx vitest run
```
Expected: All tests pass (validator, lowering, emitter, parser, diagnostics).

- [ ] **Step 7: Commit**

```bash
git add compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: emit WidgetArgs dispatch code for native widgets"
```

---

### Task 6: Init Template Updates

**Files:**
- Modify: `compiler/src/init.ts` (`.d.ts` template section)

- [ ] **Step 1: Update ThemeProps.preset type to string**

In `compiler/src/init.ts`, find the ThemeProps interface in the `.d.ts` template string (around line 160-161) and change:

```typescript
interface ThemeProps {
  preset: "dark" | "light" | "classic";
```

to:

```typescript
interface ThemeProps {
  preset: string;
```

- [ ] **Step 2: Add custom native widget example to .d.ts template**

In `compiler/src/init.ts`, find the end of the `.d.ts` template string (after the last `declare function` line, around line 215-220) and add before the closing backtick:

```typescript
// --- Custom native widgets ---
// Declare your C++ registered widgets here for type checking:
//
// interface KnobProps {
//     value: number;
//     onChange: (value: number) => void;
//     min: number;
//     max: number;
//     width?: number;
//     height?: number;
// }
// declare function Knob(props: KnobProps): any;
```

- [ ] **Step 3: Build compiler**

Run:
```bash
cd compiler && npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/init.ts
git commit -m "feat: update init template with custom widget .d.ts example and string preset"
```

---

### Task 7: End-to-End Build Verification

**Files:**
- No new files — build the existing hello_app to verify everything links

- [ ] **Step 1: Build compiler**

Run:
```bash
cd compiler && npm run build
```
Expected: Build succeeds.

- [ ] **Step 2: CMake configure**

Run:
```bash
cmake -B build -G "Visual Studio 17 2022"
```
Expected: Configure succeeds.

- [ ] **Step 3: Build hello_app**

Run:
```bash
cmake --build build --target hello_app
```
Expected: Build succeeds — the generated code doesn't use native widgets yet, but the renderer lib with the new APIs must link cleanly.

- [ ] **Step 4: Run C++ tests**

Run:
```bash
cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe
```
Expected: All tests pass.

- [ ] **Step 5: Run compiler tests**

Run:
```bash
cd compiler && npx vitest run
```
Expected: All tests pass.

---

### Task 8: Documentation

**Files:**
- Modify: `docs/api-reference.md`
- Modify: `docs/quick-start.md`
- Modify: `docs/llm-prompt-reference.md`

- [ ] **Step 1: Add Custom Widgets & Themes section to api-reference.md**

Find the "Custom Components" section in `docs/api-reference.md` (around line 659). Add a new section *after* it:

```markdown
## Custom Native Widgets

Native widgets let you use existing C++ ImGui widgets from TSX. Unlike custom components (which are written in TSX), native widgets are C++ functions registered at runtime.

### Registering a Widget

In your `main.cpp`, register widgets before the render loop:

\`\`\`cpp
#include <imx/renderer.h>

imx::register_widget("Knob", [](imx::WidgetArgs& args) {
    float v = args.get<float>("value");
    bool changed = MyKnob(
        args.label(),
        &v,
        args.get<float>("min"),
        args.get<float>("max"),
        ImVec2(args.get<float>("width", 80.0f), args.get<float>("height", 80.0f))
    );
    if (changed) args.call("onChange", v);
});
\`\`\`

### WidgetArgs API

| Method | Description |
|--------|-------------|
| `label()` | Returns the widget's ImGui label/ID (`const char*`) |
| `get<T>(name)` | Get a prop value, returns `T{}` if missing |
| `get<T>(name, default)` | Get a prop value with default |
| `has(name)` | Check if a prop was provided |
| `set<T>(name, value)` | Set a prop value (used by generated code) |
| `set_callback(name, fn)` | Set a callback (used by generated code) |
| `call(name)` | Invoke a void callback |
| `call<T>(name, value)` | Invoke a callback with a value |

### Declaring Types

Add type declarations to your `imx.d.ts` so TypeScript checks props:

\`\`\`typescript
interface KnobProps {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    width?: number;
    height?: number;
}
declare function Knob(props: KnobProps): any;
\`\`\`

### Using in TSX

\`\`\`tsx
function App() {
    const [volume, setVolume] = useState(0.5);
    return (
        <Window title="Mixer">
            <Knob value={volume} onChange={(v: number) => setVolume(v)} min={0} max={1} />
        </Window>
    );
}
\`\`\`

## Custom Theme Presets

Register a custom theme function that applies ImGui styles:

\`\`\`cpp
imx::register_theme("zynlab", []() {
    ImGuiStyle& style = ImGui::GetStyle();
    style.Colors[ImGuiCol_WindowBg] = ImVec4(0.1f, 0.1f, 0.1f, 1.0f);
    // ... set all your colors
});
\`\`\`

Then use it in TSX:

\`\`\`tsx
<Theme preset="zynlab" rounding={4}>
    {/* children use the custom theme */}
</Theme>
\`\`\`

Override props (`accentColor`, `rounding`, etc.) still apply on top of your custom theme.
```

- [ ] **Step 2: Add brief mention to quick-start.md**

Find the end of `docs/quick-start.md` and add:

```markdown
## Custom Native Widgets

You can register existing C++ ImGui widgets and use them from TSX. See the [Custom Native Widgets](api-reference.md#custom-native-widgets) section in the API reference.
```

- [ ] **Step 3: Add native widget syntax to llm-prompt-reference.md**

Find an appropriate location in `docs/llm-prompt-reference.md` and add:

```markdown
## Native Widgets

Native widgets are C++ ImGui widgets registered at runtime. Use them like any component:

\`\`\`tsx
<Knob value={vol} onChange={(v: number) => setVol(v)} min={0} max={1} />
\`\`\`

Requirements:
- Widget must be registered in `main.cpp` with `imx::register_widget("Knob", ...)`
- Props must be declared in `imx.d.ts` for type checking
- Callbacks with a value parameter need a type annotation: `(v: number) => ...`

Custom themes work via `imx::register_theme("name", fn)` and `<Theme preset="name">`.
```

- [ ] **Step 4: Commit**

```bash
git add docs/api-reference.md docs/quick-start.md docs/llm-prompt-reference.md
git commit -m "docs: add custom native widgets and themes documentation"
```
