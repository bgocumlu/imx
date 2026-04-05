# C++ Struct Binding — Design Spec

## Overview

Root TSX components receive a C++ struct as a mutable reference. Fields are read/written directly via pointers — no copies, no callbacks, no state management layer. This enables IMX to be a GUI layer on top of existing C++ applications, matching raw ImGui's immediate mode contract.

## Data Flow

```
C++ struct (user-defined)
    |
    v
render_root(runtime, state)
    |
    v
App_render(ctx, state)   ← generated code uses &state.field directly
    |
    v
ImGui reads/writes struct fields via pointers each frame
```

No intermediate state. No re-render triggers. The generated code is what you'd write by hand in ImGui.

## C++ Side

The user defines their own struct. IMX does not generate it.

```cpp
struct Course {
    float credit = 3.0f;
    int grade_index = 0;
};

struct AppState {
    // Data fields — read/write directly from TSX
    float speed = 5.0f;
    bool muted = false;
    std::vector<Course> courses;

    // Computed values — pre-calculate in C++, display in TSX
    float gpa = 0.0f;

    // Callbacks — TSX triggers C++ actions
    std::function<void()> onConnect;
    std::function<void(int)> onRemoveCourse;
};

AppState state;
state.onConnect = [&]() { client.connect(); };
state.onRemoveCourse = [&](int i) { state.courses.erase(state.courses.begin() + i); };

// every frame:
state.gpa = calculate_gpa(state.courses);
imx::render_root(runtime, state);
```

## TSX Side

The root component declares props matching the C++ struct name. No `onChange` callbacks needed for bound fields.

```tsx
export default function App(props: AppState) {
    const [showModal, setShowModal] = useState(false);

    return (
        <Window title="Controls">
            <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
            <Checkbox label="Muted" value={props.muted} />

            <Table columns={"Credit", "Grade"}>
                {props.courses.map((course, i) => (
                    <TableRow key={i}>
                        <InputFloat label={"##k" + i} value={course.credit} />
                        <Combo label={"##g" + i} value={course.grade_index}
                               items={["A", "A-", "B+", "B"]} />
                        <Button title="X" onPress={() => props.onRemoveCourse(i)} />
                    </TableRow>
                ))}
            </Table>

            <Text>GPA: {props.gpa}</Text>
            <Button title="Connect" onPress={props.onConnect} />

            <Button title="Save" onPress={() => setShowModal(true)} />
            <Modal title="Confirm" open={showModal} onClose={() => setShowModal(false)}>
                <Text>Save?</Text>
            </Modal>
        </Window>
    );
}
```

## Generated C++

```cpp
void App_render(imx::RenderContext& ctx, AppState& props) {
    auto showModal = ctx.use_state<bool>(false, 0);

    imx::renderer::begin_window("Controls", 0);

    // Direct pointer binding — no temp variables
    ImGui::SliderFloat("Speed", &props.speed, 0.0f, 100.0f);
    ImGui::Checkbox("Muted", &props.muted);

    // Vector iteration — reference binding
    for (size_t i = 0; i < props.courses.size(); i++) {
        auto& course = props.courses[i];
        ImGui::InputFloat(("##k" + std::to_string(i)).c_str(), &course.credit);
        // combo with &course.grade_index...
        if (ImGui::Button(("X##" + std::to_string(i)).c_str())) {
            props.onRemoveCourse(static_cast<int>(i));
        }
    }

    // Display computed value
    imx::renderer::text("GPA: %.2f", props.gpa);

    // Callback invocation
    if (imx::renderer::button("Connect")) {
        props.onConnect();
    }

    // useState still works for UI-only state
    if (imx::renderer::button("Save")) {
        showModal.set(true);
    }
    // ... modal code using showModal ...

    imx::renderer::end_window();
}
```

## Binding Rules

| Pattern | Emitted C++ |
|---------|-------------|
| `value={props.field}` without `onChange` | `&props.field` (direct pointer) |
| `value={props.field}` with `onChange` | Current temp-variable + callback pattern |
| `value={stateVar}` (useState) | Current `.get()`/`.set()` pattern |
| `{props.field}` in Text | Read-only display |
| `onPress={props.callback}` | `props.callback()` invocation |
| `props.vec.map(...)` | `for` loop with `auto&` reference |

The compiler decides the mode per-usage based on whether `onChange` is present and whether the value source is a prop or state variable.

## Runtime Changes

`render_root` gets a new overload:

```cpp
// Existing — self-contained app
void render_root(Runtime& runtime);

// New — C++ struct binding
template <typename T>
void render_root(Runtime& runtime, T& state);
```

The generated `app_root.gen.cpp` passes the reference through to `App_render`.

## Compiler Changes

**Lowering:** Detect `value={props.field}` without `onChange`. Emit a new IR flag (`directBind: true`) on the widget node instead of the current `stateVar`/`valueExpr` pattern.

**Emitter:** When `directBind` is true, emit `&props.field` instead of a temp variable block. For `.map()` over props vectors, emit `auto&` references.

**Root emitter:** Generate `App_render(ctx, state)` call with the struct type parameter.

**No changes needed:** components.ts, renderer.h, renderer/components.cpp. This is purely compiler + runtime entry point.

## Coexistence

Both models work in the same component:
- `useState` for UI-only state (modal visibility, tab selection, local toggles)
- Struct binding for C++ state (app data, settings, configuration)
- `register_widget` for custom ImGui widgets that need full C++ control

## Thread Safety

Bound struct fields are accessed directly by ImGui on the render thread. If C++ code modifies bound fields from another thread, the developer must synchronize access (mutex, atomic, etc.). IMX does not add synchronization — same rules as raw ImGui.

## Future Work (Not Implemented Now)

- **Approach 2: Child component sub-struct binding** — Child components accepting references to sub-structs or individual fields, so the root doesn't have to forward everything manually
- **Array manipulation from TSX** — push/pop/splice operations on bound vectors from TSX (currently C++ only resizes vectors)
- **Computed expressions** — Read-only derived values computed in TSX from struct fields (currently must pre-compute in C++)
