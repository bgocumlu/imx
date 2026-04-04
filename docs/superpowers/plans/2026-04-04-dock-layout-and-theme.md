# DockLayout and Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add auto dock layout (DockBuilder-based window arrangement) and theming (preset styles + overrides) to ReImGui.

**Architecture:** Theme is a standard container component (begin/end pattern) with C++ renderer managing ImGui style push/pop. DockLayout is a declarative layout descriptor compiled to a static DockBuilder setup function called once on first frame, with a `resetLayout()` global function. DockLayout needs no C++ renderer — it generates direct ImGui DockBuilder API calls.

**Tech Stack:** TypeScript compiler (Vitest tests), C++20 renderer, ImGui DockBuilder API (`imgui_internal.h`)

---

### Task 1: Register Components + IR Types

**Files:**
- Modify: `compiler/src/components.ts:218` (before closing brace of HOST_COMPONENTS)
- Modify: `compiler/src/ir.ts:31-52` (IRNode union + container tag union + new types)

- [ ] **Step 1: Add 4 new components to HOST_COMPONENTS**

In `compiler/src/components.ts`, add before the closing `};` of HOST_COMPONENTS (after line 217):

```typescript
    DockLayout: {
        props: {},
        hasChildren: true, isContainer: true,
    },
    DockSplit: {
        props: { direction: { type: 'string', required: true }, size: { type: 'number', required: true } },
        hasChildren: true, isContainer: true,
    },
    DockPanel: {
        props: {},
        hasChildren: true, isContainer: true,
    },
    Theme: {
        props: {
            preset: { type: 'string', required: true },
            accentColor: { type: 'style', required: false },
            windowBg: { type: 'style', required: false },
            textColor: { type: 'style', required: false },
            rounding: { type: 'number', required: false },
            borderSize: { type: 'number', required: false },
            spacing: { type: 'number', required: false },
        },
        hasChildren: true, isContainer: true,
    },
```

- [ ] **Step 2: Add Theme + DockLayout/DockSplit/DockPanel to IR container tag union**

In `compiler/src/ir.ts`, update both tag unions (lines 42-43 and 50-51) to include the new tags:

```typescript
export interface IRBeginContainer {
    kind: 'begin_container';
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu'
       | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader'
       | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel';
    props: Record<string, string>;
    style?: string;
    loc?: SourceLoc;
}
export interface IREndContainer {
    kind: 'end_container';
    tag: 'Window' | 'View' | 'Row' | 'Column' | 'DockSpace' | 'MenuBar' | 'Menu'
       | 'Table' | 'TableRow' | 'TabBar' | 'TabItem' | 'TreeNode' | 'CollapsingHeader'
       | 'Theme' | 'DockLayout' | 'DockSplit' | 'DockPanel';
}
```

- [ ] **Step 3: Add new DockLayout IR node types**

In `compiler/src/ir.ts`, add after the IRTooltip interface (line 75):

```typescript
export interface IRDockLayout {
    kind: 'dock_layout';
    children: (IRDockSplit | IRDockPanel)[];
    loc?: SourceLoc;
}

export interface IRDockSplit {
    kind: 'dock_split';
    direction: string;
    size: string;
    children: (IRDockSplit | IRDockPanel)[];
}

export interface IRDockPanel {
    kind: 'dock_panel';
    windows: string[];
}
```

- [ ] **Step 4: Add IRDockLayout to the IRNode union**

Update the IRNode union (line 31-38) to include `IRDockLayout`:

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

- [ ] **Step 5: Build compiler to verify types**

Run: `cd compiler && npm run build`
Expected: Clean build, no type errors.

- [ ] **Step 6: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts
git commit -m "feat: register DockLayout, DockSplit, DockPanel, Theme components and IR types"
```

---

### Task 2: Theme Compiler — Emitter

**Files:**
- Modify: `compiler/src/emitter.ts:1-8` (imports)
- Modify: `compiler/src/emitter.ts:311-397` (emitBeginContainer)
- Modify: `compiler/src/emitter.ts:399-448` (emitEndContainer)
- Test: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write the Theme emitter test**

In `compiler/tests/emitter.test.ts`, add a new test at the end of the `describe` block:

```typescript
    it('emits Theme with preset and overrides', () => {
        const output = compile(`
function App() {
  return (
    <Theme preset="dark" accentColor={[0.2, 0.5, 1.0, 1.0]} rounding={6}>
      <DockSpace>
        <Window title="Test">
          <Text>Hello</Text>
        </Window>
      </DockSpace>
    </Theme>
  );
}
        `);

        expect(output).toContain('reimgui::renderer::begin_theme(');
        expect(output).toContain('"dark"');
        expect(output).toContain('accent_color = ImVec4(');
        expect(output).toContain('rounding =');
        expect(output).toContain('reimgui::renderer::end_theme()');
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL — Theme case not handled in emitter.

- [ ] **Step 3: Update emitter imports**

In `compiler/src/emitter.ts`, update the import (line 1-8) to include the new IR types:

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

- [ ] **Step 4: Add ImVec4 emit helper**

In `compiler/src/emitter.ts`, add after the `asCharPtr` function (after line 45):

```typescript
/**
 * Convert a comma-separated float list (from array literal) to an ImVec4 constructor.
 * e.g. "0.2, 0.5, 1.0, 1.0" -> "ImVec4(0.2f, 0.5f, 1.0f, 1.0f)"
 */
function emitImVec4(arrayStr: string): string {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return v.includes('.') ? `${v}f` : `${v}.0f`;
    });
    return `ImVec4(${parts.join(', ')})`;
}

function emitFloat(val: string): string {
    return val.includes('.') ? `${val}f` : `${val}.0f`;
}
```

- [ ] **Step 5: Add Theme case to emitBeginContainer**

In `compiler/src/emitter.ts`, add a new case in the `emitBeginContainer` switch (before the closing `}`), after the CollapsingHeader case:

```typescript
        case 'Theme': {
            const preset = asCharPtr(node.props['preset'] ?? '"dark"');
            const varName = `theme_${styleCounter++}`;
            lines.push(`${indent}reimgui::ThemeConfig ${varName};`);
            if (node.props['accentColor']) {
                lines.push(`${indent}${varName}.accent_color = ${emitImVec4(node.props['accentColor'])};`);
            }
            if (node.props['windowBg']) {
                lines.push(`${indent}${varName}.window_bg = ${emitImVec4(node.props['windowBg'])};`);
            }
            if (node.props['textColor']) {
                lines.push(`${indent}${varName}.text_color = ${emitImVec4(node.props['textColor'])};`);
            }
            if (node.props['rounding']) {
                lines.push(`${indent}${varName}.rounding = ${emitFloat(node.props['rounding'])};`);
            }
            if (node.props['borderSize']) {
                lines.push(`${indent}${varName}.border_size = ${emitFloat(node.props['borderSize'])};`);
            }
            if (node.props['spacing']) {
                lines.push(`${indent}${varName}.spacing = ${emitFloat(node.props['spacing'])};`);
            }
            lines.push(`${indent}reimgui::renderer::begin_theme(${preset}, ${varName});`);
            break;
        }
        case 'DockLayout':
        case 'DockSplit':
        case 'DockPanel':
            // No-op — DockLayout subtree is handled via IRDockLayout nodes
            break;
```

- [ ] **Step 6: Add Theme case to emitEndContainer**

In `compiler/src/emitter.ts`, add in the `emitEndContainer` switch, after CollapsingHeader:

```typescript
        case 'Theme':
            lines.push(`${indent}reimgui::renderer::end_theme();`);
            break;
        case 'DockLayout':
        case 'DockSplit':
        case 'DockPanel':
            break;
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: All tests PASS including new Theme test.

- [ ] **Step 8: Run all compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 9: Commit**

```bash
git add compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: Theme emitter — generates begin_theme/end_theme with ThemeConfig"
```

---

### Task 3: Theme C++ Renderer

**Files:**
- Modify: `include/reimgui/renderer.h:9-21` (add ThemeConfig struct after Style)
- Modify: `include/reimgui/renderer.h:93` (add begin_theme/end_theme declarations)
- Modify: `renderer/components.cpp:1-3` (add includes)
- Modify: `renderer/components.cpp` (add g_theme_stack, begin_theme, end_theme)

- [ ] **Step 1: Add ThemeConfig struct to renderer.h**

In `include/reimgui/renderer.h`, add after the Style struct closing brace (after line 21):

```cpp
struct ThemeConfig {
    std::optional<ImVec4> accent_color;
    std::optional<ImVec4> window_bg;
    std::optional<ImVec4> text_color;
    std::optional<float> rounding;
    std::optional<float> border_size;
    std::optional<float> spacing;
};
```

- [ ] **Step 2: Add begin_theme/end_theme declarations**

In `include/reimgui/renderer.h`, add before the closing `} // namespace renderer` (before line 93):

```cpp
void begin_theme(const char* preset, const ThemeConfig& config = {});
void end_theme();
```

- [ ] **Step 3: Add includes to components.cpp**

In `renderer/components.cpp`, add after line 2 (`#include <cstdarg>`):

```cpp
#include <cstring>
#include <vector>
```

- [ ] **Step 4: Add theme stack and implementation**

In `renderer/components.cpp`, add after the `g_tabbar_id` declaration (after line 9):

```cpp
struct ThemeState {
    int color_count;
    int var_count;
};
static std::vector<ThemeState> g_theme_stack;
```

Then add the begin_theme/end_theme implementations at the end of the file, before the closing `} // namespace`:

```cpp
void begin_theme(const char* preset, const ThemeConfig& config) {
    before_child();

    // Apply preset
    if (std::strcmp(preset, "dark") == 0) ImGui::StyleColorsDark();
    else if (std::strcmp(preset, "light") == 0) ImGui::StyleColorsLight();
    else if (std::strcmp(preset, "classic") == 0) ImGui::StyleColorsClassic();

    int color_count = 0;
    int var_count = 0;

    // Accent color overrides
    if (config.accent_color) {
        ImVec4 c = *config.accent_color;
        ImVec4 hovered(c.x + (1.0F - c.x) * 0.2F, c.y + (1.0F - c.y) * 0.2F,
                       c.z + (1.0F - c.z) * 0.2F, c.w);
        ImVec4 active(c.x * 0.8F, c.y * 0.8F, c.z * 0.8F, c.w);
        ImVec4 frame_bg(c.x * 0.3F, c.y * 0.3F, c.z * 0.3F, 0.5F);

        ImGui::PushStyleColor(ImGuiCol_Button, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ButtonActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_Header, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_HeaderHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_HeaderActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_Tab, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TabSelected, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TabHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_SliderGrab, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_SliderGrabActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_CheckMark, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_FrameBg, frame_bg); color_count++;
    }
    if (config.window_bg) {
        ImGui::PushStyleColor(ImGuiCol_WindowBg, *config.window_bg); color_count++;
    }
    if (config.text_color) {
        ImGui::PushStyleColor(ImGuiCol_Text, *config.text_color); color_count++;
    }

    // Style var overrides
    if (config.rounding) {
        float r = *config.rounding;
        ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_ChildRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_PopupRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_TabRounding, r); var_count++;
    }
    if (config.border_size) {
        float b = *config.border_size;
        ImGui::PushStyleVar(ImGuiStyleVar_FrameBorderSize, b); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, b); var_count++;
    }
    if (config.spacing) {
        float s = *config.spacing;
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(s, s)); var_count++;
    }

    g_theme_stack.push_back({color_count, var_count});
}

void end_theme() {
    if (!g_theme_stack.empty()) {
        ThemeState state = g_theme_stack.back();
        g_theme_stack.pop_back();
        if (state.color_count > 0) ImGui::PopStyleColor(state.color_count);
        if (state.var_count > 0) ImGui::PopStyleVar(state.var_count);
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add include/reimgui/renderer.h renderer/components.cpp
git commit -m "feat: Theme C++ renderer — begin_theme/end_theme with preset + overrides"
```

---

### Task 4: DockLayout Compiler — Custom Lowering

**Files:**
- Modify: `compiler/src/lowering.ts:1-12` (imports)
- Modify: `compiler/src/lowering.ts:345-367` (lowerJsxElement — intercept DockLayout)
- Modify: `compiler/src/lowering.ts` (add lowerDockLayout, lowerDockSplit, lowerDockPanel functions)

- [ ] **Step 1: Update lowering imports**

In `compiler/src/lowering.ts`, update the import from `./ir.js` (lines 5-12) to include:

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

- [ ] **Step 2: Intercept DockLayout in lowerJsxElement**

In `compiler/src/lowering.ts`, in the `lowerJsxElement` function (line 345), add after the Text check (after line 353) and before the `isHostComponent` check (line 355):

```typescript
    if (name === 'DockLayout') {
        body.push(lowerDockLayout(node, ctx));
        return;
    }
```

- [ ] **Step 3: Add DockLayout lowering functions**

In `compiler/src/lowering.ts`, add before the `lowerJsxChild` function (before line 709):

```typescript
function lowerDockLayout(node: ts.JsxElement, ctx: LoweringContext): IRDockLayout {
    const children: (IRDockSplit | IRDockPanel)[] = [];
    for (const child of node.children) {
        if (ts.isJsxElement(child)) {
            const tag = child.openingElement.tagName;
            if (ts.isIdentifier(tag)) {
                if (tag.text === 'DockSplit') children.push(lowerDockSplit(child, ctx));
                else if (tag.text === 'DockPanel') children.push(lowerDockPanel(child, ctx));
            }
        }
    }
    return { kind: 'dock_layout', children, loc: getLoc(node, ctx) };
}

function lowerDockSplit(node: ts.JsxElement, ctx: LoweringContext): IRDockSplit {
    const attrs = getAttributes(node.openingElement.attributes, ctx);
    const direction = attrs['direction'] ?? '"horizontal"';
    const size = attrs['size'] ?? '0.5';
    const children: (IRDockSplit | IRDockPanel)[] = [];
    for (const child of node.children) {
        if (ts.isJsxElement(child)) {
            const tag = child.openingElement.tagName;
            if (ts.isIdentifier(tag)) {
                if (tag.text === 'DockSplit') children.push(lowerDockSplit(child, ctx));
                else if (tag.text === 'DockPanel') children.push(lowerDockPanel(child, ctx));
            }
        }
    }
    return { kind: 'dock_split', direction, size, children };
}

function lowerDockPanel(node: ts.JsxElement, ctx: LoweringContext): IRDockPanel {
    const windows: string[] = [];
    for (const child of node.children) {
        if (ts.isJsxSelfClosingElement(child)) {
            const tag = child.tagName;
            if (ts.isIdentifier(tag) && tag.text === 'Window') {
                const attrs = getAttributes(child.attributes, ctx);
                if (attrs['title']) windows.push(attrs['title']);
            }
        }
    }
    return { kind: 'dock_panel', windows };
}
```

- [ ] **Step 4: Build compiler**

Run: `cd compiler && npm run build`
Expected: Clean build, no type errors.

- [ ] **Step 5: Commit**

```bash
git add compiler/src/lowering.ts
git commit -m "feat: DockLayout custom lowering — recursive DockSplit/DockPanel walker"
```

---

### Task 5: DockLayout Emitter + resetLayout

**Files:**
- Modify: `compiler/src/emitter.ts:84-152` (emitComponent — pre-scan + statics)
- Modify: `compiler/src/emitter.ts:184-265` (emitNode — dock_layout case)
- Modify: `compiler/src/lowering.ts:158-165` (exprToCpp — resetLayout identifier)
- Test: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write DockLayout emitter test**

In `compiler/tests/emitter.test.ts`, add:

```typescript
    it('emits DockLayout with setup function and conditional', () => {
        const output = compile(`
function App() {
  return (
    <DockSpace>
      <DockLayout>
        <DockSplit direction="horizontal" size={0.25}>
          <DockPanel>
            <Window title="Left" />
          </DockPanel>
          <DockPanel>
            <Window title="Right" />
          </DockPanel>
        </DockSplit>
      </DockLayout>
      <Window title="Left"><Text>L</Text></Window>
      <Window title="Right"><Text>R</Text></Window>
    </DockSpace>
  );
}
        `);

        expect(output).toContain('static bool g_layout_applied = false');
        expect(output).toContain('static bool g_reset_layout = false');
        expect(output).toContain('void reimgui_reset_layout()');
        expect(output).toContain('g_reset_layout = true');
        expect(output).toContain('App_setup_dock_layout(ImGuiID dockspace_id)');
        expect(output).toContain('DockBuilderRemoveNode');
        expect(output).toContain('DockBuilderSplitNode');
        expect(output).toContain('DockBuilderDockWindow("Left"');
        expect(output).toContain('DockBuilderDockWindow("Right"');
        expect(output).toContain('DockBuilderFinish');
        expect(output).toContain('if (!g_layout_applied || g_reset_layout)');
        expect(output).toContain('#include <imgui_internal.h>');
    });
```

- [ ] **Step 2: Write resetLayout test**

In `compiler/tests/emitter.test.ts`, add:

```typescript
    it('emits resetLayout as reimgui_reset_layout', () => {
        const output = compile(`
function App() {
  return (
    <DockSpace>
      <MenuBar>
        <Menu label="View">
          <MenuItem label="Reset" onPress={resetLayout} />
        </Menu>
      </MenuBar>
      <Window title="Main"><Text>Content</Text></Window>
    </DockSpace>
  );
}
        `);

        expect(output).toContain('reimgui_reset_layout()');
    });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: FAIL — DockLayout and resetLayout not handled.

- [ ] **Step 4: Add resetLayout mapping in lowering exprToCpp**

In `compiler/src/lowering.ts`, in the `exprToCpp` function, in the Identifier handler (around line 159-165), add a check for `resetLayout`:

Replace:
```typescript
    // Identifier
    if (ts.isIdentifier(node)) {
        const name = node.text;
        if (ctx.stateVars.has(name)) {
            return `${name}.get()`;
        }
        return name;
    }
```

With:
```typescript
    // Identifier
    if (ts.isIdentifier(node)) {
        const name = node.text;
        if (ctx.stateVars.has(name)) {
            return `${name}.get()`;
        }
        if (name === 'resetLayout') {
            return 'reimgui_reset_layout';
        }
        return name;
    }
```

- [ ] **Step 5: Add dock layout helpers to emitter**

In `compiler/src/emitter.ts`, add after the `emitFloat` helper (added in Task 2):

```typescript
function findDockLayout(nodes: IRNode[]): IRDockLayout | null {
    for (const node of nodes) {
        if (node.kind === 'dock_layout') return node;
    }
    return null;
}

function emitDockSetupFunction(layout: IRDockLayout, compName: string, lines: string[]): void {
    lines.push(`void ${compName}_setup_dock_layout(ImGuiID dockspace_id) {`);
    lines.push(`${INDENT}ImGui::DockBuilderRemoveNode(dockspace_id);`);
    lines.push(`${INDENT}ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_None);`);
    lines.push(`${INDENT}ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->WorkSize);`);
    lines.push('');

    let counter = 0;
    function emitDockNode(node: IRDockSplit | IRDockPanel, parentVar: string): void {
        if (node.kind === 'dock_panel') {
            for (const title of node.windows) {
                lines.push(`${INDENT}ImGui::DockBuilderDockWindow(${title}, ${parentVar});`);
            }
        } else {
            const dirRaw = node.direction.replace(/"/g, '');
            const dir = dirRaw === 'horizontal' ? 'ImGuiDir_Left' : 'ImGuiDir_Up';
            const sizeF = emitFloat(node.size);
            const firstVar = `dock_${counter++}`;
            const secondVar = `dock_${counter++}`;
            lines.push(`${INDENT}ImGuiID ${firstVar}, ${secondVar};`);
            lines.push(`${INDENT}ImGui::DockBuilderSplitNode(${parentVar}, ${dir}, ${sizeF}, &${firstVar}, &${secondVar});`);
            if (node.children.length >= 1) emitDockNode(node.children[0], firstVar);
            if (node.children.length >= 2) emitDockNode(node.children[1], secondVar);
        }
    }

    for (const child of layout.children) {
        emitDockNode(child, 'dockspace_id');
    }

    lines.push(`${INDENT}ImGui::DockBuilderFinish(dockspace_id);`);
    lines.push('}');
    lines.push('');
}
```

- [ ] **Step 6: Modify emitComponent to pre-scan and emit dock layout statics**

In `compiler/src/emitter.ts`, in the `emitComponent` function, add after the include block (after the `lines.push('');` on line 124) and before the function signature (line 128):

```typescript
    // Dock layout support: scan for IRDockLayout and emit setup function
    const dockLayout = findDockLayout(comp.body);
    if (dockLayout) {
        lines.push('#include <imgui_internal.h>');
        lines.push('');
        lines.push('static bool g_layout_applied = false;');
        lines.push('static bool g_reset_layout = false;');
        lines.push('');
        lines.push('void reimgui_reset_layout() {');
        lines.push(`${INDENT}g_reset_layout = true;`);
        lines.push('}');
        lines.push('');
        emitDockSetupFunction(dockLayout, comp.name, lines);
    }
```

- [ ] **Step 7: Add module-level currentCompName and dock_layout emitter**

In `compiler/src/emitter.ts`:

1. Add at line 10 (after `const INDENT = '    ';`):
```typescript
let currentCompName = '';
```

2. In `emitComponent`, add at line 88 (after the counter resets):
```typescript
    currentCompName = comp.name;
```

3. In `emitNode` switch, add after the `tooltip` case:
```typescript
        case 'dock_layout':
            lines.push(`${indent}if (!g_layout_applied || g_reset_layout) {`);
            lines.push(`${indent}${INDENT}${currentCompName}_setup_dock_layout(ImGui::GetID("MainDockSpace"));`);
            lines.push(`${indent}${INDENT}g_layout_applied = true;`);
            lines.push(`${indent}${INDENT}g_reset_layout = false;`);
            lines.push(`${indent}}`);
            break;
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `cd compiler && npx vitest run tests/emitter.test.ts`
Expected: All tests PASS.

- [ ] **Step 9: Run all compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 10: Commit**

```bash
git add compiler/src/emitter.ts compiler/src/lowering.ts compiler/tests/emitter.test.ts
git commit -m "feat: DockLayout emitter + resetLayout — generates DockBuilder setup function"
```

---

### Task 6: TypeScript Definitions

**Files:**
- Modify: `examples/hello/reimgui.d.ts`
- Modify: `examples/settings/reimgui.d.ts`

- [ ] **Step 1: Add new interfaces and declarations to hello/reimgui.d.ts**

In `examples/hello/reimgui.d.ts`, add after `DockSpaceProps` (line 30):

```typescript
interface DockLayoutProps { children?: any; }
interface DockSplitProps { direction: "horizontal" | "vertical"; size: number; children?: any; }
interface DockPanelProps { children?: any; }
interface ThemeProps {
  preset: "dark" | "light" | "classic";
  accentColor?: [number, number, number, number];
  windowBg?: [number, number, number, number];
  textColor?: [number, number, number, number];
  rounding?: number;
  borderSize?: number;
  spacing?: number;
  children?: any;
}
```

Add the function declarations after `DockSpace` (after line 63):

```typescript
declare function DockLayout(props: DockLayoutProps): any;
declare function DockSplit(props: DockSplitProps): any;
declare function DockPanel(props: DockPanelProps): any;
declare function Theme(props: ThemeProps): any;
```

Add the global resetLayout function (after the component declarations, before the JSX runtime module):

```typescript
declare function resetLayout(): void;
```

- [ ] **Step 2: Copy the same changes to settings/reimgui.d.ts**

Apply the exact same additions to `examples/settings/reimgui.d.ts`.

- [ ] **Step 3: Commit**

```bash
git add examples/hello/reimgui.d.ts examples/settings/reimgui.d.ts
git commit -m "feat: add DockLayout, DockSplit, DockPanel, Theme TypeScript definitions"
```

---

### Task 7: Update Hello Example App

**Files:**
- Modify: `examples/hello/App.tsx`

- [ ] **Step 1: Update App.tsx to use Theme and DockLayout**

Wrap the existing DockSpace in a Theme, and add a DockLayout inside DockSpace. Add a "Reset Layout" menu item. The exact changes depend on the current App.tsx content. The pattern:

1. Wrap `<DockSpace>` in `<Theme preset="dark" accentColor={[0.2, 0.5, 1.0, 1.0]} rounding={6}>`
2. Add a `<DockLayout>` as the first child of `<DockSpace>`, before `<MenuBar>`
3. Inside DockLayout, define splits matching the current window layout
4. Add `<MenuItem label="Reset Layout" onPress={resetLayout} />` in the View menu (or create a View menu)

Read `examples/hello/App.tsx` to determine the current window titles and layout before making changes.

- [ ] **Step 2: Build compiler**

Run: `cd compiler && npm run build`

- [ ] **Step 3: Generate C++ and verify output**

Run: `node compiler/dist/index.js examples/hello/App.tsx examples/hello/TodoItem.tsx -o build/generated`

Verify the generated `App.gen.cpp` contains:
- `begin_theme` / `end_theme` calls
- `g_layout_applied` / `g_reset_layout` statics
- `App_setup_dock_layout` function with DockBuilder calls
- `reimgui_reset_layout` function

- [ ] **Step 4: Commit**

```bash
git add examples/hello/App.tsx
git commit -m "feat: update hello example with Theme and DockLayout"
```

---

### Task 8: Build and Verify

- [ ] **Step 1: Run all compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Build compiler**

Run: `cd compiler && npm run build`

- [ ] **Step 3: Generate C++ for both examples**

Run: `node compiler/dist/index.js examples/hello/App.tsx examples/hello/TodoItem.tsx -o build/generated`
Expected: Clean generation, no errors.

- [ ] **Step 4: CMake configure and build**

Run: `cmake -B build -G "Visual Studio 17 2022" && cmake --build build --target hello_app`
Expected: Clean build. If build fails, check generated code and fix issues.

- [ ] **Step 5: Run C++ runtime tests**

Run: `cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe`
Expected: All existing tests still PASS.

- [ ] **Step 6: Delete stale imgui.ini and test the app**

Run: `rm -f build/Debug/imgui.ini`
Then manually run `build/Debug/hello_app.exe` to verify:
- Theme applies on startup (accent color visible on buttons/headers)
- Windows dock into the defined layout on first launch
- View > Reset Layout re-applies the dock layout
- User can rearrange windows after layout applies

- [ ] **Step 7: Final commit if any fixups needed**

```bash
git add -A
git commit -m "fix: build fixups for DockLayout and Theme"
```
