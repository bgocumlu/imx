# Custom Widgets & Themes Design

## Summary

Add C++ escape hatches so advanced users can register existing ImGui widgets and theme functions, then use them from TSX as first-class components. Native widgets appear as `<Knob value={x} onChange={setX} />` — same syntax as built-in components, with full TypeScript type checking via user-provided `.d.ts` declarations.

## Motivation

Advanced users have existing ImGui widgets (knobs, faders, meters, custom themes) they want to use inside IMX without rewriting them. This feature bridges the gap between IMX's declarative model and the wider ImGui ecosystem.

Reference: JamGui widgets in `udpstuff/gui.h` — `Knob`, `Fader`, `UvMeter`, `ToggleButton`, `ApplyZynlabTheme`.

## Design

### C++ Registration API

#### Widget Registration

```cpp
// In include/imx/renderer.h
namespace imx {

class WidgetArgs {
public:
    explicit WidgetArgs(const char* label);

    const char* label() const;

    template <typename T>
    void set(const char* name, const T& value);

    void set_callback(const char* name, std::function<void(std::any)> cb);

    template <typename T>
    T get(const char* name) const;

    template <typename T>
    T get(const char* name, const T& default_value) const;

    bool has(const char* name) const;

    // Invoke a void callback
    void call(const char* name) const;

    // Invoke a callback with a value
    template <typename T>
    void call(const char* name, const T& value) const;

private:
    const char* label_;
    std::unordered_map<std::string, std::any> values_;
    std::unordered_map<std::string, std::function<void(std::any)>> callbacks_;
};

using WidgetFunc = std::function<void(WidgetArgs&)>;
void register_widget(const std::string& name, WidgetFunc func);
void call_widget(const std::string& name, WidgetArgs& args);

using ThemeFunc = std::function<void()>;
void register_theme(const std::string& name, ThemeFunc func);

} // namespace imx
```

#### Storage

- `WidgetArgs::values_` — `std::unordered_map<std::string, std::any>` for prop values (float, int, bool, string, ImVec2)
- `WidgetArgs::callbacks_` — `std::unordered_map<std::string, std::function<void(std::any)>>` for callbacks

#### Usage in main.cpp

```cpp
#include "jamgui.h"

// Register widgets before the render loop
imx::register_widget("Knob", [](imx::WidgetArgs& args) {
    float v = args.get<float>("value");
    bool changed = JamGui::Knob(
        args.label(),
        &v,
        args.get<float>("min"),
        args.get<float>("max"),
        ImVec2(args.get<float>("width", 80.0f), args.get<float>("height", 80.0f))
    );
    if (changed) args.call("onChange", v);
});

imx::register_widget("Fader", [](imx::WidgetArgs& args) {
    int v = args.get<int>("value");
    bool changed = JamGui::Fader(
        args.label(),
        ImVec2(args.get<float>("width", 20.0f), args.get<float>("height", 100.0f)),
        &v,
        args.get<int>("min"),
        args.get<int>("max")
    );
    if (changed) args.call("onChange", v);
});

// Register custom theme
imx::register_theme("zynlab", []() { JamGui::ApplyZynlabTheme(); });
```

### Compiler Changes

#### Detection Strategy

Three categories of JSX elements:
1. **Host components** — in `HOST_COMPONENTS` map (Button, Theme, etc.)
2. **Custom TSX components** — detected via `import` statements (TodoItem, etc.)
3. **Native widgets** — everything else (not host, not imported)

TypeScript's own type checking via `.d.ts` catches unknown/mistyped native widgets. The compiler (imxc) does not validate native widget props.

#### New IR Node

```typescript
// ir.ts
export interface IRNativeWidget {
    kind: 'native_widget';
    name: string;                                    // "Knob"
    props: Record<string, string>;                   // value props as C++ expressions
    callbackProps: Record<string, string>;            // callback props as C++ lambdas
    key?: string;
    loc?: SourceLoc;
}
```

Add `IRNativeWidget` to the `IRNode` union type.

#### Lowering (lowering.ts)

When an unknown JSX element is encountered (not host, not imported):
- Partition props into value props and callback props (callbacks are arrow functions or function references)
- Convert each prop value to a C++ expression via `exprToCpp()`
- Emit an `IRNativeWidget` node

#### Emission (emitter.ts)

For `IRNativeWidget`, generate:

```cpp
{
    imx::WidgetArgs args("Knob##unique_id");
    args.set("value", x.get());
    args.set("min", 0.0f);
    args.set("max", 100.0f);
    args.set_callback("onChange", [&](std::any _v) { x.set(std::any_cast<float>(_v)); });
    imx::call_widget("Knob", args);
}
```

Key details:
- Label includes ImGui ID suffix (`##`) for uniqueness within loops
- Value props use `args.set()`
- Callback props use `args.set_callback()` with a lambda that unpacks `std::any`
- Callback type inference: the emitter infers the callback parameter type from the state slot type being set (e.g., `float` for `x.set(...)`). For callbacks that don't set state (e.g., plain function calls), emit `void` callbacks with no `std::any` parameter — use `args.set_callback("onPress", [&](std::any) { doSomething(); })`

#### Validator (validator.ts)

Relax validation: do not error on unknown JSX element names. Currently the validator rejects anything not in `HOST_COMPONENTS` and not in the imports set. Change to: log unknown elements as native widgets (or silently pass through).

### Renderer Changes

#### Widget Dispatch (components.cpp)

```cpp
static std::unordered_map<std::string, WidgetFunc> g_widget_registry;
static std::unordered_map<std::string, ThemeFunc> g_theme_registry;

void register_widget(const std::string& name, WidgetFunc func) {
    g_widget_registry[name] = func;
}

void call_widget(const std::string& name, WidgetArgs& args) {
    auto it = g_widget_registry.find(name);
    if (it != g_widget_registry.end()) {
        before_child();  // layout integration (gap, SameLine, etc.)
        it->second(args);
    }
    // Silent no-op if not registered (link-time safety not needed; runtime skip)
}

void register_theme(const std::string& name, ThemeFunc func) {
    g_theme_registry[name] = func;
}
```

#### Theme Lookup (components.cpp)

In `begin_theme()`, check custom registry before built-in presets:

```cpp
void begin_theme(const char* preset, const ThemeConfig& config) {
    auto it = g_theme_registry.find(preset);
    if (it != g_theme_registry.end()) {
        it->second();
    } else if (strcmp(preset, "dark") == 0) {
        ImGui::StyleColorsDark();
    } else if (strcmp(preset, "light") == 0) {
        ImGui::StyleColorsLight();
    } else if (strcmp(preset, "classic") == 0) {
        ImGui::StyleColorsClassic();
    }

    // Apply overrides on top (accent_color, rounding, etc.) — unchanged
    // ...
}
```

#### New File: renderer/widget_args.cpp

Contains `WidgetArgs` method implementations. Keeps `components.cpp` focused on rendering.

### Type Definitions

#### imx.d.ts Template (init.ts)

Add a commented example section to the generated `.d.ts`:

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

#### Theme Preset Type

Update the `ThemeProps.preset` type from `"dark" | "light" | "classic"` to `string` so custom presets work without type errors:

```typescript
interface ThemeProps {
    preset: string;  // "dark", "light", "classic", or any registered custom theme
    // ... rest unchanged
}
```

### Documentation Updates

#### docs/api-reference.md

New section "Custom Widgets & Themes":
- `register_widget()` — signature, WidgetArgs API, full Knob example
- `register_theme()` — signature, example with ApplyZynlabTheme
- `.d.ts` declaration pattern
- End-to-end example: C++ registration + TSX usage + type declaration

#### docs/quick-start.md

Brief "Advanced: Custom Widgets" subsection pointing to API reference.

#### docs/llm-prompt-reference.md

Add native widget syntax pattern so LLMs can generate code using custom widgets.

## Files Changed

| File | Change |
|------|--------|
| `include/imx/renderer.h` | Add WidgetArgs class, register_widget, register_theme, call_widget |
| `renderer/widget_args.cpp` | **New** — WidgetArgs implementation |
| `renderer/components.cpp` | Widget/theme registries, call_widget, begin_theme custom lookup |
| `CMakeLists.txt` | Add widget_args.cpp to imx_renderer sources |
| `compiler/src/ir.ts` | Add IRNativeWidget node type |
| `compiler/src/lowering.ts` | Handle unknown JSX elements as native widgets |
| `compiler/src/emitter.ts` | Emit WidgetArgs + call_widget code for IRNativeWidget |
| `compiler/src/validator.ts` | Relax unknown element validation |
| `compiler/src/init.ts` | Add .d.ts example, update ThemeProps.preset to string |
| `docs/api-reference.md` | Custom Widgets & Themes section |
| `docs/quick-start.md` | Brief advanced subsection |
| `docs/llm-prompt-reference.md` | Native widget syntax |
