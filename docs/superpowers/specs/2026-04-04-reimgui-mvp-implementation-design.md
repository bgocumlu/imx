# IMX MVP Implementation Design

## 1. Overview

This document specifies the implementation design for the IMX MVP (Phases 2-6 of the roadmap). The goal is to enable LLMs and developers to author native Dear ImGui applications using React-Native-like TSX syntax that compiles to native C++ with no JavaScript runtime in the shipped binary.

The pipeline: `.tsx` (TSX-like source) -> TypeScript compiler -> generated C++ -> native ImGui app.

## 2. Architecture

Four layers:

1. **Compiler** (TypeScript, dev-time only) — parses `.tsx` files, validates, emits `.gen.cpp`
2. **Runtime** (`imx_runtime`, C++) — component instances, state slots, callbacks, lifecycle, style structs
3. **Renderer** (`imx_renderer_imgui`, C++) — host component functions that map to ImGui calls, style-to-ImGui resolution, layout via child regions
4. **App shell** (C++) — existing GLFW/OpenGL frame loop, calls `imx::render_root()`

### Data flow each frame

```
App shell -> NewFrame -> runtime.render_root()
  -> calls generated App_render()
    -> generated code calls runtime for state/callbacks
    -> generated code calls renderer for host components
    -> renderer emits ImGui calls
-> ImGui::Render -> SwapBuffers
```

The compiler is completely separate — it runs before build, knows nothing about the runtime internals, and outputs plain C++ that `#include`s the runtime/renderer headers.

## 3. Compiler Design

**Language:** TypeScript, using the TS compiler API for parsing.

**Input:** `.tsx` files (syntactically valid TSX).

**Output:** `*.gen.cpp` files + one `app_root.gen.cpp` entry point.

### Type checking strategy

Parse-only initially. The TS compiler API parses `.tsx` as TSX to produce an AST. Validation is custom (the compiler checks component names, prop types, hook usage). `.d.ts` type definitions for IDE autocomplete and type-checking will be added later.

### Pipeline stages

1. **Parse** — TS compiler API parses `.tsx` as TSX -> AST
2. **Validate** — walk AST, check: only allowed components, required props present, `useState` only at top level, `key` on mapped elements
3. **Lower** — transform AST into an intermediate representation of render operations (component calls, state slot access, conditionals, list maps)
4. **Emit** — generate C++ render functions from the IR

### What the compiler knows at compile time

- Every `useState` call -> assigns fixed slot indices (0, 1, 2...)
- Every component in the tree -> positional identity path
- Every `key` prop -> stable identity override
- Every callback body -> C++ lambda body
- Every expression type -> correct printf format specifier or `std::to_string`

### Error reporting

Simple text errors with file, line, and column:

```
App.tsx:12:5 - error: <Slider> is not a supported component
App.tsx:8:20 - error: Button requires 'onPress' prop
```

### Multi-component support

- Each `.tsx` file produces one `.gen.cpp` with its render function
- Imports resolve to generated function calls: `<TodoItem />` -> `TodoItem_render(ctx, props)`
- Props are passed as generated structs
- `key` on mapped elements -> `ctx.begin_instance("TodoItem", key)` for stable identity
- The compiler processes all `.tsx` files in the project together to validate cross-file references

## 4. Runtime Design (`imx_runtime`)

### Core types

**`ComponentInstance`** — represents one live instance of a component. Owns:
- State slots: array of `std::any`, indexed by compiler-assigned slot index
- Callback registry: `std::vector<std::function<void()>>`
- Persistent buffers: for TextInput sync
- Child instance map: keyed by position or explicit key
- Mounted flag

**`RenderContext`** — passed to every generated render function. Provides:
- `use_state<T>(initial, slot_index)` — returns reference to state slot
- `register_callback(fn)` -> callback ID
- `begin_instance(type_name, position_or_key)` / `end_instance()` — push/pop instance scope for nested components
- `get_buffer(id)` — persistent string buffer for TextInput

**`InstanceRegistry`** — owns all live `ComponentInstance` objects. Tracks them by identity path (parent + position/key). Handles mount (create new instance) and unmount (detect instances not visited this frame -> cleanup).

**`StateSlot`** — templated accessor wrapping `std::any` inside a `ComponentInstance`. `get()` returns current value, `set(value)` updates and marks root dirty.

### State identity model

Compiler-assigned slot indices. Each `useState` call in a component gets a fixed numeric index at compile time (0, 1, 2...). No runtime tracking of call order needed. The "rules of hooks" are enforced by the compiler.

### Component instance identity

Hybrid model:
- Positional by default — each instance identified by its position in the component tree
- Key-based when `key` prop is provided — stable identity across reorders
- Compiler enforces `key` on `.map()` results

### Callback handling

Stored `std::function` objects in the runtime callback registry. For ImGui widgets that return interaction results (Button, Checkbox), the generated code inlines the check:

```cpp
if (imx::renderer::button("Save")) {
    ctx.invoke_callback(callback_id);
}
```

Stored callbacks support future patterns: deferred actions, async operations, Popup onClose, Menu onSelect.

### TextInput buffer management

Runtime-owned persistent buffers per TextInput instance. Each frame:
1. Sync state value into buffer
2. Pass buffer to `ImGui::InputText`
3. If modified, sync buffer back to state via `onChange`

This preserves the React controlled-input contract (state is truth, buffer is rendering detail) while avoiding per-frame allocations.

### Lifecycle

- **Mount** — first time an instance identity is seen, allocate `ComponentInstance`, run state initializers
- **Render** — every frame, generated code calls `use_state`/`register_callback` against the current instance
- **Unmount** — after a frame completes, any instance not visited this frame is destroyed

### Invalidation

Simple: any `set()` call marks a global dirty flag. Next frame re-renders from root. No partial updates in MVP.

## 5. Renderer Design (`imx_renderer_imgui`)

### Host component functions

```
imx::renderer::begin_window(title, style?) / end_window()
imx::renderer::begin_row(style?) / end_row()
imx::renderer::begin_column(style?) / end_column()
imx::renderer::begin_view(style?) / end_view()
imx::renderer::text(content, style?)
imx::renderer::button(title, style?) -> bool (clicked)
imx::renderer::text_input(label, buffer, style?) -> bool (changed)
imx::renderer::checkbox(label, value, style?) -> bool (changed)
imx::renderer::separator()
imx::renderer::begin_popup(id, style?) / end_popup()
imx::renderer::open_popup(id)
```

### MVP component set

- `Window` — `ImGui::Begin` / `ImGui::End`
- `View` — vertical child region (alias for Column behavior)
- `Row` — horizontal child region with cursor math
- `Column` — vertical child region with gap support
- `Text` — `ImGui::Text` with printf-style formatting
- `Button` — `ImGui::Button`, returns click state
- `TextInput` — `ImGui::InputText` with persistent buffer
- `Checkbox` — `ImGui::Checkbox`
- `Separator` — `ImGui::Separator`
- `Popup` — `ImGui::BeginPopup` / `ImGui::EndPopup`

### Layout model

- `Row` -> `ImGui::BeginChild()` with a generated ID, tracks cursor X position, advances by child width + gap after each child
- `Column` -> `ImGui::BeginChild()`, default vertical flow, advances cursor Y by gap after each child
- `View` -> same as `Column` (vertical default, matching both ImGui and React Native)

### Style resolution

Runtime style resolver in the renderer layer. Styles are passed as structs with `std::optional` fields (unset = ImGui default).

Mapping:
- `padding` -> `ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ...)` on child regions
- `gap` -> cursor offset between children, managed by Row/Column
- `width` / `height` -> child region size
- `minWidth` / `minHeight` -> size constraints for `BeginChild`
- `backgroundColor` -> `ImGui::PushStyleColor(ImGuiCol_ChildBg, ...)`
- `textColor` -> `ImGui::PushStyleColor(ImGuiCol_Text, ...)`
- `fontSize` -> `SetWindowFontScale`

## 6. Generated Code Shape

### Single component example

Input (`App.tsx`):
```tsx
function App() {
  const [name, setName] = useState("Berkay");
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(0);

  return (
    <Window title="Hello">
      <Column gap={8} style={{ padding: 12 }}>
        <Text>Hello {name}</Text>
        <TextInput value={name} onChange={setName} />
        <Checkbox label="Enabled" value={enabled} onChange={setEnabled} />
        <Row gap={8}>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <Text>Count: {count}</Text>
        </Row>
        {enabled && <Text>Status: active</Text>}
      </Column>
    </Window>
  );
}
```

Output (`App.gen.cpp`):
```cpp
#include <imx/runtime.h>
#include <imx/renderer.h>

void App_render(imx::RenderContext& ctx) {
    auto& name = ctx.use_state<std::string>("Berkay", 0);
    auto& enabled = ctx.use_state<bool>(true, 1);
    auto& count = ctx.use_state<int>(0, 2);

    imx::renderer::begin_window("Hello");
    imx::renderer::begin_column({.gap = 8, .padding = 12});

    imx::renderer::text("Hello %s", name.get().c_str());

    auto& name_buf = ctx.get_buffer(0);
    name_buf.sync_from(name.get());
    if (imx::renderer::text_input("##name", name_buf)) {
        name.set(name_buf.value());
    }

    {
        bool enabled_val = enabled.get();
        if (imx::renderer::checkbox("Enabled", &enabled_val)) {
            enabled.set(enabled_val);
        }
    }

    imx::renderer::begin_row({.gap = 8});
    if (imx::renderer::button("Increment")) {
        count.set(count.get() + 1);
    }
    imx::renderer::text("Count: %d", count.get());
    imx::renderer::end_row();

    if (enabled.get()) {
        imx::renderer::text("Status: active");
    }

    imx::renderer::end_column();
    imx::renderer::end_window();
}
```

### Root entry point (`app_root.gen.cpp`):
```cpp
#include <imx/runtime.h>
void App_render(imx::RenderContext& ctx);

void imx::render_root(imx::Runtime& runtime) {
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0);
    App_render(ctx);
    ctx.end_instance();
    runtime.end_frame();
}
```

### Multi-component example

Input (`TodoItem.tsx`):
```tsx
function TodoItem(props: { text: string, done: boolean, onToggle: () => void }) {
  return (
    <Row gap={8}>
      <Checkbox value={props.done} onChange={props.onToggle} />
      <Text>{props.text}</Text>
    </Row>
  );
}
```

Output (`TodoItem.gen.cpp`):
```cpp
#include <imx/runtime.h>
#include <imx/renderer.h>

struct TodoItem_Props {
    std::string text;
    bool done;
    std::function<void()> onToggle;
};

void TodoItem_render(imx::RenderContext& ctx, const TodoItem_Props& props) {
    imx::renderer::begin_row({.gap = 8});
    bool done_val = props.done;
    if (imx::renderer::checkbox("##done", &done_val)) {
        props.onToggle();
    }
    imx::renderer::text("%s", props.text.c_str());
    imx::renderer::end_row();
}
```

### List rendering example

Input:
```tsx
{items.map(item => (
  <TodoItem key={item.id} text={item.text} done={item.done}
    onToggle={() => toggleItem(item.id)} />
))}
```

Output:
```cpp
for (size_t i = 0; i < items.size(); ++i) {
    auto& item = items[i];
    ctx.begin_instance("TodoItem", item.id);  // key-based identity
    TodoItem_render(ctx, {
        .text = item.text,
        .done = item.done,
        .onToggle = [&]{ toggleItem(item.id); }
    });
    ctx.end_instance();
}
```

The compiler transforms `.map()` into a `for` loop with `begin_instance`/`end_instance` using the `key` prop for stable identity.

### Integration with existing app shell

The existing `main.cpp` replaces the hardcoded UI section with:
```cpp
imx::Runtime runtime;
// ... in render_frame():
imx::render_root(runtime);
```

The existing backend setup, docking, viewport support, and frame loop remain unchanged.

## 7. Build Integration

### Repository layout

```
imx/
  include/imx/
    runtime.h
    renderer.h
  runtime/
    instance_registry.cpp
    render_context.cpp
    state_slot.cpp
  renderer/
    components.cpp
    style.cpp
    layout.cpp
  compiler/
    package.json
    tsconfig.json
    src/
      index.ts         # CLI entry point
      parser.ts        # .tsx -> AST via TS compiler API
      validator.ts     # check components, props, hooks
      lowering.ts      # AST -> IR
      emitter.ts       # IR -> .gen.cpp
  examples/
    hello/
      App.tsx
      main.cpp         # app shell (current main.cpp, modified)
  docs/
  CMakeLists.txt
```

### CMake targets

- `imx_runtime` — static library, runtime with state management, identity, callbacks, render orchestration
- `imx_renderer` — static library, Dear ImGui renderer and host component layer, links `imx_runtime` and `imgui_lib`
- `hello_app` — example app, links `imx_renderer`, includes generated `.gen.cpp` files

### CMake custom command

```cmake
add_custom_command(
  OUTPUT ${CMAKE_BINARY_DIR}/generated/App.gen.cpp
         ${CMAKE_BINARY_DIR}/generated/app_root.gen.cpp
  COMMAND node ${CMAKE_SOURCE_DIR}/compiler/src/index.ts
          ${CMAKE_SOURCE_DIR}/examples/hello/App.tsx
          -o ${CMAKE_BINARY_DIR}/generated/
  DEPENDS examples/hello/App.tsx
)
```

`cmake --build` detects `.tsx` changes -> runs Node compiler -> compiles generated C++ -> links into native binary. Requires Node on the build machine.

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Compiler language | TypeScript | TS compiler API parses TSX natively; compiler is dev-time only |
| Type checking | Parse-only, IDE support later | Fastest path to working compiler; `.d.ts` added later |
| Generated code shape | Direct ImGui calls | Simple, debuggable, no unnecessary abstraction |
| State identity | Compiler-assigned slot indices | Compiler knows exact count/order; no runtime overhead |
| Instance identity | Hybrid positional + key | Matches React expectations; compiler enforces keys on maps |
| String handling | printf-style for ImGui text | Zero allocation; ImGui APIs are already printf-style |
| Callbacks | Stored `std::function` in runtime | Future-proof for deferred/async patterns |
| Runtime richness | Medium (lifecycle, callback registry, style resolver) | Holds through Phase 8 without redesign |
| Style resolution | Runtime resolver in renderer | Single place for style-to-ImGui mapping; change renderer not compiler |
| Layout model | `BeginChild` + cursor math | Supports width/gap/padding; upgradeable for complex layouts |
| TextInput buffers | Runtime-owned persistent buffers | Preserves controlled-input contract; no per-frame allocation |
| Build integration | CMake custom command | Automatic; `cmake --build` handles everything |
| Error reporting | Simple file/line/message | TS parser provides positions; polish later |

## 9. Phases Covered

- **Phase 2:** Runtime skeleton — RenderContext, InstanceRegistry, StateSlot, callbacks, lifecycle
- **Phase 3:** Host components — Window, View, Row, Column, Text, Button, TextInput, Checkbox, Separator, Popup
- **Phase 4:** TSX frontend — parser, validator using TS compiler API
- **Phase 5:** C++ codegen — lowering, emitter
- **Phase 6:** CMake integration + example app wired end-to-end

