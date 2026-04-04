# DockLayout and Theme Design

## 1. Overview

Two new features for IMX: auto dock layout (windows dock into a predefined arrangement on first launch) and theming (preset styles with customizable overrides).

## 2. DockLayout

### New Components

**DockLayout** — child of DockSpace. Defines the initial window arrangement. Applied once on first launch via ImGui's DockBuilder API. Becomes a no-op after initial setup. User can freely rearrange after.

**DockSplit** — splits space in a direction. Children are DockPanel or nested DockSplit.

Props:
- `direction` — `"horizontal"` | `"vertical"` (required)
- `size` — 0.0-1.0, fraction allocated to the first child (required)

**DockPanel** — leaf node containing one or more Windows. Multiple Windows in the same DockPanel become tabs.

No props. Children are `<Window>` references (matched by title).

### How It Works

1. On first frame, check if dock layout has been applied (flag in runtime or check if imgui.ini has dock data)
2. If not applied, walk the DockLayout tree and call ImGui DockBuilder API:
   - `ImGui::DockBuilderRemoveNode(dockspace_id)` — clear existing layout
   - `ImGui::DockBuilderAddNode(dockspace_id)` — create fresh node
   - `ImGui::DockBuilderSetNodeSize(dockspace_id, viewport_size)`
   - For each DockSplit: `ImGui::DockBuilderSplitNode(parent_id, direction, size, &id_first, &id_second)`
   - For each DockPanel: `ImGui::DockBuilderDockWindow(window_title, node_id)` for each Window child
   - `ImGui::DockBuilderFinish(dockspace_id)`
3. Set a flag so it doesn't re-apply next frame
4. Windows render normally after layout is applied — user can rearrange freely

### Reset

Built-in `resetLayout()` function that:
1. Clears the "layout applied" flag
2. Next frame, the DockLayout tree is re-applied

Callable from TSX: `<MenuItem label="Reset Layout" onPress={resetLayout} />`

`resetLayout` is a globally declared function in the type definitions, compiled to a runtime call that sets the reset flag.

### DockLayout in the Component Tree

DockLayout is a child of DockSpace but doesn't render visible content. It's a declarative description of the layout structure. The actual Window components with their content are siblings of DockLayout inside DockSpace:

```tsx
<DockSpace>
  <DockLayout>
    <DockSplit direction="horizontal" size={0.25}>
      <DockPanel>
        <Window title="Inspector" />
        <Window title="Properties" />
      </DockPanel>
      <DockPanel>
        <Window title="Viewport" />
      </DockPanel>
    </DockSplit>
  </DockLayout>

  {/* Actual window content */}
  <Window title="Inspector"><Text>...</Text></Window>
  <Window title="Properties"><Text>...</Text></Window>
  <Window title="Viewport"><Text>...</Text></Window>
</DockSpace>
```

The Window references inside DockPanel are matched by title to the actual Window components. They're just markers for the layout — no content inside them.

### IR Representation

New IR nodes:

```
IRDockLayout    { kind: 'dock_layout', splits: IRDockSplit[] }
IRDockSplit     { kind: 'dock_split', direction: 'horizontal' | 'vertical', size: string, children: (IRDockSplit | IRDockPanel)[] }
IRDockPanel     { kind: 'dock_panel', windows: string[] }  // window titles
```

### Generated C++

The compiler generates a layout setup function:

```cpp
static bool g_layout_applied = false;

void App_setup_dock_layout(ImGuiID dockspace_id) {
    ImGui::DockBuilderRemoveNode(dockspace_id);
    ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_None);
    ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->WorkSize);

    ImGuiID left, right;
    ImGui::DockBuilderSplitNode(dockspace_id, ImGuiDir_Left, 0.25f, &left, &right);

    ImGui::DockBuilderDockWindow("Inspector", left);
    ImGui::DockBuilderDockWindow("Properties", left);  // tabs with Inspector

    ImGui::DockBuilderDockWindow("Viewport", right);

    ImGui::DockBuilderFinish(dockspace_id);
}
```

Called from the render function:
```cpp
imx::renderer::begin_dockspace();
if (!g_layout_applied) {
    App_setup_dock_layout(ImGui::GetID("MainDockSpace"));
    g_layout_applied = true;
}
```

### resetLayout

Generated as a global function:
```cpp
static bool g_reset_layout = false;

void imx_reset_layout() {
    g_reset_layout = true;
}
```

In the render function:
```cpp
if (!g_layout_applied || g_reset_layout) {
    App_setup_dock_layout(ImGui::GetID("MainDockSpace"));
    g_layout_applied = true;
    g_reset_layout = false;
}
```

The lowering maps `resetLayout` identifier to `imx_reset_layout()`.

## 3. Theme

### New Component

**Theme** — wraps DockSpace (or any content). Applies ImGui styling on begin, pops on end.

Props:
- `preset` — `"dark"` | `"light"` | `"classic"` (required)
- `accentColor` — `[r, g, b, a]` float array (optional) — tints buttons, headers, tabs, sliders, checkmarks
- `windowBg` — `[r, g, b, a]` (optional) — main window background color
- `textColor` — `[r, g, b, a]` (optional) — default text color
- `rounding` — number (optional) — corner rounding for all widgets
- `borderSize` — number (optional) — border thickness
- `spacing` — number (optional) — item spacing

### How It Works

1. `begin_theme` calls the preset function (`ImGui::StyleColorsDark()` etc.)
2. If `accentColor` is set, override these ImGui color slots: `Button`, `ButtonHovered`, `ButtonActive`, `Header`, `HeaderHovered`, `HeaderActive`, `Tab`, `TabSelected`, `TabHovered`, `SliderGrab`, `SliderGrabActive`, `CheckMark`, `FrameBg` (tinted)
3. If `windowBg` set, override `ImGuiCol_WindowBg`
4. If `textColor` set, override `ImGuiCol_Text`
5. If `rounding` set, `PushStyleVar(ImGuiStyleVar_FrameRounding)`, `WindowRounding`, `ChildRounding`, `PopupRounding`, `TabRounding`
6. If `borderSize` set, `PushStyleVar(ImGuiStyleVar_FrameBorderSize)`, `WindowBorderSize`
7. If `spacing` set, `PushStyleVar(ImGuiStyleVar_ItemSpacing)`
8. `end_theme` pops all pushed vars/colors

### IR Representation

Theme is a container in the IR:

```
IRBeginContainer { kind: 'begin_container', tag: 'Theme', props: { preset, accentColor?, ... } }
IREndContainer   { kind: 'end_container', tag: 'Theme' }
```

### Generated C++

```cpp
imx::renderer::begin_theme("dark", accentColor, windowBg, textColor, 6.0f, 1.0f, 8.0f);
// ... children ...
imx::renderer::end_theme();
```

The renderer function handles preset selection and override application.

### Future Extension

- `preset="custom"` — calls a user-registered C++ theme function via `imx::set_custom_theme(fn)`
- Custom widget registration — `imx::register_widget("Knob", fn)` with `<Custom widget="Knob" .../>` in TSX

These are deferred but the architecture supports them.

## 4. Component Registry Additions

```
DockLayout:  { hasChildren: true, isContainer: true, props: {} }
DockSplit:   { hasChildren: true, isContainer: true, props: { direction: string(required), size: number(required) } }
DockPanel:   { hasChildren: true, isContainer: true, props: {} }
Theme:       { hasChildren: true, isContainer: true, props: { preset: string(required), accentColor: style(optional), windowBg: style(optional), textColor: style(optional), rounding: number(optional), borderSize: number(optional), spacing: number(optional) } }
```

Also declare `resetLayout` as a global function in the type definitions.

## 5. Full Example

```tsx
export default function App() {
  return (
    <Theme preset="dark" accentColor={[0.2, 0.5, 1.0, 1.0]} rounding={6}>
      <DockSpace>
        <DockLayout>
          <DockSplit direction="horizontal" size={0.25}>
            <DockPanel>
              <Window title="Inspector" />
              <Window title="Properties" />
            </DockPanel>
            <DockSplit direction="vertical" size={0.7}>
              <DockPanel>
                <Window title="Viewport" />
              </DockPanel>
              <DockPanel>
                <Window title="Console" />
              </DockPanel>
            </DockSplit>
          </DockSplit>
        </DockLayout>

        <MenuBar>
          <Menu label="View">
            <MenuItem label="Reset Layout" onPress={resetLayout} />
          </Menu>
        </MenuBar>

        <Window title="Inspector">
          <Text>Inspector content</Text>
        </Window>
        <Window title="Properties">
          <Text>Properties content</Text>
        </Window>
        <Window title="Viewport">
          <Text>Viewport content</Text>
        </Window>
        <Window title="Console">
          <Text>Console content</Text>
        </Window>
      </DockSpace>
    </Theme>
  );
}
```
