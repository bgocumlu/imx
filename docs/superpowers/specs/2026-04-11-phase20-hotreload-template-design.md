# Phase 20 Step 5: Hotreload Template

## Goal

Add a `hotreload` template to `imxc init` and a matching `examples/hotreload/` example. Demonstrates DLL/SO hot reload — edit TSX, recompile, UI updates without restarting the app.

## How it works

The app is split into two parts:
- **Host exe** — owns the window, ImGui context, `AppState`, and the reload loop
- **UI DLL/SO** — contains the compiled TSX render function, exported as `imx_render`

Each frame, the host checks if the DLL file has been modified (`std::filesystem::last_write_time`). If changed, it unloads the old DLL and loads the new one. State survives because `AppState` lives in the host exe, not the DLL.

Workflow: `imxc watch` recompiles TSX → CMake rebuilds DLL → host detects → reloads → UI updates live.

## Files generated

| File | Description |
|------|-------------|
| `src/hotreload.h` | Cross-platform DLL loader (~80 lines, `#ifdef _WIN32` / `dlopen`) |
| `src/main.cpp` | Host exe — loads DLL, calls render each frame, checks for changes |
| `src/AppState.h` | State struct (lives in host, survives reloads) |
| `src/App.tsx` | Demo UI (compiled into the DLL) |
| `src/imx.d.ts` | Shared (with hotreload AppState) |
| `tsconfig.json` | Shared |
| `CMakeLists.txt` | Builds host exe + UI shared library |
| `.gitignore` | Shared |
| `public/` | Empty asset directory |

## `hotreload.h`

Cross-platform DLL/SO loader:

```cpp
#pragma once
#include <string>
#include <filesystem>
#include <imx/runtime.h>

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <dlfcn.h>
#endif

struct AppState; // forward declare

struct HotModule {
    using RenderFn = void(*)(imx::Runtime&, AppState&);

#ifdef _WIN32
    HMODULE handle = nullptr;
#else
    void* handle = nullptr;
#endif
    RenderFn render = nullptr;
    std::filesystem::file_time_type last_write{};
    std::string path;

    bool load(const std::string& lib_path) {
        path = lib_path;
        // ... LoadLibrary/dlopen, GetProcAddress/dlsym for "imx_render"
        // ... store last_write_time
    }

    void unload() {
        // ... FreeLibrary/dlclose
    }

    bool check_reload() {
        // Compare last_write_time, if changed: unload + load
        // Returns true if reloaded
    }
};
```

## `AppState.h`

Simple demo state (same complexity as minimal):

```cpp
#pragma once
#include <functional>

struct AppState {
    int count = 0;
    float speed = 5.0f;
    std::function<void()> onIncrement;
};
```

## `main.cpp`

Same GLFW/OpenGL boilerplate as other templates. Key difference — instead of calling `imx::render_root()` directly, it loads the DLL and calls the exported render function:

```cpp
HotModule module;
module.load("ui_module.dll"); // or .so on Linux, .dylib on macOS

// In the main loop:
module.check_reload(); // checks file timestamp, reloads if changed
if (module.render) {
    module.render(app.runtime, app.state);
}
```

The DLL path is platform-dependent:
- Windows: `ui_module.dll`
- Linux: `libui_module.so`
- macOS: `libui_module.dylib`

## `App.tsx`

Same as minimal template — simple counter + slider. The point is demonstrating hot reload, not complex UI.

## CMakeLists.txt

Two targets:
1. **`ui_module`** — SHARED library containing the compiled TSX
2. **`${projectName}`** — host executable that loads ui_module

```cmake
# UI module (shared library — hot-reloadable)
add_library(ui_module SHARED ${GENERATED})
target_link_libraries(ui_module PRIVATE imx::renderer)
target_include_directories(ui_module PRIVATE ${CMAKE_BINARY_DIR}/generated ${CMAKE_CURRENT_SOURCE_DIR}/src)

# Host executable
add_executable(${projectName} src/main.cpp)
set_target_properties(${projectName} PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
target_link_libraries(${projectName} PRIVATE imx::renderer)
target_include_directories(${projectName} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/src)

# Copy DLL next to exe after build
add_custom_command(TARGET ui_module POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:ui_module> $<TARGET_FILE_DIR:${projectName}>
)
```

The host exe links `imx::renderer` for ImGui/GLFW setup but does NOT link `ui_module` — it loads it dynamically at runtime.

The generated `.gen.cpp` needs an exported `imx_render` function. The emitter already generates `render_root` calls — the DLL wrapper exports a function that calls it:

Actually, we need a small wrapper. The generated `app_root.gen.cpp` defines `imx::render_root<AppState>()`. The DLL needs to export a C function. We add a `src/ui_entry.cpp` to the DLL:

```cpp
#include <imx/runtime.h>
#include "AppState.h"
#include "App.gen.h"

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

extern "C" EXPORT void imx_render(imx::Runtime& runtime, AppState& state) {
    imx::render_root(runtime, state);
}
```

So the DLL contains: `App.gen.cpp` + `app_root.gen.cpp` + `ui_entry.cpp`.

## Files (revised)

| File | Description |
|------|-------------|
| `src/hotreload.h` | Cross-platform DLL loader |
| `src/ui_entry.cpp` | DLL export wrapper — exports `imx_render()` |
| `src/main.cpp` | Host exe |
| `src/AppState.h` | State struct |
| `src/App.tsx` | Demo UI |
| `src/imx.d.ts` | Shared |
| `tsconfig.json` | Shared |
| `CMakeLists.txt` | Host exe + ui_module shared lib |
| `.gitignore` | Shared |
| `public/` | Empty |

## Cross-platform

`#ifdef _WIN32` for LoadLibrary/FreeLibrary/GetProcAddress, `#else` for dlopen/dlclose/dlsym. DLL extension handled via `#ifdef` in main.cpp. `std::filesystem::last_write_time` is cross-platform (C++17).

## Example + Template

- `examples/hotreload/` — built first, verified locally
- `compiler/src/templates/hotreload.ts` — same content as template strings
- Both share identical code
