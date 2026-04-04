# ReImGui Specification

## 1. Purpose

ReImGui is a native UI framework and toolchain for writing Dear ImGui applications in a React-Native-like style.

The source language should be easy for humans and LLMs to generate because it looks like component-based TSX. The shipped application should remain a lightweight native binary with no embedded JavaScript runtime.

The core model is:

`TSX-like source -> compiler/codegen -> native runtime -> Dear ImGui`

This is not a browser framework, not a DOM renderer, and not a JavaScript app shell.

## 2. Product Goal

The product goal is to let developers and LLMs author native ImGui apps using a declarative, component-based syntax that feels close to React Native while preserving the performance, simplicity, and platform reach of a native ImGui application.

The framework should make it natural to express:

- windows
- menus
- dockspaces
- forms
- inspectors
- tables
- trees
- popups
- toolbars
- editor-like layouts

It should also make the underlying ImGui semantics obvious enough that generated code stays correct.

## 3. Non-Goals

ReImGui explicitly does not aim to be:

- a React clone
- a browser DOM clone
- an HTML renderer
- a CSS engine
- a React Native compatibility layer
- a generic retained widget toolkit
- a JavaScript-first app runtime

ReImGui may borrow ideas, names, and ergonomics from React Native, but the runtime semantics are native and ImGui-oriented.

## 4. Core Principles

### 4.1 React-Native-Like Authoring

Authoring should look close enough to React Native that LLMs can infer structure, props, and events from prior React knowledge.

Examples:

- function components
- JSX or TSX syntax
- props and children
- conditional rendering
- list rendering with keys
- limited hook support
- style objects for simple layout and appearance

### 4.2 ImGui-Native Semantics

The host platform is Dear ImGui, so the API must expose ImGui-shaped concepts rather than hiding them behind fake HTML.

Examples:

- `Window`
- `DockSpace`
- `MenuBar`
- `Menu`
- `MenuItem`
- `Table`
- `TreeNode`
- `Popup`
- `CollapsingHeader`

### 4.3 Native Runtime First

The final shipped binary must not require a JavaScript runtime.

That means:

- no bundled JS VM in the shipping app
- no React runtime in the shipping app
- no bridge layer between JS and C++ in the shipping app

Any JSX or TSX is compiled ahead of time into generated native code or a compact native intermediate representation.

### 4.4 Immediate-Mode Friendly

The framework must respect the frame-by-frame nature of ImGui rather than forcing retained-widget assumptions onto it.

This means:

- rendering still happens each frame
- UI is re-emitted from current state each frame
- app state is owned by the application runtime, not by hidden widgets
- event handling maps cleanly to immediate ImGui interactions

### 4.5 LLM-Oriented Surface Area

The public API should be easy for an LLM to infer and hard to misuse.

This means:

- small number of core primitives
- consistent prop names
- clear event names
- minimal magic
- explicit layout containers
- honest platform semantics

## 5. Mental Model

ReImGui should be understood as a declarative front end for an immediate-mode backend.

The author writes:

```tsx
function App() {
  const [count, setCount] = useState(0);

  return (
    <Window title="Hello">
      <View style={{ padding: 12, gap: 8 }}>
        <Text>Count: {count}</Text>
        <Button title="Increment" onPress={() => setCount(count + 1)} />
      </View>
    </Window>
  );
}
```

The compiled/runtime model does not create a retained native widget tree like Qt, WPF, or UIKit. Instead, it produces native logic that emits Dear ImGui calls every frame from the current application state.

Conceptually:

`component source -> normalized UI tree or generated frame function -> ImGui calls`

The author gets a retained-feeling programming model. The renderer remains immediate.

## 6. Runtime Model

### 6.1 Runtime Ownership

The native runtime owns:

- application state slots
- component instance identity
- stable key resolution
- scheduling and invalidation
- event dispatch
- navigation and focus helpers where implemented
- style resolution

Dear ImGui owns:

- active and hovered item tracking
- internal widget interaction state
- window persistence where enabled
- docking and viewport internals
- draw command generation

### 6.2 Rendering

Each frame:

1. begin a new ImGui frame
2. execute the root render entrypoint
3. evaluate components against the current runtime state
4. emit Dear ImGui commands
5. collect interaction results
6. queue and apply state updates according to runtime rules
7. render Dear ImGui draw data

### 6.3 State

State is still required. Immediate mode does not remove state; it changes where state lives.

ReImGui state should be split into:

- application state
- component-local state where supported
- ephemeral ImGui-managed interaction state

Application state includes:

- current document
- selection
- active tool
- open panels
- form data
- loaded resources

ImGui-managed interaction state includes:

- hovered item
- active item
- current focus
- some tree and window internals

### 6.4 Invalidation

The runtime should prefer simple invalidation semantics:

- a state update marks the root dirty
- the next frame re-evaluates from the root

Fine-grained partial rendering is not required for the first design. Simplicity is preferred over aggressive optimization.

## 7. Source Language

### 7.1 Syntax Choice

The preferred authoring syntax is TSX-like syntax.

Reasons:

- familiar to LLMs
- familiar to developers who know React or React Native
- easy to express tree structure
- easy to express props and inline event handlers

The project may later support a builder API in C++, but the canonical authoring model should be TSX-like.

### 7.2 Source File Extension

The canonical source file extension is `.igx`.

Examples:

- `App.igx`
- `Inspector.igx`
- `SettingsPanel.igx`

Reasons:

- short and easy to read
- visually distinct from standard React `.tsx`
- keeps the ImGui identity visible
- avoids implying standard React or browser tooling semantics

Generated output should use native source file names such as:

- `App.gen.cpp`
- `Inspector.gen.cpp`

### 7.3 Editor Tooling and Highlighting

`.igx` files will not have universal editor support by default, so the initial tooling rule is:

- treat `.igx` as TSX or TypeScript React in the editor

Example editor mapping:

```json
{
  "files.associations": {
    "*.igx": "typescriptreact"
  }
}
```

The source language should remain close enough to TSX that this mapping provides usable syntax highlighting and editing support.

Custom syntax highlighting can be added later if the language diverges enough to justify dedicated tooling.

### 7.4 Components

Components are primarily function components.

Example:

```tsx
function Inspector(props: { selectedId: string | null }) {
  if (!props.selectedId) {
    return <Text>No selection</Text>;
  }

  return (
    <Window title="Inspector">
      <Text>Selected: {props.selectedId}</Text>
    </Window>
  );
}
```

Class components are out of scope.

### 7.5 Props

Props should be plain serializable values or known runtime callback references.

Allowed prop categories:

- strings
- numbers
- booleans
- enums
- arrays
- objects
- style objects
- callbacks
- opaque native handles where explicitly supported

### 7.6 Children

Children follow standard component tree semantics.

Components may accept:

- zero children
- one child
- multiple children
- renderable arrays

### 7.7 Conditionals and Lists

The language should support:

- `condition ? <A /> : <B />`
- `condition && <A />`
- `items.map(item => <Row key={item.id} />)`

Keys are required for stable identity in repeated siblings.

## 8. State Model

### 8.1 Requirement

State is necessary, but the framework should keep the model smaller and clearer than full React.

### 8.2 MVP State Primitive

The MVP should support `useState`.

Example:

```tsx
const [open, setOpen] = useState(false);
```

This should compile into native per-instance state slots managed by the runtime.

### 8.3 Optional Future Primitives

Potential later primitives:

- `useRef`
- `useMemo`
- `useReducer`
- `useEffect`
- context

These should only be added if they map cleanly to native runtime semantics and produce clear value.

### 8.4 Effect Semantics

Effects are not required in the earliest implementation.

If effects are added, they must have strict native semantics documented separately:

- when they run relative to a frame
- when cleanup runs
- whether they may trigger synchronous updates
- thread rules

### 8.5 Recommended App State Shape

The framework should encourage explicit state ownership for editor-style apps.

Preferred patterns:

- root-level model objects
- explicit stores
- action-based updates
- derived values computed from state

Discouraged patterns:

- deeply hidden state for app-critical data
- implicit DOM-like form state
- uncontrolled platform-specific side effects

## 9. Component Taxonomy

The public API should be split into layers.

### 9.1 Foundation Layer

These are React-Native-like primitives that make generated code familiar.

- `View`
- `Text`
- `Button`
- `TextInput`
- `Image`
- `ScrollView`

### 9.2 ImGui Native Layer

These expose actual Dear ImGui concepts.

- `Window`
- `Child`
- `Separator`
- `SameLine`
- `Group`
- `MenuBar`
- `Menu`
- `MenuItem`
- `Table`
- `TabBar`
- `TabItem`
- `TreeNode`
- `CollapsingHeader`
- `Popup`
- `Modal`
- `Tooltip`
- `DockSpace`

### 9.3 Input Layer

- `Checkbox`
- `Radio`
- `Selectable`
- `SliderInt`
- `SliderFloat`
- `DragInt`
- `DragFloat`
- `InputInt`
- `InputFloat`
- `ColorEdit`
- `Combo`
- `ListBox`

### 9.4 Advanced Layer

These are not required for the first MVP but are legitimate future host components.

- `ProgressBar`
- `PlotLines`
- `PlotHistogram`
- `DragDropSource`
- `DragDropTarget`
- `Disabled`
- `StyleColor`
- `StyleVar`
- `ID`
- `Canvas`
- `DrawList`

## 10. Naming Rules

### 10.1 General Rule

Use React-Native-like names for general layout and text primitives. Use ImGui-native names for ImGui-native capabilities.

Examples:

- use `View`, not `div`
- use `Text`, not `span`
- use `TextInput`, not `input`
- use `Window`, not `Screen`
- use `MenuBar`, not `TopNav`
- use `DockSpace`, not fake layout wrappers

### 10.2 Event Names

Use familiar but platform-honest names:

- `onPress`
- `onChange`
- `onValueChange`
- `onSelect`
- `onOpen`
- `onClose`
- `onFocus`
- `onBlur`

Do not emulate browser DOM event bubbling unless explicitly designed.

## 11. Styling Model

### 11.1 Goal

Styling should feel familiar to React Native without pretending to be CSS.

### 11.2 Style Objects

Components may accept a `style` prop with a constrained set of style fields.

Examples:

- `padding`
- `paddingHorizontal`
- `paddingVertical`
- `margin`
- `gap`
- `width`
- `height`
- `minWidth`
- `minHeight`
- `align`
- `justify`
- `backgroundColor`
- `textColor`
- `fontSize`
- `fontWeight`
- `wrap`

### 11.3 Layout

Layout should be explicit and limited.

Two valid approaches:

- dedicated layout components like `Row` and `Column`
- `View` with directional layout props

The system should choose one primary style to avoid ambiguity.

Preferred direction for MVP:

- `View`
- `Row`
- `Column`

This is clearer for LLMs than overloading one component too heavily.

### 11.4 Non-Goals for Styling

The styling system should not attempt to implement:

- browser CSS cascade
- selector matching
- flexbox parity
- grid parity
- percentage layout rules identical to web engines
- arbitrary positioning semantics identical to HTML/CSS

## 12. Identity and Keys

Stable identity is essential because Dear ImGui relies heavily on IDs and because the runtime needs persistent component state slots.

Rules:

- sibling lists should use explicit `key`
- host components may derive ImGui IDs from explicit props, keys, and runtime paths
- labels must be separated from internal IDs where necessary

The framework should offer a way to keep visible labels and internal IDs distinct.

Example:

```tsx
<Button id="save-button" title="Save" onPress={saveDocument} />
```

or

```tsx
<Button key="save" title="Save" onPress={saveDocument} />
```

## 13. Text and Input Semantics

Text inputs and other interactive controls must have explicit update semantics.

Recommended shape:

```tsx
<TextInput value={name} onChange={setName} />
```

or:

```tsx
<TextInput value={name} onValueChange={setName} />
```

The spec should avoid ambiguous uncontrolled input behavior in the MVP.

Preferred approach:

- controlled inputs first
- uncontrolled inputs only if there is a clear native benefit

## 14. Compilation Model

### 14.1 Overview

The toolchain compiles TSX-like input into native artifacts.

Possible internal targets:

- generated C++
- generated C++ plus metadata
- a compact IR interpreted by a native runtime

The external guarantee is the same:

- no JS runtime in the shipped app
- native rendering through Dear ImGui

### 14.2 Recommended Initial Strategy

Use code generation to C++ for the earliest implementation.

Reasons:

- simplest to debug
- easiest to inspect generated output
- easiest to integrate into the existing CMake native app
- good fit for the current repository shape

### 14.3 Future Alternative

A native IR may be added later if:

- compile times become a problem
- hot reload becomes desirable
- codegen becomes difficult to optimize

This is an implementation detail and should not leak into the author-facing model.

## 15. Native Runtime Architecture

The runtime should include:

- component instance registry
- state slot storage
- key and identity resolution
- callback binding
- style resolver
- host component renderer
- frame scheduler

Potential modules:

- `runtime/instance_registry`
- `runtime/state_store`
- `runtime/callbacks`
- `runtime/style`
- `runtime/render_context`
- `renderer/imgui_renderer`

## 15.1 Repository Layout

The repository should evolve into a library-style project with a compiler tool and example apps.

Recommended top-level layout:

- `include/reimgui/`
- `runtime/`
- `renderer/`
- `compiler/`
- `examples/`
- `docs/`

Suggested responsibilities:

- `include/reimgui/`
  public headers for the runtime API, host component API, and generated-code integration points
- `runtime/`
  component instance tracking, state slots, callback storage, render context, scheduling, and runtime helpers
- `renderer/`
  Dear ImGui host component implementations and style-to-ImGui mapping
- `compiler/`
  `.igx` parsing, validation, lowering, and C++ code generation
- `examples/`
  sample apps, integration demos, and eventually LLM-oriented reference examples
- `docs/`
  product spec, MVP scope, roadmap, component reference, and implementation notes

## 15.2 Build Targets

The project should be structured around a small number of explicit build targets.

Recommended targets:

- `reimgui_runtime`
- `reimgui_renderer_imgui`
- `reimgui_codegen`
- one or more example app targets

Responsibilities:

- `reimgui_runtime`
  native runtime library with state management, identity, callbacks, and render orchestration
- `reimgui_renderer_imgui`
  Dear ImGui renderer and host component layer built on top of `reimgui_runtime`
- `reimgui_codegen`
  tool or executable that reads `.igx` files and writes `*.gen.cpp`
- example app targets
  native apps that link the runtime and renderer and compile generated output

## 15.3 Responsibility Boundaries

The boundaries between the major parts should stay strict.

`reimgui_runtime` should own:

- component instance identity
- state slots such as `useState`
- callback binding
- render context
- runtime scheduling and invalidation

`reimgui_renderer_imgui` should own:

- host component rendering
- mapping public components to Dear ImGui calls
- style interpretation where it directly affects Dear ImGui rendering

`reimgui_codegen` should own:

- `.igx` parsing
- semantic validation
- lowering author code into generated native code

The compiler should not own runtime behavior. The runtime should not parse source files. The renderer should not own application compilation concerns.

## 16. Host Rendering Contract

Each host component must define:

- supported props
- child policy
- rendering behavior
- interaction behavior
- state interaction, if any
- ImGui mapping

Example rendering contract:

### `Window`

Purpose:

- creates an ImGui window

Core props:

- `title`
- `open`
- `onClose`
- `flags`
- `style`

Mapping:

- `ImGui::Begin(...)`
- render children
- `ImGui::End()`

### `Button`

Purpose:

- clickable action control

Core props:

- `title`
- `onPress`
- `disabled`

Mapping:

- `ImGui::Button(...)`
- on activation call native callback

## 17. Platform Layer

Dear ImGui still requires a platform and renderer backend. ReImGui does not remove this requirement.

The current repository uses:

- GLFW for windowing and input
- OpenGL 3 for rendering

The framework should treat this as replaceable infrastructure beneath the UI layer.

Possible future backends:

- SDL
- Win32
- Vulkan
- DirectX
- Metal

This is separate from the declarative authoring model.

## 17.1 Future-Proofing Rule

The initial implementation may target GLFW plus OpenGL only.

That is acceptable and preferred for early implementation speed.

However, the framework core must preserve clean seams for future backend expansion.

Required design constraints:

- do not expose GLFW types in public ReImGui runtime headers
- keep backend-specific windowing and graphics setup in the app shell or example target
- do not make the compiler depend on GLFW
- do not make component semantics depend on GLFW-specific behavior
- treat backend abstraction as deferred work, but keep the current implementation compatible with adding it later

In practice, this means:

- the current repository may use GLFW in `main.cpp` or example apps
- `reimgui_runtime` should remain backend-agnostic
- `reimgui_renderer_imgui` should remain focused on Dear ImGui rendering rather than platform ownership

This keeps the initial design pragmatic without locking the framework permanently to GLFW.

## 18. Relationship to the Current Repository

The current repository already has the correct low-level render loop shape in [main.cpp](C:\Users\Berkay\Downloads\reimgui\main.cpp).

The future framework should integrate by replacing hardcoded UI calls with a generated or runtime-driven root render entrypoint.

Conceptually, this:

```cpp
ImGui::Begin("Hello");
ImGui::Text("Hello, world");
ImGui::End();
```

becomes something like:

```cpp
reimgui::render_root(app_runtime);
```

The existing backend setup, docking setup, viewport support, and frame loop remain valid infrastructure.

## 19. Error Model

The framework should fail clearly when the author uses unsupported constructs.

Compile-time errors should cover:

- unsupported components
- unsupported props
- invalid child placement
- missing required props
- unsupported hooks
- missing keys in required repeated contexts where detectable

The runtime should avoid silent fallback behavior.

## 20. Debuggability

Generated or compiled output should remain inspectable.

Preferred features:

- readable generated C++
- source location mapping where practical
- clear compile errors referencing source TSX
- host component trace logging in debug builds

This matters because LLM-generated code will need fast debugging loops.

## 21. Performance Goals

Performance priorities:

- low runtime overhead
- minimal allocations per frame
- native callback dispatch
- no embedded JS VM in shipping builds
- preserve Dear ImGui responsiveness

The framework should bias toward simple code generation and explicit runtime data over complicated abstraction layers.

## 22. Security and Safety Constraints

The framework should avoid dynamic execution in shipped apps.

That means:

- no runtime `eval`
- no dynamic JS scripting dependency in shipping binaries
- no opaque plugin execution model in the initial design

## 23. Desired Author Experience

The desired author experience is:

- write TSX-like native UI code
- read the code like React Native
- think in terms of native ImGui capabilities
- compile to a native binary
- debug in C++ terms when needed

The desired LLM experience is:

- predictable components
- predictable props
- familiar composition patterns
- low ambiguity about layout and host behavior

## 24. Canonical Position

ReImGui should be described as:

`A React-Native-like authoring model for Dear ImGui that compiles to a native runtime.`

It should not be described as:

- React for ImGui
- HTML for ImGui
- a virtual DOM for ImGui

Those phrases are useful for intuition, but they are not the intended product definition.

## 25. Open Design Questions

These questions remain open and should be answered during implementation:

- whether the first compiler target is generated C++ or a native IR
- whether `useEffect` is worth supporting at all
- whether `View` should handle directional layout or whether `Row` and `Column` should be separate mandatory primitives
- how much style support is needed before the API becomes ambiguous
- how strongly labels and IDs should be separated in the public API
- how much of ImGui's advanced surface should be first-class versus escape-hatch APIs

## 26. Acceptance Criteria

The architecture is on target if all of the following are true:

- the source looks close to React Native
- the shipped app contains no JavaScript runtime
- the runtime is native C++
- the renderer emits Dear ImGui calls each frame
- ImGui-native concepts like windows, docking, menus, tables, and trees are first-class
- LLMs can reliably generate valid UI code from the public API
- the system remains simpler than embedding real React
