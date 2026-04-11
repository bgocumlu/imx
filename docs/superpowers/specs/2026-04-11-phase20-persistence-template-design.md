# Phase 20 Step 3: Persistence Template

## Goal

Add a `persistence` template to `imxc init` and a matching `examples/persistence/` example. Both use the same code. Demonstrates JSON save/load using nlohmann/json.

## Files generated

| File | Description |
|------|-------------|
| `src/persistence.h` | `save_json()` / `load_json()` helpers (~25 lines) |
| `src/main.cpp` | GLFW/OpenGL shell, auto-loads state.json on startup, save callback |
| `src/AppState.h` | State struct with `to_json()` / `from_json()` (nlohmann pattern) |
| `src/App.tsx` | Text input, slider, checkbox + Save/Load buttons |
| `src/imx.d.ts` | Shared (with persistence AppState) |
| `tsconfig.json` | Shared |
| `CMakeLists.txt` | Adds FetchContent for nlohmann/json |
| `.gitignore` | Shared |
| `public/` | Empty asset directory |

## `persistence.h`

```cpp
#pragma once
#include <fstream>
#include <string>
#include <nlohmann/json.hpp>

namespace imx {

template<typename T>
bool save_json(const std::string& path, const T& state) {
    std::ofstream f(path);
    if (!f) return false;
    f << nlohmann::json(state).dump(2);
    return true;
}

template<typename T>
bool load_json(const std::string& path, T& state) {
    std::ifstream f(path);
    if (!f) return false;
    nlohmann::json j = nlohmann::json::parse(f, nullptr, false);
    if (j.is_discarded()) return false;
    state = j.get<T>();
    return true;
}

} // namespace imx
```

Saves next to the executable. User can change the path to platform app data dirs if they want.

## `AppState.h`

```cpp
#pragma once
#include <string>
#include <functional>
#include <nlohmann/json.hpp>

struct AppState {
    std::string name = "World";
    float volume = 50.0f;
    bool darkMode = true;
    std::function<void()> onSave;
    std::function<void()> onLoad;
};

NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AppState, name, volume, darkMode)
```

Note: `NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE` auto-generates `to_json`/`from_json`. The `std::function` fields are not serialized (nlohmann skips them — they're callbacks, not data).

Wait — `NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE` will fail on `std::function` fields because it tries to serialize all listed fields. We need to only list the data fields:

```cpp
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AppState, name, volume, darkMode)
```

This only serializes `name`, `volume`, `darkMode`. The `std::function` fields (`onSave`, `onLoad`) are not listed, so they're ignored. This works correctly.

## `main.cpp`

Same GLFW/OpenGL boilerplate. Differences:
- `#include "persistence.h"`
- Auto-loads on startup: `imx::load_json("state.json", app.state);`
- Wires callbacks:
```cpp
app.state.onSave = [&]() {
    imx::save_json("state.json", app.state);
};
app.state.onLoad = [&]() {
    imx::load_json("state.json", app.state);
    app.runtime.request_frame();
};
```

## `App.tsx`

```tsx
export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Persistence Demo">
        <Column gap={8}>
          <Text>JSON Save/Load Example</Text>
          <Separator />
          <TextInput label="Name" value={props.name} />
          <SliderFloat label="Volume" value={props.volume} min={0} max={100} />
          <Checkbox label="Dark Mode" value={props.darkMode} />
          <Separator />
          <Row gap={8}>
            <Button title="Save" onPress={props.onSave} />
            <Button title="Load" onPress={props.onLoad} />
          </Row>
        </Column>
      </Window>
    </DockSpace>
  );
}
```

## CMakeLists.txt

The persistence template needs its own CMakeLists.txt string (not the shared `cmakeTemplate()`) because it adds nlohmann/json via FetchContent:

```cmake
FetchContent_Declare(json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(json)
```

And adds `nlohmann_json::nlohmann_json` to `target_link_libraries`.

For the example (`examples/persistence/`), the root CMakeLists.txt adds the FetchContent + target.

## Cross-platform

Fully cross-platform. nlohmann/json is header-only, `std::fstream` is standard. Saves next to the exe — no platform-specific paths.

## Example + Template

- `examples/persistence/` — built first, verified locally (fast, no FetchContent for IMX itself)
- `compiler/src/templates/persistence.ts` — same content as template strings, registered as "persistence"
- Both share identical code
