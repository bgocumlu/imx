# IMX Roadmap

## Phase 1: Lock the Model (DONE)

Goal:

- freeze naming, semantics, and constraints before implementation spreads

Deliverables:

- `docs/spec.md`
- `docs/mvp.md`
- `docs/roadmap.md`

Exit criteria:

- component naming is stable enough to implement
- non-goals are explicit
- the team agrees the product is React-Native-like, not React runtime based
- the `.tsx` source extension is standardized
- repository layout and target boundaries are documented

## Phase 2: Native Runtime Skeleton (DONE)

Goal:

- create the smallest native runtime that can own component state and drive rendering

Deliverables:

- instance registry
- state slot storage for `useState`
- callback storage
- root render entrypoint
- initial `imx_runtime` target

Exit criteria:

- runtime can support one hand-written component tree without a compiler

## Phase 3: Hand-Written Host Components (DONE)

Goal:

- implement the host rendering contract for the MVP components in C++

Deliverables:

- `Window`
- `View`
- `Row`
- `Column`
- `Text`
- `Button`
- `TextInput`
- `Checkbox`
- `Separator`
- `Popup`
- initial `imx_renderer_imgui` target

Exit criteria:

- a hand-authored native test app can render and interact correctly through the runtime

## Phase 4: TSX Frontend (DONE)

Goal:

- parse TSX-like source and build an AST suitable for validation and lowering

Deliverables:

- parser or adapted frontend
- `.tsx` file loading
- AST for components, props, expressions, and children
- validation for supported constructs
- initial `imx_codegen` target

Exit criteria:

- a small TSX file can be parsed and validated with clear error messages

## Phase 5: C++ Codegen (DONE)

Goal:

- lower TSX components into generated C++ that targets the native runtime

Deliverables:

- component lowering
- prop lowering
- callback lowering
- `useState` lowering
- root app entry generation

Exit criteria:

- a TSX app compiles into generated C++ and runs in the existing native shell

## Phase 6: Toolchain Integration (DONE)

Goal:

- connect code generation to the normal build flow

Deliverables:

- codegen command or build tool
- generated source integration with CMake
- example application source tree

Exit criteria:

- `cmake --build` produces a working native app from TSX input

## Phase 7: API Stabilization (DONE)

Goal:

- make the author-facing model predictable enough for LLM-driven generation

Deliverables:

- API examples
- component docs
- prop reference
- style reference

Exit criteria:

- example prompts produce valid code at acceptable quality

## Phase 8: ImGui-Native Expansion (DONE)

Goal:

- add the real editor-grade surface area that makes the framework useful beyond demos

Priority order:

- `DockSpace`
- `MenuBar`
- `Menu`
- `MenuItem`
- `Table`
- `TreeNode`
- `CollapsingHeader`
- `TabBar`
- `TabItem`
- `SliderFloat`
- `ColorEdit`

Exit criteria:

- an editor-like sample app can be built entirely with the public API

## Phase 9: Developer Experience (DONE)

Goal:

- improve iteration speed without breaking the native-first architecture

Possible deliverables:

- generated-code debug output
- source location mapping
- watch mode
- better diagnostics

Exit criteria:

- debugging and iteration feel reasonable without a JS runtime

## Phase 10: Full ImGui Coverage (DONE)

Goal:

- map every remaining ImGui primitive so IMX can do anything ImGui can

### Batch 1: Essential Missing Primitives

- `Modal` — `BeginPopupModal` / `EndPopupModal` for blocking dialogs
- `Radio` — `RadioButton` for mutually exclusive options
- `Selectable` — clickable list items with selection state
- `Disabled` — `BeginDisabled` / `EndDisabled` to gray out sections
- `Child` — `BeginChild` / `EndChild` for scrollable sub-regions

### Batch 2: Display and Data

- `Image` — `ImGui::Image` for texture display
- `PlotLines` — simple line graph
- `PlotHistogram` — bar chart
- `ColorPicker` — full color picker (not just ColorEdit)
- `InputTextMultiline` — multi-line text editor

### Batch 3: Advanced Interaction

- `DragDropSource` — drag source for drag-and-drop
- `DragDropTarget` — drop target for drag-and-drop
- `StyleColor` — push/pop individual color overrides
- `StyleVar` — push/pop individual style var overrides
- `ID` — explicit ID scope push/pop
- `Group` — `BeginGroup` / `EndGroup`

### Batch 4: Drawing and Canvas

- `Canvas` / `DrawList` — custom drawing (lines, rects, circles, text)
- `PlotCustom` — custom plot rendering via DrawList

### Batch 5: Custom C++ Escape Hatches

- `<Theme preset="custom">` — user-registered C++ theme function
- `<Custom widget="Knob">` — user-registered C++ widget functions
- `imx::set_custom_theme(fn)` and `imx::register_widget(name, fn)` API

Exit criteria:

- every ImGui widget has a corresponding IMX component
- custom C++ widgets can be used alongside IMX components

## Phase 11: C++ Struct Binding (DONE)

Goal:

- make IMX a pure UI layer on existing C++ applications — TSX reads/writes C++ variables directly

Deliverables:

- Root component receives a C++ struct as mutable reference (`T&`)
- `value={props.field}` without `onChange` emits `&props.field` (direct pointer binding)
- `std::function` callback fields for triggering C++ actions from TSX
- Vector iteration via `.map()` with `auto&` reference binding
- `useState` coexists for UI-only state (modals, tabs, toggles)
- Template `render_root<T>(runtime, state)` overload
- `imxc init` scaffold demonstrates binding + useState together
- `imxc add` for integrating into existing CMake projects

Exit criteria:

- TSX can bind to any C++ struct field and the generated code is equivalent to hand-written ImGui
- Thread safety is the developer's responsibility (documented)

## Phase 12: Struct Binding Fixes (DONE)

Goal:

- fix edge cases in struct binding and expand compiler coverage

Deliverables:

- TextInput + InputTextMultiline struct binding (directBind syncs buffer to/from struct field)
- Custom component deep pointer propagation (chains through 3+ levels)
- DragDrop typed payloads across components
- Auto-generated map indices (`_map_idx_N` counters)

Exit criteria:

- struct binding works correctly through arbitrary component nesting
- DragDrop payloads are typed per-component

## Phase 13: Font Loading & Input Expansion (DONE)

Goal:

- font loading API and expanded input widget coverage — expose what ImGui already has

Deliverables:

- **Font loading** — `imx::load_font("path.ttf", size)` C++ helper for runtime loading from `public/`, plus `imx::load_font_embedded(data, size)` for compile-time baked fonts. Called once before main loop. `<Font>` TSX component wrapping PushFont/PopFont for per-subtree font selection.
- **Vector inputs** — `InputFloat2/3/4`, `InputInt2/3/4` for multi-component value editing
- **Vector drags** — `DragFloat2/3/4`, `DragInt2/3/4`
- **Vector sliders** — `SliderFloat2/3/4`, `SliderInt2/3/4`
- **Vertical sliders** — `VSliderFloat`, `VSliderInt`
- **SliderAngle** — specialized angle slider (degrees)
- **SmallButton** — compact button variant
- **ArrowButton** — directional arrow button
- **InvisibleButton** — invisible hitbox for custom interactions
- **ImageButton** — clickable image with full UV coordinate support
- **ColorEdit3 / ColorPicker3** — RGB-only variants (no alpha)
- **DrawList advanced** — Bezier curves (`DrawBezierCubic`, `DrawBezierQuadratic`), polylines (`DrawPolyline`), filled polygons (`DrawConvexPolyFilled`), ngons (`DrawNgon`, `DrawNgonFilled`), triangles. Extends existing Canvas drawing (DrawLine, DrawRect, DrawCircle, DrawText)
- **Hello example refresh** — docked `Phase 13` showcase window demonstrating representative inputs, button variants, color editing, vertical/angle sliders, and advanced canvas drawing
- **Doc cleanup** — historical old-extension references updated to `.tsx` in legacy Phase 1/MVP documentation

Size impact: ~0 KB (all compile to existing ImGui calls)

Exit criteria:

- every ImGui input widget has a TSX equivalent
- custom fonts can be loaded and applied per-component

## Phase 14: Layout & Positioning (DONE)

Goal:

- expose ImGui's layout primitives so TSX can achieve any layout ImGui can

Deliverables:

- **Indent / Unindent** — `<Indent width={20}>` for manual indentation control
- **Spacing** — `<Spacing />` for vertical gaps (ImGui::Dummy with zero width)
- **Dummy** — `<Dummy width={100} height={50} />` invisible placeholder
- **SameLine** — `<SameLine offset={0} spacing={10} />` explicit horizontal positioning (complements Row)
- **NewLine** — `<NewLine />` force line break
- **SetNextItemWidth** — `width` prop on input components for per-item width
- **PushTextWrapPos** — `<TextWrap width={200}>` for text wrapping boundaries
- **SetCursorPos** — `<Cursor x={100} y={50} />` for manual positioning
- **BeginMainMenuBar** — `<MainMenuBar>` for full-screen menu bar (vs Window-level `<MenuBar>`)

Size impact: ~0 KB (thin wrappers around existing ImGui calls)

Exit criteria:

- any ImGui layout achievable in raw C++ is also achievable in TSX

## Phase 15: Table & Tree Enhancements (DONE)

Goal:

- expose advanced Table and TreeNode features that ImGui provides

Deliverables:

- **Table sorting** — `sortable` flag + `onSort` callback exposing `ImGuiTableSortSpecs`
- **Table column flags** — `defaultHide`, `preferSortAscending`, `preferSortDescending`, `noResize`, `fixedWidth` props on table columns
- **Table row/cell coloring** — `bgColor` prop on `TableRow` and cells via `TableSetBgColor`
- **Table column jump** — `columnIndex` prop for jumping to specific column
- **Additional table flags** — `hideable`, `multiSortable`, `noClip`, `padOuterX`, `scrollX`, `scrollY`
- **TreeNodeEx** — extended tree node with flags: `defaultOpen`, `openOnArrow`, `openOnDoubleClick`, `leaf`, `bullet`, `noTreePushOnOpen`
- **SetNextItemOpen** — `defaultOpen` / `forceOpen` prop for programmatic tree control
- **CollapsingHeader close button** — `closable` prop with `onClose` callback
- **Child component sub-struct binding** — pass nested struct references to child components (e.g. `<Settings value={props.settings} />` where `settings` is a sub-struct of AppState)

Size impact: ~0 KB (existing ImGui API surface)

Exit criteria:

- sortable tables, advanced tree nodes, and full column control from TSX
- child components can receive sub-struct references as bound props

## Phase 16: Interaction & State Queries (DONE)

Goal:

- expose ImGui's item interaction detection so TSX components can respond to hover, focus, click, and other interaction states

Deliverables:

- **Item state callbacks** — `onHover`, `onActive`, `onFocused`, `onClicked`, `onDoubleClicked` props on interactive components. Maps to `IsItemHovered()`, `IsItemActive()`, `IsItemFocused()`, `IsItemClicked()`.
- **Context menus** — `<ContextMenu>` component wrapping `BeginPopupContextItem` / `BeginPopupContextWindow`. Right-click → menu pattern.
- **Tooltip on hover** — `tooltip` string prop on any component (calls `SetItemTooltip`)
- **Keyboard focus** — `autoFocus` prop mapping to `SetKeyboardFocusHere()`
- **Scroll control** — `scrollToHere` prop mapping to `SetScrollHereY()`
- **Keyboard input** — `<Shortcut keys="Ctrl+S" onPress={...} />` wrapping ImGui's `IsKeyChordPressed`
- **Mouse cursor** — `cursor` prop on components mapping to `SetMouseCursor()`
- **Clipboard** — `imx::clipboard_get()` / `imx::clipboard_set()` C++ API exposing ImGui/GLFW clipboard

Size impact: ~0 KB (all existing ImGui API)

Exit criteria:

- TSX components can detect and respond to all ImGui interaction states

## Phase 17: Window & Popup Control (DONE)

Goal:

- expose remaining ImGui window and popup features to TSX

Deliverables:

- **Window flags** — all `ImGuiWindowFlags` as boolean props: `noTitleBar`, `noResize`, `noMove`, `noCollapse`, `noDocking`, `noScrollbar`, `noBackground`, `alwaysAutoResize`, `noNavFocus`, `noNav`, `noDecoration`, `noInputs`, `noScrollWithMouse`, `horizontalScrollbar`, `alwaysVerticalScrollbar`, `alwaysHorizontalScrollbar`
- **Window positioning** — `x`, `y` props with `forcePosition` boolean (default `ImGuiCond_Once`, `true` for `ImGuiCond_Always`)
- **Window sizing** — `width`, `height` props with `forceSize` boolean
- **Window size constraints** — `minWidth`, `minHeight`, `maxWidth`, `maxHeight` props mapping to `SetNextWindowSizeConstraints`
- **Window background alpha** — `bgAlpha` prop mapping to `SetNextWindowBgAlpha`
- **Modal flags** — window flag boolean props on `<Modal>`: `noTitleBar`, `noResize`, `noMove`, `noScrollbar`, `noCollapse`, `alwaysAutoResize`, `noBackground`, `horizontalScrollbar`
- **Popup flags** — `mouseButton` prop on `<ContextMenu>` (`"left"`, `"right"`, `"middle"`)
- **Manual Combo** — `<Combo>` overloaded: `items` prop → simple mode, children → `BeginCombo`/`EndCombo` mode with `preview`, `noArrowButton`, `noPreview`, `heightSmall`/`heightLarge`/`heightRegular` props
- **MultiSelect** — `<MultiSelect>` wrapping `BeginMultiSelect`/`EndMultiSelect` with `boxSelect`, `boxSelect2d`, `boxSelectNoScroll`, `clearOnClickVoid`, `singleSelect`, `noSelectAll`, `noRangeSelect`, `noAutoSelect`, `noAutoClear` flags. `onSelectionChange` callback for processing `ImGuiMultiSelectIO*`. `selectionIndex` prop on `<Selectable>`. `apply_multi_select_requests()` C++ helper for bool array selection.
- **Viewport hints** — `noViewport` prop (pins window to main viewport), `viewportAlwaysOnTop` prop. C++ helpers: `get_main_viewport_pos()`, `get_main_viewport_size()`, `get_main_viewport_work_pos()`, `get_main_viewport_work_size()`
- **Hello example** — struct binding with `AppState.h` for MultiSelect demo with drag select, left-click context menu, manual combo, positioned/constrained window

Size impact: ~0 KB

Exit criteria:

- full control over window behavior and popup triggers from TSX

## Phase 18: Text & Display Variants

Goal:

- expose ImGui's text rendering variants and display helpers

Deliverables:

- **TextColored** — `<Text color={[1,0,0,1]}>` or `<TextColored color={...}>` for inline colored text
- **TextDisabled** — `<TextDisabled>` for grayed-out text
- **TextWrapped** — `<TextWrapped>` for auto-wrapping text
- **Bullet** — `<Bullet />` standalone bullet point (no text)
- **Selectable enhancements** — `spanAllColumns`, `allowDoubleClick`, `dontClosePopups` props
- **ListBox manual mode** — `<ListBox>` with `BeginListBox`/`EndListBox` for custom content (vs simple items)

Size impact: ~0 KB

Exit criteria:

- every ImGui text and display variant has a TSX equivalent

## Phase 19: Developer Experience

Goal:

- improve iteration speed and error quality for developers and LLMs writing IMX code

Deliverables:

- **DLL hot reload (debug only)** — components compile to a shared library, app reloads on change without restart. State survives because struct binding keeps state in the host exe (not the DLL). Works with both `imxc init` and `imxc add` (existing C++ projects). `imxc watch --hot` triggers recompile → DLL swap. **Release builds remain static-linked** — one exe, no DLLs, same ~745 KB as today. Debug builds add ~3-5 KB for the DLL loader. This is a CMake config switch, not a code change.
- **Better error messages** — source-mapped errors pointing to `.tsx` line numbers instead of generated C++ lines.
- **Component inspector** — debug overlay showing component tree, state values, instance IDs (debug builds only, stripped in release).
- **Real-world example apps** — non-trivial apps demonstrating C++ backend + IMX frontend pattern (GPA calculator, settings panel, log viewer).
- **LLM prompt reference updates** — keep `llm-prompt-reference.md` covering all new components so LLMs generate correct code.

Size impact: 0 KB on Release builds (all dev features are debug-only or compile-time)

Exit criteria:

- changing a TSX file and seeing the result takes under 2 seconds with state preserved
- error messages point to the correct TSX source line
- at least one real-world example app beyond demos

## Phase 20: Project Templates

Goal:

- provide well-designed starter templates via `imxc init` that scaffold common C++ backend patterns — IMX the library is unchanged, templates are just generated user code

Note: templates are `.js` files in the `imxc` CLI package. They generate `main.cpp`, `AppState.h`, `CMakeLists.txt` with appropriate libraries. The TSX side is identical across all templates. None of this affects IMX as a library — it's purely scaffolding.

Deliverables:

- **Interactive template selector** — `imxc init my_app` shows a CLI menu to pick a template (or `imxc init my_app --template=networking` to skip menu)
- **`minimal` template** — current default, bare ImGui app. Just IMX + GLFW + OpenGL. (~745 KB)
- **`networking` template** — adds HTTP client scaffolding. WinHTTP on Windows, libcurl on Linux/macOS. `AppState` has example fetch callback, `main.cpp` shows async request pattern with `std::thread` + `request_frame()` on completion. CMakeLists adds the platform HTTP library.
- **`persistence` template** — adds JSON save/load scaffolding. FetchContent for nlohmann/json (single-header). `AppState` has `save()` / `load()` methods, `main.cpp` loads state on startup and saves on exit. File path uses platform app data directory (`%APPDATA%`, `~/Library/Application Support`, `~/.config`).
- **`async` template** — adds background task scaffolding. Simple thread pool in `async.h`, `main.cpp` shows dispatching work and updating `AppState` on completion with `request_frame()`. No external dependency (pure `std::thread` + `std::future`).
- **`system` template** — adds OS integration scaffolding. Native file dialog (Win32 `IFileDialog` / GTK / Cocoa), system tray icon (Win32 `Shell_NotifyIcon` / NSStatusItem), native notifications, GLFW file drop callback wired to `AppState`. Platform-specific code behind `#ifdef _WIN32` / `__APPLE__` / `__linux__`.
- **`full` template** — combines networking + persistence + async + system. Complete desktop app starter with all backend patterns wired together.
- **`custom` template** — interactive picker: choose which backend features to include (checkboxes for networking, persistence, async, system). Generates a combined template with only selected features.

Each template includes:

- Commented `main.cpp` explaining the pattern
- `AppState.h` with example fields and callbacks for the template's features
- `CMakeLists.txt` with correct FetchContent / platform libraries
- `App.tsx` demonstrating the template's features from the TSX side
- A `README.md` explaining the architecture and how to extend it

Size impact on IMX: 0 KB — templates are JS in the CLI, not compiled into the library

Exit criteria:

- `imxc init` offers template selection with clear descriptions
- each template builds and runs out of the box on Windows, macOS, and Linux
- a developer can go from `imxc init my_app --template=full` to a working desktop app with networking, persistence, and system integration in under 5 minutes

## Future Candidates

Implement only when justified by real need:

- **Plugin/extension API** — third-party component packages
- **Cross-compilation** — build Windows/macOS/Linux from single machine

## Non-goals

- **React lifecycle hooks (useEffect, useInit, etc.)** — ImGui is immediate mode; TSX is a pure UI layer. Initialization, cleanup, and side effects belong in C++ where the data lives.
- **Platform/OS APIs (file dialogs, tray, notifications, networking, persistence)** — IMX is a frontend. The C++ backend handles platform integration. IMX wraps ImGui, not the OS.
- **Native IR / interpreter** — contradicts "no runtime in shipped binary"
- **Tauri-like CLI wrapper** — IMX integrates via FetchContent, build stays CMake-native
- **Embedded JS/Lua runtime** — defeats the purpose, adds 500 KB+ for no benefit

