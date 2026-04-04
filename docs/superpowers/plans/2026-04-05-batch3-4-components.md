# Batch 3-4 Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 11 new components (Group, ID, StyleColor, StyleVar, DragDropSource, DragDropTarget, Canvas, DrawLine, DrawRect, DrawCircle, DrawText) to the IMX compiler and renderer.

**Architecture:** Each component flows through the standard pipeline: components.ts → ir.ts → lowering.ts → emitter.ts → renderer.h → components.cpp → init.ts. Batch 3 (scoping/interaction) components are all containers using begin/end pairs. Batch 4 (canvas drawing) adds a Canvas container plus leaf draw-primitive components. StyleColor/StyleVar use a struct-based approach like ThemeConfig. DragDrop wraps children in BeginGroup/EndGroup, then checks drag/drop state after.

**Tech Stack:** TypeScript (compiler), C++20 (renderer), ImGui (backend), Vitest (compiler tests)

**Spec:** `docs/superpowers/specs/2026-04-05-batch3-4-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `compiler/src/components.ts` | Modify (line ~335) | Add 11 component definitions to HOST_COMPONENTS |
| `compiler/src/ir.ts` | Modify (lines 48-50, 57-59, 31-44) | Add container tags + 4 draw-primitive IR node types |
| `compiler/src/lowering.ts` | Modify (lines ~384, ~522) | Add leaf lowering functions for draw primitives + DragDrop callback handling |
| `compiler/src/emitter.ts` | Modify (lines ~492, ~654) | Add begin/end emit cases for all containers + draw primitive emitters |
| `include/imx/renderer.h` | Modify (lines ~34, ~178) | Add StyleColorOverrides, StyleVarOverrides structs + function declarations |
| `renderer/components.cpp` | Modify (line ~469) | Implement begin/end pairs + draw functions + canvas origin stack |
| `compiler/src/init.ts` | Modify (lines ~199, ~245) | Add Props interfaces and function declarations to imx.d.ts |
| `compiler/tests/emitter.test.ts` | Modify (append) | Tests for all 11 components |
| `compiler/tests/lowering.test.ts` | Modify (append) | Tests for draw primitive IR lowering |
| `examples/hello/app.tsx` | Modify | Add demo usage of new components |

---

## Phase A: Batch 3 — Scoping & Interaction

### Task 1: Group & ID — Component Definitions + IR

**Files:**
- Modify: `compiler/src/components.ts:335` (before closing `};`)
- Modify: `compiler/src/ir.ts:48-50,57-59` (add tags to container unions)

- [ ] **Step 1: Add Group and ID to HOST_COMPONENTS**

In `compiler/src/components.ts`, insert before the closing `};` on line 335:

```typescript
    Group: {
        props: {
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    ID: {
        props: {
            scope: { type: 'string', required: true },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add Group and ID tags to IRBeginContainer and IREndContainer**

In `compiler/src/ir.ts`, update the `IRBeginContainer` tag union (line 48-50) to include `'Group' | 'ID'`:

```typescript
export interface IRBeginContainer {
    kind: 'begin_container';
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu'
       | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader'
       | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal'
       | 'Group' | 'ID';
    props: Record<string, string>;
    style?: string;
    loc?: SourceLoc;
}
```

Do the same for `IREndContainer` (line 55-60):

```typescript
export interface IREndContainer {
    kind: 'end_container';
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu'
       | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader'
       | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel' | 'Modal'
       | 'Group' | 'ID';
}
```

- [ ] **Step 3: Verify compiler builds**

Run: `cd compiler && npm run build`
Expected: No errors. Lowering already handles containers automatically via the `def.isContainer` check at lowering.ts:388.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts
git commit -m "feat: add Group and ID component definitions and IR tags"
```

---

### Task 2: Group & ID — Emitter + Renderer

**Files:**
- Modify: `compiler/src/emitter.ts:492-651,654-728` (add cases in emitBeginContainer/emitEndContainer)
- Modify: `include/imx/renderer.h:178` (before end of renderer namespace)
- Modify: `renderer/components.cpp:469` (before closing namespace)

- [ ] **Step 1: Write failing emitter test for Group**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits Group with BeginGroup/EndGroup', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Group>
        <Text>Hello</Text>
      </Group>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginGroup()');
        expect(output).toContain('imx::renderer::text("Hello")');
        expect(output).toContain('ImGui::EndGroup()');
    });
```

- [ ] **Step 2: Write failing emitter test for ID**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits ID with PushID/PopID', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <ID scope="player1">
        <Text>Player 1</Text>
      </ID>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::PushID("player1")');
        expect(output).toContain('imx::renderer::text("Player 1")');
        expect(output).toContain('ImGui::PopID()');
    });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL — the emitter switch doesn't have Group/ID cases yet.

- [ ] **Step 4: Add Group and ID cases to emitBeginContainer**

In `compiler/src/emitter.ts`, inside `emitBeginContainer` (around line 645, before `case 'DockLayout'`), add:

```typescript
        case 'Group': {
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
        case 'ID': {
            const scope = node.props['scope'] ?? '""';
            if (scope.startsWith('"')) {
                lines.push(`${indent}ImGui::PushID(${scope});`);
            } else {
                lines.push(`${indent}ImGui::PushID(static_cast<int>(${scope}));`);
            }
            break;
        }
```

- [ ] **Step 5: Add Group and ID cases to emitEndContainer**

In `compiler/src/emitter.ts`, inside `emitEndContainer` (around line 722, before `case 'DockLayout'`), add:

```typescript
        case 'Group':
            lines.push(`${indent}ImGui::EndGroup();`);
            break;
        case 'ID':
            lines.push(`${indent}ImGui::PopID();`);
            break;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS

- [ ] **Step 7: Add type definitions to init.ts**

In `compiler/src/init.ts`, add Props interfaces after `ImageProps` (line 199):

```typescript
interface GroupProps { style?: Style; children?: any; }
interface IDProps { scope: string | number; children?: any; }
```

Add function declarations after `declare function Image(...)` (line 245):

```typescript
declare function Group(props: GroupProps): any;
declare function ID(props: IDProps): any;
```

- [ ] **Step 8: Build compiler**

Run: `cd compiler && npm run build`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts
git commit -m "feat: add Group and ID emitter support with tests"
```

Note: Group and ID emit direct ImGui calls (BeginGroup/PushID), so they don't need renderer.h/components.cpp functions. The generated code uses ImGui directly.

---

### Task 3: StyleColor — Component Definition + IR + Structs

**Files:**
- Modify: `compiler/src/components.ts:335`
- Modify: `compiler/src/ir.ts:48-50,57-59`
- Modify: `include/imx/renderer.h:34` (after ThemeConfig)

- [ ] **Step 1: Add StyleColor to HOST_COMPONENTS**

In `compiler/src/components.ts`, insert before the closing `};`:

```typescript
    StyleColor: {
        props: {
            text: { type: 'style', required: false },
            textDisabled: { type: 'style', required: false },
            windowBg: { type: 'style', required: false },
            frameBg: { type: 'style', required: false },
            frameBgHovered: { type: 'style', required: false },
            frameBgActive: { type: 'style', required: false },
            titleBg: { type: 'style', required: false },
            titleBgActive: { type: 'style', required: false },
            button: { type: 'style', required: false },
            buttonHovered: { type: 'style', required: false },
            buttonActive: { type: 'style', required: false },
            header: { type: 'style', required: false },
            headerHovered: { type: 'style', required: false },
            headerActive: { type: 'style', required: false },
            separator: { type: 'style', required: false },
            checkMark: { type: 'style', required: false },
            sliderGrab: { type: 'style', required: false },
            border: { type: 'style', required: false },
            popupBg: { type: 'style', required: false },
            tab: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add StyleColor tag to IR container unions**

In `compiler/src/ir.ts`, add `'StyleColor'` to both `IRBeginContainer` and `IREndContainer` tag unions (append after `'Group' | 'ID'`):

```
| 'Group' | 'ID' | 'StyleColor';
```

- [ ] **Step 3: Add StyleColorOverrides struct to renderer.h**

In `include/imx/renderer.h`, after the `ThemeConfig` struct (line 34), add:

```cpp
struct StyleColorOverrides {
    std::optional<ImVec4> text;
    std::optional<ImVec4> text_disabled;
    std::optional<ImVec4> window_bg;
    std::optional<ImVec4> frame_bg;
    std::optional<ImVec4> frame_bg_hovered;
    std::optional<ImVec4> frame_bg_active;
    std::optional<ImVec4> title_bg;
    std::optional<ImVec4> title_bg_active;
    std::optional<ImVec4> button;
    std::optional<ImVec4> button_hovered;
    std::optional<ImVec4> button_active;
    std::optional<ImVec4> header;
    std::optional<ImVec4> header_hovered;
    std::optional<ImVec4> header_active;
    std::optional<ImVec4> separator;
    std::optional<ImVec4> check_mark;
    std::optional<ImVec4> slider_grab;
    std::optional<ImVec4> border;
    std::optional<ImVec4> popup_bg;
    std::optional<ImVec4> tab;
};
```

- [ ] **Step 4: Declare begin/end_style_color in renderer.h**

In `include/imx/renderer.h`, before the closing `} // namespace renderer` (line 180), add:

```cpp
void begin_style_color(const StyleColorOverrides& overrides);
void end_style_color();
```

- [ ] **Step 5: Build C++ to check struct compiles**

Run: `cmake --build build --target hello_app 2>&1 | head -20`
Expected: Linker error for unresolved `begin_style_color`/`end_style_color` (that's fine — implementation comes in next step).

- [ ] **Step 6: Implement begin/end_style_color in components.cpp**

In `renderer/components.cpp`, add a new stack and the functions before the closing `} // namespace imx::renderer` (line 471):

```cpp
struct StyleColorState {
    int count;
};
static std::vector<StyleColorState> g_style_color_stack;

void begin_style_color(const StyleColorOverrides& o) {
    int count = 0;
    if (o.text)             { ImGui::PushStyleColor(ImGuiCol_Text, *o.text); count++; }
    if (o.text_disabled)    { ImGui::PushStyleColor(ImGuiCol_TextDisabled, *o.text_disabled); count++; }
    if (o.window_bg)        { ImGui::PushStyleColor(ImGuiCol_WindowBg, *o.window_bg); count++; }
    if (o.frame_bg)         { ImGui::PushStyleColor(ImGuiCol_FrameBg, *o.frame_bg); count++; }
    if (o.frame_bg_hovered) { ImGui::PushStyleColor(ImGuiCol_FrameBgHovered, *o.frame_bg_hovered); count++; }
    if (o.frame_bg_active)  { ImGui::PushStyleColor(ImGuiCol_FrameBgActive, *o.frame_bg_active); count++; }
    if (o.title_bg)         { ImGui::PushStyleColor(ImGuiCol_TitleBg, *o.title_bg); count++; }
    if (o.title_bg_active)  { ImGui::PushStyleColor(ImGuiCol_TitleBgActive, *o.title_bg_active); count++; }
    if (o.button)           { ImGui::PushStyleColor(ImGuiCol_Button, *o.button); count++; }
    if (o.button_hovered)   { ImGui::PushStyleColor(ImGuiCol_ButtonHovered, *o.button_hovered); count++; }
    if (o.button_active)    { ImGui::PushStyleColor(ImGuiCol_ButtonActive, *o.button_active); count++; }
    if (o.header)           { ImGui::PushStyleColor(ImGuiCol_Header, *o.header); count++; }
    if (o.header_hovered)   { ImGui::PushStyleColor(ImGuiCol_HeaderHovered, *o.header_hovered); count++; }
    if (o.header_active)    { ImGui::PushStyleColor(ImGuiCol_HeaderActive, *o.header_active); count++; }
    if (o.separator)        { ImGui::PushStyleColor(ImGuiCol_Separator, *o.separator); count++; }
    if (o.check_mark)       { ImGui::PushStyleColor(ImGuiCol_CheckMark, *o.check_mark); count++; }
    if (o.slider_grab)      { ImGui::PushStyleColor(ImGuiCol_SliderGrab, *o.slider_grab); count++; }
    if (o.border)           { ImGui::PushStyleColor(ImGuiCol_Border, *o.border); count++; }
    if (o.popup_bg)         { ImGui::PushStyleColor(ImGuiCol_PopupBg, *o.popup_bg); count++; }
    if (o.tab)              { ImGui::PushStyleColor(ImGuiCol_Tab, *o.tab); count++; }
    g_style_color_stack.push_back({count});
}

void end_style_color() {
    if (!g_style_color_stack.empty()) {
        int count = g_style_color_stack.back().count;
        g_style_color_stack.pop_back();
        if (count > 0) ImGui::PopStyleColor(count);
    }
}
```

- [ ] **Step 7: Build C++ to verify**

Run: `cmake --build build --target hello_app`
Expected: PASS (links successfully).

- [ ] **Step 8: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add StyleColor component definition, IR tags, and renderer"
```

---

### Task 4: StyleColor — Emitter

**Files:**
- Modify: `compiler/src/emitter.ts` (emitBeginContainer/emitEndContainer)
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write failing emitter test**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits StyleColor with struct-based overrides', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <StyleColor button={[1, 0, 0, 1]} text={[1, 1, 1, 1]}>
        <Button title="Red" onPress={() => {}} />
      </StyleColor>
    </Window>
  );
}
        `);
        expect(output).toContain('imx::StyleColorOverrides');
        expect(output).toContain('.button = ImVec4(');
        expect(output).toContain('.text = ImVec4(');
        expect(output).toContain('begin_style_color(');
        expect(output).toContain('end_style_color()');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL

- [ ] **Step 3: Add StyleColor case to emitBeginContainer**

In `compiler/src/emitter.ts`, add a case in `emitBeginContainer` (before `case 'DockLayout'`):

```typescript
        case 'StyleColor': {
            const varName = `sc_${styleCounter++}`;
            lines.push(`${indent}imx::StyleColorOverrides ${varName};`);
            const colorProps: [string, string][] = [
                ['text', 'text'], ['textDisabled', 'text_disabled'],
                ['windowBg', 'window_bg'], ['frameBg', 'frame_bg'],
                ['frameBgHovered', 'frame_bg_hovered'], ['frameBgActive', 'frame_bg_active'],
                ['titleBg', 'title_bg'], ['titleBgActive', 'title_bg_active'],
                ['button', 'button'], ['buttonHovered', 'button_hovered'],
                ['buttonActive', 'button_active'], ['header', 'header'],
                ['headerHovered', 'header_hovered'], ['headerActive', 'header_active'],
                ['separator', 'separator'], ['checkMark', 'check_mark'],
                ['sliderGrab', 'slider_grab'], ['border', 'border'],
                ['popupBg', 'popup_bg'], ['tab', 'tab'],
            ];
            for (const [tsName, cppName] of colorProps) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitImVec4(node.props[tsName])};`);
                }
            }
            lines.push(`${indent}imx::renderer::begin_style_color(${varName});`);
            break;
        }
```

- [ ] **Step 4: Add StyleColor case to emitEndContainer**

In `compiler/src/emitter.ts`, add a case in `emitEndContainer`:

```typescript
        case 'StyleColor':
            lines.push(`${indent}imx::renderer::end_style_color();`);
            break;
```

- [ ] **Step 5: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS

- [ ] **Step 6: Add type definition to init.ts**

In `compiler/src/init.ts`, add Props interface after existing ones (around line 199):

```typescript
interface StyleColorProps {
  text?: [number, number, number, number];
  textDisabled?: [number, number, number, number];
  windowBg?: [number, number, number, number];
  frameBg?: [number, number, number, number];
  frameBgHovered?: [number, number, number, number];
  frameBgActive?: [number, number, number, number];
  titleBg?: [number, number, number, number];
  titleBgActive?: [number, number, number, number];
  button?: [number, number, number, number];
  buttonHovered?: [number, number, number, number];
  buttonActive?: [number, number, number, number];
  header?: [number, number, number, number];
  headerHovered?: [number, number, number, number];
  headerActive?: [number, number, number, number];
  separator?: [number, number, number, number];
  checkMark?: [number, number, number, number];
  sliderGrab?: [number, number, number, number];
  border?: [number, number, number, number];
  popupBg?: [number, number, number, number];
  tab?: [number, number, number, number];
  children?: any;
}
```

Add function declaration:

```typescript
declare function StyleColor(props: StyleColorProps): any;
```

- [ ] **Step 7: Build compiler**

Run: `cd compiler && npm run build`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts
git commit -m "feat: add StyleColor emitter with struct-based overrides"
```

---

### Task 5: StyleVar — Full Pipeline

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts` (add tag)
- Modify: `include/imx/renderer.h` (add struct + declarations)
- Modify: `renderer/components.cpp` (implement)
- Modify: `compiler/src/emitter.ts` (add cases)
- Modify: `compiler/src/init.ts` (add types)
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add StyleVar to HOST_COMPONENTS**

In `compiler/src/components.ts`:

```typescript
    StyleVar: {
        props: {
            alpha: { type: 'number', required: false },
            windowPadding: { type: 'style', required: false },
            windowRounding: { type: 'number', required: false },
            framePadding: { type: 'style', required: false },
            frameRounding: { type: 'number', required: false },
            frameBorderSize: { type: 'number', required: false },
            itemSpacing: { type: 'style', required: false },
            itemInnerSpacing: { type: 'style', required: false },
            indentSpacing: { type: 'number', required: false },
            cellPadding: { type: 'style', required: false },
            tabRounding: { type: 'number', required: false },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add StyleVar tag to IR unions**

In `compiler/src/ir.ts`, add `'StyleVar'` to both container tag unions:

```
| 'Group' | 'ID' | 'StyleColor' | 'StyleVar';
```

- [ ] **Step 3: Add StyleVarOverrides struct to renderer.h**

In `include/imx/renderer.h`, after StyleColorOverrides:

```cpp
struct StyleVarOverrides {
    std::optional<float> alpha;
    std::optional<ImVec2> window_padding;
    std::optional<float> window_rounding;
    std::optional<ImVec2> frame_padding;
    std::optional<float> frame_rounding;
    std::optional<float> frame_border_size;
    std::optional<ImVec2> item_spacing;
    std::optional<ImVec2> item_inner_spacing;
    std::optional<float> indent_spacing;
    std::optional<ImVec2> cell_padding;
    std::optional<float> tab_rounding;
};
```

Declare functions (next to begin/end_style_color):

```cpp
void begin_style_var(const StyleVarOverrides& overrides);
void end_style_var();
```

- [ ] **Step 4: Implement begin/end_style_var in components.cpp**

In `renderer/components.cpp`, after `end_style_color()`:

```cpp
struct StyleVarState {
    int count;
};
static std::vector<StyleVarState> g_style_var_stack;

void begin_style_var(const StyleVarOverrides& o) {
    int count = 0;
    if (o.alpha)              { ImGui::PushStyleVar(ImGuiStyleVar_Alpha, *o.alpha); count++; }
    if (o.window_padding)     { ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, *o.window_padding); count++; }
    if (o.window_rounding)    { ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, *o.window_rounding); count++; }
    if (o.frame_padding)      { ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, *o.frame_padding); count++; }
    if (o.frame_rounding)     { ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, *o.frame_rounding); count++; }
    if (o.frame_border_size)  { ImGui::PushStyleVar(ImGuiStyleVar_FrameBorderSize, *o.frame_border_size); count++; }
    if (o.item_spacing)       { ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, *o.item_spacing); count++; }
    if (o.item_inner_spacing) { ImGui::PushStyleVar(ImGuiStyleVar_ItemInnerSpacing, *o.item_inner_spacing); count++; }
    if (o.indent_spacing)     { ImGui::PushStyleVar(ImGuiStyleVar_IndentSpacing, *o.indent_spacing); count++; }
    if (o.cell_padding)       { ImGui::PushStyleVar(ImGuiStyleVar_CellPadding, *o.cell_padding); count++; }
    if (o.tab_rounding)       { ImGui::PushStyleVar(ImGuiStyleVar_TabRounding, *o.tab_rounding); count++; }
    g_style_var_stack.push_back({count});
}

void end_style_var() {
    if (!g_style_var_stack.empty()) {
        int count = g_style_var_stack.back().count;
        g_style_var_stack.pop_back();
        if (count > 0) ImGui::PopStyleVar(count);
    }
}
```

- [ ] **Step 5: Write failing emitter test**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits StyleVar with float and vec2 overrides', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <StyleVar frameRounding={8} framePadding={[12, 6]}>
        <Button title="Styled" onPress={() => {}} />
      </StyleVar>
    </Window>
  );
}
        `);
        expect(output).toContain('imx::StyleVarOverrides');
        expect(output).toContain('.frame_rounding = 8.0F');
        expect(output).toContain('.frame_padding = ImVec2(');
        expect(output).toContain('begin_style_var(');
        expect(output).toContain('end_style_var()');
    });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL

- [ ] **Step 7: Add StyleVar emitter cases**

In `emitBeginContainer`, add before `case 'DockLayout'`:

```typescript
        case 'StyleVar': {
            const varName = `sv_${styleCounter++}`;
            lines.push(`${indent}imx::StyleVarOverrides ${varName};`);
            // Float props
            const floatProps: [string, string][] = [
                ['alpha', 'alpha'], ['windowRounding', 'window_rounding'],
                ['frameRounding', 'frame_rounding'], ['frameBorderSize', 'frame_border_size'],
                ['indentSpacing', 'indent_spacing'], ['tabRounding', 'tab_rounding'],
            ];
            for (const [tsName, cppName] of floatProps) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitFloat(node.props[tsName])};`);
                }
            }
            // Vec2 props
            const vec2Props: [string, string][] = [
                ['windowPadding', 'window_padding'], ['framePadding', 'frame_padding'],
                ['itemSpacing', 'item_spacing'], ['itemInnerSpacing', 'item_inner_spacing'],
                ['cellPadding', 'cell_padding'],
            ];
            for (const [tsName, cppName] of vec2Props) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitImVec2(node.props[tsName])};`);
                }
            }
            lines.push(`${indent}imx::renderer::begin_style_var(${varName});`);
            break;
        }
```

In `emitEndContainer`:

```typescript
        case 'StyleVar':
            lines.push(`${indent}imx::renderer::end_style_var();`);
            break;
```

- [ ] **Step 8: Add emitImVec2 helper**

In `compiler/src/emitter.ts`, after the `emitImVec4` function (around line 60), add:

```typescript
function emitImVec2(arrayStr: string): string {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return v.includes('.') ? `${v}f` : `${v}.0f`;
    });
    return `ImVec2(${parts.join(', ')})`;
}
```

- [ ] **Step 9: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS

- [ ] **Step 10: Add type definition to init.ts**

In `compiler/src/init.ts`:

```typescript
interface StyleVarProps {
  alpha?: number;
  windowPadding?: [number, number];
  windowRounding?: number;
  framePadding?: [number, number];
  frameRounding?: number;
  frameBorderSize?: number;
  itemSpacing?: [number, number];
  itemInnerSpacing?: [number, number];
  indentSpacing?: number;
  cellPadding?: [number, number];
  tabRounding?: number;
  children?: any;
}
```

Function declaration:

```typescript
declare function StyleVar(props: StyleVarProps): any;
```

- [ ] **Step 11: Build both compiler and C++**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Both pass.

- [ ] **Step 12: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/emitter.ts compiler/src/init.ts include/imx/renderer.h renderer/components.cpp compiler/tests/emitter.test.ts
git commit -m "feat: add StyleVar component with float and vec2 overrides"
```

---

### Task 6: DragDropSource & DragDropTarget — Full Pipeline

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts` (add tags)
- Modify: `compiler/src/lowering.ts` (special handling for DragDrop callback)
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add DragDropSource and DragDropTarget to HOST_COMPONENTS**

In `compiler/src/components.ts`:

```typescript
    DragDropSource: {
        props: {
            type: { type: 'string', required: true },
            payload: { type: 'number', required: true },
        },
        hasChildren: true, isContainer: true,
    },
    DragDropTarget: {
        props: {
            type: { type: 'string', required: true },
            onDrop: { type: 'callback', required: true },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add tags to IR unions**

In `compiler/src/ir.ts`, add to both container tag unions:

```
| 'StyleVar' | 'DragDropSource' | 'DragDropTarget';
```

- [ ] **Step 3: Write failing emitter test for DragDropSource**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits DragDropSource with payload', () => {
        const output = compile(`
function App() {
  const [id, setId] = useState(42);
  return (
    <Window title="Test">
      <DragDropSource type="item" payload={id}>
        <Text>Drag me</Text>
      </DragDropSource>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginGroup()');
        expect(output).toContain('imx::renderer::text("Drag me")');
        expect(output).toContain('ImGui::EndGroup()');
        expect(output).toContain('BeginDragDropSource()');
        expect(output).toContain('SetDragDropPayload("item"');
        expect(output).toContain('EndDragDropSource()');
    });
```

- [ ] **Step 4: Write failing emitter test for DragDropTarget**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits DragDropTarget with onDrop callback', () => {
        const output = compile(`
function App() {
  const [dropped, setDropped] = useState(0);
  return (
    <Window title="Test">
      <DragDropTarget type="item" onDrop={(val: number) => setDropped(val)}>
        <Text>Drop here</Text>
      </DragDropTarget>
    </Window>
  );
}
        `);
        expect(output).toContain('ImGui::BeginGroup()');
        expect(output).toContain('ImGui::EndGroup()');
        expect(output).toContain('BeginDragDropTarget()');
        expect(output).toContain('AcceptDragDropPayload("item")');
        expect(output).toContain('dropped.set(');
        expect(output).toContain('EndDragDropTarget()');
    });
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL

- [ ] **Step 6: Handle DragDropTarget onDrop callback in lowering**

The `onDrop` callback on DragDropTarget needs special lowering — it has a typed parameter like native widget callbacks. In `compiler/src/lowering.ts`, the existing container path at line 388-395 passes all attributes through `getAttributes()` which calls `exprToCpp` on expressions. Arrow functions lower to C++ lambdas automatically via `exprToCpp`. However, for DragDropTarget's `onDrop`, we need the parameter type annotation to determine the payload cast type.

Add a special case in the container lowering path (inside `if (def.isContainer)`, after line 389, before the `body.push` for begin_container):

```typescript
        if (def.isContainer) {
            const containerTag = name as IRBeginContainer['tag'];
            // Special handling for DragDropTarget — lower onDrop callback with type info
            if (name === 'DragDropTarget') {
                const rawAttrs = getRawAttributes(node.openingElement.attributes);
                const props: Record<string, string> = {};
                for (const [attrName, expr] of rawAttrs) {
                    if (attrName === 'onDrop' && expr && (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr))) {
                        const params = expr.parameters;
                        if (params.length > 0) {
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
                            // Store as structured string: type|paramName|body
                            props[attrName] = `${cppType}|${paramName}|${bodyCode}`;
                        }
                    } else if (expr) {
                        props[attrName] = exprToCpp(expr, ctx);
                    } else {
                        props[attrName] = 'true';
                    }
                }
                body.push({ kind: 'begin_container', tag: containerTag, props, loc: getLoc(node, ctx) });
                for (const child of node.children) {
                    lowerJsxChild(child, body, ctx);
                }
                body.push({ kind: 'end_container', tag: containerTag });
                return;
            }
            const attrs = getAttributes(node.openingElement.attributes, ctx);
```

- [ ] **Step 7: Add DragDropSource case to emitBeginContainer**

```typescript
        case 'DragDropSource': {
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
```

- [ ] **Step 8: Add DragDropSource case to emitEndContainer**

```typescript
        case 'DragDropSource': {
            const typeStr = asCharPtr(node.props?.['type'] ?? '""');
            const payload = node.props?.['payload'] ?? '0';
            lines.push(`${indent}ImGui::EndGroup();`);
            lines.push(`${indent}if (ImGui::BeginDragDropSource()) {`);
            lines.push(`${indent}    float _dd_payload = static_cast<float>(${payload});`);
            lines.push(`${indent}    ImGui::SetDragDropPayload(${typeStr}, &_dd_payload, sizeof(_dd_payload));`);
            lines.push(`${indent}    ImGui::Text("Dragging...");`);
            lines.push(`${indent}    ImGui::EndDragDropSource();`);
            lines.push(`${indent}}`);
            break;
        }
```

Wait — `emitEndContainer` receives an `IREndContainer` which only has `tag`, not `props`. The props are on `IRBeginContainer`. We need to stash the DragDrop props when we see the begin, then use them in end.

Add stacks at the top of emitter.ts (near other stacks like `windowOpenStack`):

```typescript
const dragDropSourceStack: Record<string, string>[] = [];
const dragDropTargetStack: Record<string, string>[] = [];
```

Update DragDropSource begin to stash props:

```typescript
        case 'DragDropSource': {
            dragDropSourceStack.push(node.props);
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
```

Update DragDropSource end:

```typescript
        case 'DragDropSource': {
            const props = dragDropSourceStack.pop() ?? {};
            const typeStr = asCharPtr(props['type'] ?? '""');
            const payload = props['payload'] ?? '0';
            lines.push(`${indent}ImGui::EndGroup();`);
            lines.push(`${indent}if (ImGui::BeginDragDropSource()) {`);
            lines.push(`${indent}    float _dd_payload = static_cast<float>(${payload});`);
            lines.push(`${indent}    ImGui::SetDragDropPayload(${typeStr}, &_dd_payload, sizeof(_dd_payload));`);
            lines.push(`${indent}    ImGui::Text("Dragging...");`);
            lines.push(`${indent}    ImGui::EndDragDropSource();`);
            lines.push(`${indent}}`);
            break;
        }
```

- [ ] **Step 9: Add DragDropTarget begin/end cases**

Begin:

```typescript
        case 'DragDropTarget': {
            dragDropTargetStack.push(node.props);
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
```

End:

```typescript
        case 'DragDropTarget': {
            const props = dragDropTargetStack.pop() ?? {};
            const typeStr = asCharPtr(props['type'] ?? '""');
            const onDrop = props['onDrop'] ?? '';
            lines.push(`${indent}ImGui::EndGroup();`);
            lines.push(`${indent}if (ImGui::BeginDragDropTarget()) {`);
            lines.push(`${indent}    if (const ImGuiPayload* _dd_p = ImGui::AcceptDragDropPayload(${typeStr})) {`);
            // Parse the structured callback: "cppType|paramName|bodyCode"
            const parts = onDrop.split('|');
            if (parts.length === 3) {
                const [cppType, paramName, bodyCode] = parts;
                lines.push(`${indent}        ${cppType} ${paramName} = *(const ${cppType}*)_dd_p->Data;`);
                lines.push(`${indent}        ${bodyCode}`);
            }
            lines.push(`${indent}    }`);
            lines.push(`${indent}    ImGui::EndDragDropTarget();`);
            lines.push(`${indent}}`);
            break;
        }
```

- [ ] **Step 10: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS

- [ ] **Step 11: Add type definitions to init.ts**

```typescript
interface DragDropSourceProps { type: string; payload: number | string; children?: any; }
interface DragDropTargetProps { type: string; onDrop: (payload: any) => void; children?: any; }
```

Function declarations:

```typescript
declare function DragDropSource(props: DragDropSourceProps): any;
declare function DragDropTarget(props: DragDropTargetProps): any;
```

- [ ] **Step 12: Build compiler + C++**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Both pass. DragDrop uses direct ImGui calls in generated code, no new renderer functions needed.

- [ ] **Step 13: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts
git commit -m "feat: add DragDropSource and DragDropTarget components"
```

---

### Task 7: Phase A Integration Test — Build hello app with Batch 3 components

**Files:**
- Modify: `examples/hello/app.tsx`

- [ ] **Step 1: Add Batch 3 demo to hello app**

Add a section in `examples/hello/app.tsx` that uses Group, ID, StyleColor, StyleVar, and DragDrop. Place it inside an existing window or add a new one. Example snippet:

```tsx
<Window title="Batch 3 Demo">
  <StyleColor button={[0.2, 0.8, 0.2, 1.0]} buttonHovered={[0.3, 0.9, 0.3, 1.0]}>
    <StyleVar frameRounding={6} framePadding={[10, 4]}>
      <Group>
        <ID scope="demo">
          <Button title="Styled Button" onPress={() => {}} />
          <DragDropSource type="demo" payload={42}>
            <Text>Drag me</Text>
          </DragDropSource>
          <DragDropTarget type="demo" onDrop={(val: number) => {}}>
            <Text>Drop here</Text>
          </DragDropTarget>
        </ID>
      </Group>
    </StyleVar>
  </StyleColor>
</Window>
```

- [ ] **Step 2: Rebuild compiler and app**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Compiles and links successfully.

- [ ] **Step 3: Run the app**

Run: `./build/Debug/hello_app.exe`
Expected: App launches, Batch 3 Demo window shows styled button, drag source text, drop target text. Verify drag-drop works visually.

- [ ] **Step 4: Run all tests**

Run: `cd compiler && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Update compiler/dist/**

Run: `cd compiler && npm run build`
This updates `compiler/dist/` with the latest compiled JS (committed for FetchContent users).

- [ ] **Step 6: Commit**

```bash
git add examples/hello/app.tsx compiler/dist/
git commit -m "feat: add Batch 3 demo to hello app and update compiler/dist"
```

---

## Phase B: Batch 4 — Canvas Drawing

### Task 8: Canvas Container — Definition + IR + Renderer

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`

- [ ] **Step 1: Add Canvas to HOST_COMPONENTS**

```typescript
    Canvas: {
        props: {
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add Canvas tag to IR unions**

Add `'Canvas'` to both `IRBeginContainer` and `IREndContainer` tag unions.

- [ ] **Step 3: Declare Canvas renderer functions**

In `include/imx/renderer.h`, add before closing namespace:

```cpp
void begin_canvas(float width, float height, const Style& style = {});
void end_canvas();
ImVec2 canvas_origin();
```

- [ ] **Step 4: Implement Canvas in components.cpp**

In `renderer/components.cpp`, add a canvas origin stack and implementation before the closing namespace:

```cpp
static std::vector<ImVec2> g_canvas_origin_stack;

void begin_canvas(float width, float height, const Style& style) {
    before_child();
    ImVec2 pos = ImGui::GetCursorScreenPos();
    g_canvas_origin_stack.push_back(pos);
    if (style.background_color) {
        ImGui::GetWindowDrawList()->AddRectFilled(
            pos, ImVec2(pos.x + width, pos.y + height),
            ImGui::ColorConvertFloat4ToU32(*style.background_color));
    }
    ImGui::Dummy(ImVec2(width, height));
}

void end_canvas() {
    if (!g_canvas_origin_stack.empty()) {
        g_canvas_origin_stack.pop_back();
    }
}

ImVec2 canvas_origin() {
    if (!g_canvas_origin_stack.empty()) {
        return g_canvas_origin_stack.back();
    }
    return ImVec2(0, 0);
}
```

- [ ] **Step 5: Build C++**

Run: `cmake --build build --target hello_app`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add Canvas container with origin stack"
```

---

### Task 9: Canvas Emitter + Draw Primitives — IR + Lowering

**Files:**
- Modify: `compiler/src/components.ts` (add DrawLine, DrawRect, DrawCircle, DrawText)
- Modify: `compiler/src/ir.ts` (add IR node types)
- Modify: `compiler/src/lowering.ts` (add leaf lowering functions)

- [ ] **Step 1: Add draw primitive components to HOST_COMPONENTS**

```typescript
    DrawLine: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawRect: {
        props: {
            min: { type: 'style', required: true },
            max: { type: 'style', required: true },
            color: { type: 'style', required: true },
            filled: { type: 'boolean', required: false },
            thickness: { type: 'number', required: false },
            rounding: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawCircle: {
        props: {
            center: { type: 'style', required: true },
            radius: { type: 'number', required: true },
            color: { type: 'style', required: true },
            filled: { type: 'boolean', required: false },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawText: {
        props: {
            pos: { type: 'style', required: true },
            text: { type: 'string', required: true },
            color: { type: 'style', required: true },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IR node types for draw primitives**

In `compiler/src/ir.ts`, add these interfaces after `IRImage` (line 111):

```typescript
export interface IRDrawLine { kind: 'draw_line'; p1: string; p2: string; color: string; thickness: string; loc?: SourceLoc; }
export interface IRDrawRect { kind: 'draw_rect'; min: string; max: string; color: string; filled: string; thickness: string; rounding: string; loc?: SourceLoc; }
export interface IRDrawCircle { kind: 'draw_circle'; center: string; radius: string; color: string; filled: string; thickness: string; loc?: SourceLoc; }
export interface IRDrawText { kind: 'draw_text'; pos: string; text: string; color: string; loc?: SourceLoc; }
```

Add to the `IRNode` union (line 31-44):

```
    | IRDrawLine | IRDrawRect | IRDrawCircle | IRDrawText;
```

- [ ] **Step 3: Add leaf lowering for draw primitives in lowering.ts**

In `compiler/src/lowering.ts`, in the self-closing element switch (around line 522, the `default:` case), add cases before the container fallback:

```typescript
            case 'DrawLine': {
                const p1 = attrs['p1'] ?? '0, 0';
                const p2 = attrs['p2'] ?? '0, 0';
                const color = attrs['color'] ?? '1, 1, 1, 1';
                const thickness = attrs['thickness'] ?? '1.0';
                body.push({ kind: 'draw_line', p1, p2, color, thickness, loc });
                return;
            }
            case 'DrawRect': {
                const min = attrs['min'] ?? '0, 0';
                const max = attrs['max'] ?? '0, 0';
                const color = attrs['color'] ?? '1, 1, 1, 1';
                const filled = attrs['filled'] ?? 'false';
                const thickness = attrs['thickness'] ?? '1.0';
                const rounding = attrs['rounding'] ?? '0.0';
                body.push({ kind: 'draw_rect', min, max, color, filled, thickness, rounding, loc });
                return;
            }
            case 'DrawCircle': {
                const center = attrs['center'] ?? '0, 0';
                const radius = attrs['radius'] ?? '0';
                const color = attrs['color'] ?? '1, 1, 1, 1';
                const filled = attrs['filled'] ?? 'false';
                const thickness = attrs['thickness'] ?? '1.0';
                body.push({ kind: 'draw_circle', center, radius, color, filled, thickness, loc });
                return;
            }
            case 'DrawText': {
                const pos = attrs['pos'] ?? '0, 0';
                const text = attrs['text'] ?? '""';
                const color = attrs['color'] ?? '1, 1, 1, 1';
                body.push({ kind: 'draw_text', pos, text, color, loc });
                return;
            }
```

- [ ] **Step 4: Write lowering test for DrawLine**

Append to `compiler/tests/lowering.test.ts`:

```typescript
    it('lowers DrawLine inside Canvas', () => {
        const ir = lower(`
function App() {
  return (
    <Canvas width={200} height={100}>
      <DrawLine p1={[0, 0]} p2={[200, 100]} color={[1, 0, 0, 1]} thickness={2} />
    </Canvas>
  );
}
        `);
        expect(ir.body[0]).toMatchObject({ kind: 'begin_container', tag: 'Canvas' });
        expect(ir.body[1]).toMatchObject({ kind: 'draw_line' });
        if (ir.body[1].kind === 'draw_line') {
            expect(ir.body[1].color).toContain('1');
        }
        expect(ir.body[2]).toMatchObject({ kind: 'end_container', tag: 'Canvas' });
    });
```

- [ ] **Step 5: Build compiler and run tests**

Run: `cd compiler && npm run build && npx vitest run tests/lowering.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/tests/lowering.test.ts
git commit -m "feat: add draw primitive component definitions, IR types, and lowering"
```

---

### Task 10: Draw Primitives — Renderer + Emitter

**Files:**
- Modify: `include/imx/renderer.h`
- Modify: `renderer/components.cpp`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Declare draw functions in renderer.h**

In `include/imx/renderer.h`, before closing namespace:

```cpp
void draw_line(float x1, float y1, float x2, float y2, ImVec4 color, float thickness = 1.0f);
void draw_rect(float x1, float y1, float x2, float y2, ImVec4 color, bool filled = false, float thickness = 1.0f, float rounding = 0.0f);
void draw_circle(float cx, float cy, float radius, ImVec4 color, bool filled = false, float thickness = 1.0f);
void draw_text(float x, float y, ImVec4 color, const char* text);
```

- [ ] **Step 2: Implement draw functions in components.cpp**

```cpp
void draw_line(float x1, float y1, float x2, float y2, ImVec4 color, float thickness) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddLine(
        ImVec2(o.x + x1, o.y + y1), ImVec2(o.x + x2, o.y + y2),
        ImGui::ColorConvertFloat4ToU32(color), thickness);
}

void draw_rect(float x1, float y1, float x2, float y2, ImVec4 color, bool filled, float thickness, float rounding) {
    ImVec2 o = canvas_origin();
    ImU32 col = ImGui::ColorConvertFloat4ToU32(color);
    if (filled) {
        ImGui::GetWindowDrawList()->AddRectFilled(
            ImVec2(o.x + x1, o.y + y1), ImVec2(o.x + x2, o.y + y2), col, rounding);
    } else {
        ImGui::GetWindowDrawList()->AddRect(
            ImVec2(o.x + x1, o.y + y1), ImVec2(o.x + x2, o.y + y2), col, rounding, 0, thickness);
    }
}

void draw_circle(float cx, float cy, float radius, ImVec4 color, bool filled, float thickness) {
    ImVec2 o = canvas_origin();
    ImU32 col = ImGui::ColorConvertFloat4ToU32(color);
    if (filled) {
        ImGui::GetWindowDrawList()->AddCircleFilled(ImVec2(o.x + cx, o.y + cy), radius, col);
    } else {
        ImGui::GetWindowDrawList()->AddCircle(ImVec2(o.x + cx, o.y + cy), radius, col, 0, thickness);
    }
}

void draw_text(float x, float y, ImVec4 color, const char* text) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddText(ImVec2(o.x + x, o.y + y),
        ImGui::ColorConvertFloat4ToU32(color), text);
}
```

- [ ] **Step 3: Write failing emitter tests**

Append to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits Canvas with begin/end', () => {
        const output = compile(`
function App() {
  return (
    <Window title="Test">
      <Canvas width={300} height={200}>
        <DrawLine p1={[0, 0]} p2={[300, 200]} color={[1, 0, 0, 1]} thickness={2} />
      </Canvas>
    </Window>
  );
}
        `);
        expect(output).toContain('begin_canvas(300.0F, 200.0F');
        expect(output).toContain('draw_line(0.0f, 0.0f, 300.0f, 200.0f');
        expect(output).toContain('end_canvas()');
    });

    it('emits DrawRect with filled flag', () => {
        const output = compile(`
function App() {
  return (
    <Canvas width={100} height={100}>
      <DrawRect min={[10, 10]} max={[90, 90]} color={[0, 1, 0, 1]} filled rounding={4} />
    </Canvas>
  );
}
        `);
        expect(output).toContain('draw_rect(10.0f, 10.0f, 90.0f, 90.0f');
        expect(output).toContain('true');
        expect(output).toContain('4.0');
    });

    it('emits DrawCircle and DrawText', () => {
        const output = compile(`
function App() {
  return (
    <Canvas width={200} height={200}>
      <DrawCircle center={[100, 100]} radius={50} color={[0, 0, 1, 1]} />
      <DrawText pos={[10, 10]} text="Hello" color={[1, 1, 1, 1]} />
    </Canvas>
  );
}
        `);
        expect(output).toContain('draw_circle(100.0f, 100.0f, 50.0F');
        expect(output).toContain('draw_text(10.0f, 10.0f');
        expect(output).toContain('"Hello"');
    });
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL

- [ ] **Step 5: Add Canvas cases to emitBeginContainer/emitEndContainer**

Begin:

```typescript
        case 'Canvas': {
            const width = emitFloat(node.props['width'] ?? '0');
            const height = emitFloat(node.props['height'] ?? '0');
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_canvas(${width}, ${height}, ${style});`);
            } else {
                lines.push(`${indent}imx::renderer::begin_canvas(${width}, ${height});`);
            }
            break;
        }
```

End:

```typescript
        case 'Canvas':
            lines.push(`${indent}imx::renderer::end_canvas();`);
            break;
```

- [ ] **Step 6: Add draw primitive emitter functions**

Add these functions in `compiler/src/emitter.ts` (near the other emit functions):

```typescript
function emitDrawLine(node: IRDrawLine, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DrawLine', lines, indent);
    const p1 = emitImVec2(node.p1);
    const p2 = emitImVec2(node.p2);
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_line(${p1.replace('ImVec2(', '').replace(')', '')}, ${p2.replace('ImVec2(', '').replace(')', '')}, ${color}, ${thickness});`);
}

function emitDrawRect(node: IRDrawRect, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DrawRect', lines, indent);
    const min = emitImVec2(node.min);
    const max = emitImVec2(node.max);
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    const rounding = emitFloat(node.rounding);
    lines.push(`${indent}imx::renderer::draw_rect(${min.replace('ImVec2(', '').replace(')', '')}, ${max.replace('ImVec2(', '').replace(')', '')}, ${color}, ${filled}, ${thickness}, ${rounding});`);
}

function emitDrawCircle(node: IRDrawCircle, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DrawCircle', lines, indent);
    const center = emitImVec2(node.center);
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_circle(${center.replace('ImVec2(', '').replace(')', '')}, ${radius}, ${color}, ${filled}, ${thickness});`);
}

function emitDrawText(node: IRDrawText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DrawText', lines, indent);
    const pos = emitImVec2(node.pos);
    const color = emitImVec4(node.color);
    const text = asCharPtr(node.text);
    lines.push(`${indent}imx::renderer::draw_text(${pos.replace('ImVec2(', '').replace(')', '')}, ${color}, ${text});`);
}
```

Wire these into `emitNodes` by adding cases to the main switch:

```typescript
            case 'draw_line':
                emitDrawLine(node as IRDrawLine, lines, indent);
                break;
            case 'draw_rect':
                emitDrawRect(node as IRDrawRect, lines, indent);
                break;
            case 'draw_circle':
                emitDrawCircle(node as IRDrawCircle, lines, indent);
                break;
            case 'draw_text':
                emitDrawText(node as IRDrawText, lines, indent);
                break;
```

- [ ] **Step 7: Run tests**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: PASS (or adjust assertions if emit format differs slightly — match the actual output).

- [ ] **Step 8: Add type definitions to init.ts**

```typescript
interface CanvasProps { width: number; height: number; style?: Style; children?: any; }
interface DrawLineProps { p1: [number, number]; p2: [number, number]; color: [number, number, number, number]; thickness?: number; }
interface DrawRectProps { min: [number, number]; max: [number, number]; color: [number, number, number, number]; filled?: boolean; thickness?: number; rounding?: number; }
interface DrawCircleProps { center: [number, number]; radius: number; color: [number, number, number, number]; filled?: boolean; thickness?: number; }
interface DrawTextProps { pos: [number, number]; text: string; color: [number, number, number, number]; }
```

Function declarations:

```typescript
declare function Canvas(props: CanvasProps): any;
declare function DrawLine(props: DrawLineProps): any;
declare function DrawRect(props: DrawRectProps): any;
declare function DrawCircle(props: DrawCircleProps): any;
declare function DrawText(props: DrawTextProps): any;
```

- [ ] **Step 9: Build compiler + C++**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Both pass.

- [ ] **Step 10: Commit**

```bash
git add compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts include/imx/renderer.h renderer/components.cpp
git commit -m "feat: add Canvas draw primitives (DrawLine, DrawRect, DrawCircle, DrawText)"
```

---

### Task 11: Phase B Integration Test + Final Cleanup

**Files:**
- Modify: `examples/hello/app.tsx`
- Modify: `compiler/dist/` (update)

- [ ] **Step 1: Add Canvas demo to hello app**

Add a Canvas drawing demo to `examples/hello/app.tsx`:

```tsx
<Window title="Canvas Demo">
  <Canvas width={300} height={200} style={{ backgroundColor: [0.1, 0.1, 0.1, 1.0] }}>
    <DrawLine p1={[0, 0]} p2={[300, 200]} color={[1, 0, 0, 1]} thickness={2} />
    <DrawRect min={[20, 20]} max={[120, 80]} color={[0, 1, 0, 1]} filled rounding={4} />
    <DrawCircle center={[200, 100]} radius={40} color={[0, 0.5, 1, 1]} thickness={3} />
    <DrawText pos={[10, 185]} text="Canvas Drawing" color={[1, 1, 1, 1]} />
  </Canvas>
</Window>
```

- [ ] **Step 2: Rebuild everything**

Run: `cd compiler && npm run build && cd .. && cmake --build build --target hello_app`
Expected: Both pass.

- [ ] **Step 3: Run the app**

Run: `./build/Debug/hello_app.exe`
Expected: Canvas Demo window shows a red diagonal line, green rounded rectangle, blue circle outline, and white text.

- [ ] **Step 4: Run all tests**

Run: `cd compiler && npx vitest run && cd .. && cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe`
Expected: All tests pass.

- [ ] **Step 5: Update compiler/dist/**

Ensure `compiler/dist/` has the latest compiled output.

- [ ] **Step 6: Update CLAUDE.md component count**

Update the "Current status" line in `CLAUDE.md` to reflect 52 components (41 + 11 new).

- [ ] **Step 7: Commit**

```bash
git add examples/hello/app.tsx compiler/dist/ CLAUDE.md
git commit -m "feat: add Canvas demo, update component count to 52"
```
