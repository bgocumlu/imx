# IMX Roadmap

## Phase 1: Lock the Model

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
- the `.igx` source extension is standardized
- repository layout and target boundaries are documented

## Phase 2: Native Runtime Skeleton

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

## Phase 3: Hand-Written Host Components

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

## Phase 4: TSX Frontend

Goal:

- parse TSX-like source and build an AST suitable for validation and lowering

Deliverables:

- parser or adapted frontend
- `.igx` file loading
- AST for components, props, expressions, and children
- validation for supported constructs
- initial `imx_codegen` target

Exit criteria:

- a small TSX file can be parsed and validated with clear error messages

## Phase 5: C++ Codegen

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

## Phase 6: Toolchain Integration

Goal:

- connect code generation to the normal build flow

Deliverables:

- codegen command or build tool
- generated source integration with CMake
- example application source tree

Exit criteria:

- `cmake --build` produces a working native app from TSX input

## Phase 7: API Stabilization

Goal:

- make the author-facing model predictable enough for LLM-driven generation

Deliverables:

- API examples
- component docs
- prop reference
- style reference

Exit criteria:

- example prompts produce valid code at acceptable quality

## Phase 8: ImGui-Native Expansion

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

## Phase 9: Developer Experience

Goal:

- improve iteration speed without breaking the native-first architecture

Possible deliverables:

- generated-code debug output
- source location mapping
- watch mode
- better diagnostics

Exit criteria:

- debugging and iteration feel reasonable without a JS runtime

## Phase 10: Full ImGui Coverage

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

## Phase 12: Future

Candidates (implement only when justified by real need):

- `useEffect` — lifecycle hooks for timers, periodic updates
- GPA calculator example — recreates notort in TSX with struct binding
- Child component sub-struct binding (Approach 2) — pass sub-struct references to child components
- Remote image loading — `<Image src="https://..." />` (requires networking dependency)
- Plugin APIs

Non-goals:

- **Native IR / interpreter** — contradicts "no runtime in shipped binary"
- **Hot reload** — compile-run cycle is already short enough for native apps
- **Tauri-like CLI wrapper** — IMX integrates via FetchContent, build stays CMake-native
