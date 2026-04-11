# Phase 20 Step 5: Hotreload Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `hotreload` template and matching `examples/hotreload/` example that demonstrates DLL/SO hot reload — edit TSX, recompile, UI updates without restarting the app.

**Architecture:** Host exe owns the window, ImGui context, and AppState. UI is compiled into a shared library (DLL/SO) that exports `imx_render()`. Host loads it dynamically, checks `last_write_time` each frame, reloads on change. Cross-platform via `#ifdef _WIN32` (LoadLibrary) / `#else` (dlopen).

**Tech Stack:** `std::filesystem` for file watching, `LoadLibrary`/`dlopen` for dynamic loading, no external dependencies.

---

### Task 1: Build `examples/hotreload/` and verify it compiles

**Files:**
- Create: `examples/hotreload/src/hotreload.h`
- Create: `examples/hotreload/src/ui_entry.cpp`
- Create: `examples/hotreload/src/AppState.h`
- Create: `examples/hotreload/src/main.cpp`
- Create: `examples/hotreload/src/App.tsx`
- Create: `examples/hotreload/src/imx.d.ts`
- Create: `examples/hotreload/tsconfig.json`
- Create: `examples/hotreload/public/.gitkeep`
- Modify: `CMakeLists.txt` (add hotreload_host + hotreload_ui targets)

- [ ] **Step 1: Create `examples/hotreload/src/AppState.h`**

Same as minimal template — simple counter + slider. The point is demonstrating reload, not complex UI.

```cpp
#pragma once
#include <functional>

struct AppState {
    int count = 0;
    float speed = 5.0F;
    std::function<void()> onIncrement;
};
```

- [ ] **Step 2: Create `examples/hotreload/src/hotreload.h`**

Cross-platform DLL/SO loader. Full implementation:

```cpp
#pragma once
#include <string>
#include <filesystem>
#include <iostream>
#include <imx/runtime.h>
#include "AppState.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <dlfcn.h>
#endif

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
        if (!std::filesystem::exists(path)) {
            std::cerr << "hotreload: " << path << " not found\n";
            return false;
        }
        last_write = std::filesystem::last_write_time(path);

#ifdef _WIN32
        // Copy DLL to avoid locking the original (allows rebuild while loaded)
        std::string copy_path = path + ".live";
        std::filesystem::copy_file(path, copy_path, std::filesystem::copy_options::overwrite_existing);
        handle = LoadLibraryA(copy_path.c_str());
        if (!handle) {
            std::cerr << "hotreload: LoadLibrary failed\n";
            return false;
        }
        render = reinterpret_cast<RenderFn>(GetProcAddress(handle, "imx_render"));
#else
        handle = dlopen(path.c_str(), RTLD_NOW);
        if (!handle) {
            std::cerr << "hotreload: dlopen failed: " << dlerror() << "\n";
            return false;
        }
        render = reinterpret_cast<RenderFn>(dlsym(handle, "imx_render"));
#endif
        if (!render) {
            std::cerr << "hotreload: imx_render symbol not found\n";
            unload();
            return false;
        }
        std::cout << "hotreload: loaded " << path << "\n";
        return true;
    }

    void unload() {
        if (!handle) return;
#ifdef _WIN32
        FreeLibrary(handle);
#else
        dlclose(handle);
#endif
        handle = nullptr;
        render = nullptr;
    }

    bool check_reload() {
        if (path.empty() || !std::filesystem::exists(path)) return false;
        auto current = std::filesystem::last_write_time(path);
        if (current == last_write) return false;
        std::cout << "hotreload: change detected, reloading...\n";
        unload();
        // Small delay to ensure file write is complete
#ifdef _WIN32
        Sleep(100);
#else
        usleep(100000);
#endif
        if (load(path)) {
            std::cout << "hotreload: reload successful\n";
            return true;
        }
        std::cerr << "hotreload: reload failed\n";
        return false;
    }

    ~HotModule() { unload(); }
};
```

Key detail on Windows: the DLL is copied to `.live` before loading so the original file isn't locked by the process. This allows CMake to rebuild the DLL while the app is running.

- [ ] **Step 3: Create `examples/hotreload/src/ui_entry.cpp`**

This is the export wrapper that goes into the shared library:

```cpp
#include <imx/runtime.h>
#include "AppState.h"

// Forward declare the generated render function
void App_render(imx::RenderContext& ctx, AppState& props);

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

extern "C" EXPORT void imx_render(imx::Runtime& runtime, AppState& state) {
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 0, 0);
    App_render(ctx, state);
    ctx.end_instance();
    runtime.end_frame();
}
```

This replaces the generated `app_root.gen.cpp` entry point. The DLL does NOT include `app_root.gen.cpp` — it uses `ui_entry.cpp` instead to export the function with C linkage.

- [ ] **Step 4: Create `examples/hotreload/src/main.cpp`**

Read `examples/async/src/main.cpp` for the boilerplate pattern. Key differences:
- `#include "hotreload.h"` instead of any async/networking includes
- No `#include <imx/renderer.h>` needed for render_root (we use HotModule instead)
- Wait — we still need `imx/renderer.h` for `begin_dockspace()` etc. Actually no — the host exe calls `module.render()` which calls into the DLL where the renderer functions live. The host exe needs `imx/runtime.h` for `Runtime`, and ImGui/GLFW for the window loop.

Actually, looking at this more carefully: the host exe needs `imx::Runtime` (from `imx/runtime.h`). The renderer functions (`begin_window`, etc.) are called inside the DLL. The host exe just needs to set up GLFW/ImGui and call `module.render()`. But `imx::Runtime` methods like `begin_frame()`, `end_frame()`, `needs_frame()`, `frame_rendered()`, `request_frame()` are in `imx_runtime` which the host links against.

The host exe:
- Links: `imx_runtime` (for Runtime), `imgui_lib` (for ImGui setup), `glfw`, `OpenGL::GL`
- Does NOT link: `imx_renderer` (that's in the DLL)

Wait — for the example inside the repo, the host can link `imx_renderer` too (it doesn't hurt, just unused). For simplicity, let's link `imx_renderer` on the host as well. The DLL also links `imx_renderer`.

For the template (FetchContent), there's only `imx::renderer` which includes both runtime and renderer. Let's keep it simple — both host and DLL link `imx::renderer`.

Main.cpp:

```cpp
#include <imx/runtime.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "AppState.h"
#include "hotreload.h"

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    AppState state;
    HotModule module;
};

static void render_frame(App& app) {
    glfwMakeContextCurrent(app.window);
    if (glfwGetWindowAttrib(app.window, GLFW_ICONIFIED) != 0) return;

    int fb_w = 0, fb_h = 0;
    glfwGetFramebufferSize(app.window, &fb_w, &fb_h);
    if (fb_w <= 0 || fb_h <= 0) return;

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    // Check for DLL changes and reload if needed
    app.module.check_reload();

    // Call the render function from the DLL
    if (app.module.render) {
        app.module.render(app.runtime, app.state);
    }

    ImGui::Render();
    glViewport(0, 0, fb_w, fb_h);
    glClearColor(0.12F, 0.12F, 0.15F, 1.0F);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    if ((app.io->ConfigFlags & ImGuiConfigFlags_ViewportsEnable) != 0) {
        ImGui::UpdatePlatformWindows();
        ImGui::RenderPlatformWindowsDefault();
    }

    glfwMakeContextCurrent(app.window);
    glfwSwapBuffers(app.window);
}

static void window_size_callback(GLFWwindow* window, int, int) {
    auto* app = static_cast<App*>(glfwGetWindowUserPointer(window));
    if (app) render_frame(*app);
}

int main() {
    if (glfwInit() == 0) return 1;

    const char* glsl_version = "#version 150";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(800, 600, "Hotreload Example", nullptr, nullptr);
    if (!window) { glfwTerminate(); return 1; }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;

    ImGui::StyleColorsDark();
    ImGuiStyle& style = ImGui::GetStyle();
    if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable) {
        style.WindowRounding = 0.0F;
        style.Colors[ImGuiCol_WindowBg].w = 1.0F;
    }

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    App app;
    app.window = window;
    app.io = &io;
    glfwSetWindowUserPointer(window, &app);
    glfwSetWindowSizeCallback(window, window_size_callback);
    app.state.onIncrement = [&]() { app.state.count++; };

    // Load the UI module
#ifdef _WIN32
    app.module.load("hotreload_ui.dll");
#elif defined(__APPLE__)
    app.module.load("libhotreload_ui.dylib");
#else
    app.module.load("libhotreload_ui.so");
#endif

    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }

    app.module.unload();
    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}

#ifdef _WIN32
#include <windows.h>
int WINAPI WinMain(HINSTANCE, HINSTANCE, LPSTR, int) { return main(); }
#endif
```

- [ ] **Step 5: Create `examples/hotreload/src/App.tsx`**

Same as minimal — simple counter + slider:

```tsx
export default function App(props: AppState) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Controls">
        <Column gap={8}>
          <Text>Count: {props.count}</Text>
          <Button title="Increment" onPress={props.onIncrement} />
          <SliderFloat label="Speed" value={props.speed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      {showAbout && <Window title="About">
        <Text>Built with IMX (hot-reloadable!)</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
      </Window>}
    </DockSpace>
  );
}
```

- [ ] **Step 6: Create `examples/hotreload/src/imx.d.ts` and `examples/hotreload/tsconfig.json`**

Copy `imx.d.ts` from `examples/async/src/imx.d.ts` but replace the `interface AppState` block with:
```ts
interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}
```

Copy `tsconfig.json` from `examples/async/tsconfig.json` verbatim.

Create `examples/hotreload/public/.gitkeep`.

- [ ] **Step 7: Add CMake targets to `CMakeLists.txt`**

Add before `endif()` (currently at line 335). The hotreload example needs TWO targets: a shared library for the UI and a host executable.

```cmake
    # --- hotreload: DLL hot reload scaffolding ---
    imx_compile_tsx(HOTRELOAD_GENERATED
        SOURCES
            examples/hotreload/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_hotreload
    )

    # UI shared library (hot-reloadable)
    add_library(hotreload_ui SHARED
        examples/hotreload/src/ui_entry.cpp
        ${HOTRELOAD_GENERATED}
    )
    target_link_libraries(hotreload_ui PRIVATE imx_renderer)
    target_include_directories(hotreload_ui PRIVATE
        ${CMAKE_BINARY_DIR}/generated_hotreload
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/hotreload/src
    )

    # Host executable (loads hotreload_ui dynamically)
    add_executable(hotreload_host
        examples/hotreload/src/main.cpp
    )
    set_target_properties(hotreload_host PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(hotreload_host PRIVATE imx_renderer)
    target_include_directories(hotreload_host PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/hotreload/src
    )

    # Copy DLL next to host exe after build
    add_custom_command(TARGET hotreload_ui POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:hotreload_ui> $<TARGET_FILE_DIR:hotreload_host>
        COMMENT "Copying hotreload_ui DLL to host directory"
    )

    # Build host after UI so the DLL is ready
    add_dependencies(hotreload_host hotreload_ui)
```

Note: `hotreload_host` does NOT link `hotreload_ui` — it loads it dynamically. But it depends on it so CMake builds the DLL first and copies it.

Important: the `ui_entry.cpp` does NOT include `app_root.gen.cpp` — it replaces it. The HOTRELOAD_GENERATED list only includes `App.gen.cpp` (not `app_root.gen.cpp`). However, `imx_compile_tsx` generates both files. We need to exclude `app_root.gen.cpp` from the shared library sources.

Actually, looking at `imx_compile_tsx`, it returns ALL generated files in the variable. We can't easily exclude one. Let's take a different approach: include `app_root.gen.cpp` in the DLL but DON'T use `ui_entry.cpp` to redefine render_root. Instead, have `ui_entry.cpp` just export a C function that calls `imx::render_root<AppState>()`:

```cpp
#include <imx/runtime.h>
#include "AppState.h"

// Declared in app_root.gen.cpp (generated by imxc)
namespace imx {
template <> void render_root<AppState>(imx::Runtime& runtime, AppState& state);
}

#ifdef _WIN32
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __attribute__((visibility("default")))
#endif

extern "C" EXPORT void imx_render(imx::Runtime& runtime, AppState& state) {
    imx::render_root(runtime, state);
}
```

This way `app_root.gen.cpp` is compiled into the DLL normally, and `ui_entry.cpp` just wraps it with C linkage export. Both `App.gen.cpp` and `app_root.gen.cpp` go into the shared library.

- [ ] **Step 8: Build and test**

Run: `cd C:/Users/Berkay/Downloads/reimgui && cmake -B build -G "Visual Studio 17 2022"`
Run: `cmake --build build --target hotreload_host 2>&1`
Expected: Clean compile. Both `hotreload_host.exe` and `hotreload_ui.dll` in `build/Debug/`.

Do NOT run the app — just verify both files exist:
Run: `ls build/Debug/hotreload_host.exe build/Debug/hotreload_ui.dll`

- [ ] **Step 9: Commit**

```bash
git add examples/hotreload/ CMakeLists.txt
git commit -m "feat: add examples/hotreload — DLL hot reload demo"
```

---

### Task 2: Create `templates/hotreload.ts` and register it

**Files:**
- Create: `compiler/src/templates/hotreload.ts`
- Modify: `compiler/src/init.ts` (add one import line)

- [ ] **Step 1: Create `compiler/src/templates/hotreload.ts`**

Read these files — their content becomes the template strings:
- `examples/hotreload/src/hotreload.h` → `HOTRELOAD_H` constant
- `examples/hotreload/src/ui_entry.cpp` → `UI_ENTRY_CPP` constant
- `examples/hotreload/src/AppState.h` → `APPSTATE_H` constant
- `examples/hotreload/src/main.cpp` → `MAIN_CPP` constant (change `"Hotreload Example"` to `"APP_NAME"`)
- `examples/hotreload/src/App.tsx` → `APP_TSX` constant

Follow the pattern of `compiler/src/templates/persistence.ts`.

The `APPSTATE_INTERFACE`:
```ts
const APPSTATE_INTERFACE = `interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}`;
```

Custom CMake function for hotreload (two targets: host exe + UI shared lib):

```ts
function cmakeHotreload(projectName: string): string {
    return `cmake_minimum_required(VERSION 3.25)
project(${projectName} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
set(FETCHCONTENT_QUIET OFF)

FetchContent_Declare(
    imx
    GIT_REPOSITORY https://github.com/bgocumlu/imx.git
    GIT_TAG main
    GIT_SHALLOW TRUE
    GIT_PROGRESS TRUE
)
message(STATUS "Fetching IMX (includes ImGui + GLFW)...")
FetchContent_MakeAvailable(imx)

include(ImxCompile)

imx_compile_tsx(GENERATED
    SOURCES src/App.tsx
    OUTPUT_DIR \${CMAKE_BINARY_DIR}/generated
)

# UI shared library (hot-reloadable)
add_library(${projectName}_ui SHARED
    src/ui_entry.cpp
    \${GENERATED}
)
target_link_libraries(${projectName}_ui PRIVATE imx::renderer)
target_include_directories(${projectName}_ui PRIVATE \${CMAKE_BINARY_DIR}/generated \${CMAKE_CURRENT_SOURCE_DIR}/src)

# Host executable (loads UI module dynamically)
add_executable(${projectName}
    src/main.cpp
)
set_target_properties(${projectName} PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
target_link_libraries(${projectName} PRIVATE imx::renderer)
target_include_directories(${projectName} PRIVATE \${CMAKE_CURRENT_SOURCE_DIR}/src)

# Copy DLL/SO next to host exe after build
add_custom_command(TARGET ${projectName}_ui POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy $<TARGET_FILE:${projectName}_ui> $<TARGET_FILE_DIR:${projectName}>
    COMMENT "Copying UI module to host directory"
)
add_dependencies(${projectName} ${projectName}_ui)

# Copy public/ assets to output directory
add_custom_command(TARGET ${projectName} POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy_directory
        \${CMAKE_CURRENT_SOURCE_DIR}/public
        $<TARGET_FILE_DIR:${projectName}>
    COMMENT "Copying public/ assets"
)
`;
}
```

The `generate()` function writes:
- `main.cpp` (APP_NAME replaced)
- `AppState.h`
- `hotreload.h`
- `ui_entry.cpp`
- `App.tsx`
- `imx.d.ts` (via `buildImxDts`)
- `tsconfig.json`
- `CMakeLists.txt` (via `cmakeHotreload`)
- `.gitignore`
- `public/`

IMPORTANT for MAIN_CPP: the DLL name uses `${projectName}_ui` in the template CMake, so the load path in main.cpp must match. Use `APP_NAME_ui.dll` / `libAPP_NAME_ui.so` / `libAPP_NAME_ui.dylib` — and the `APP_NAME` replacement handles it. Wait — the replacement is `MAIN_CPP.replace('APP_NAME', projectName)`. If the DLL load line is:
```cpp
app.module.load("APP_NAME_ui.dll");
```
After replacement it becomes `app.module.load("myapp_ui.dll");` which matches `myapp_ui.dll` from `add_library(myapp_ui SHARED ...)`. This works.

Console output says `with template "hotreload"`. File descriptions:
```
    src/main.cpp          — host exe with DLL hot reload loop
    src/AppState.h        — C++ state struct (lives in host, survives reloads)
    src/hotreload.h       — cross-platform DLL/SO loader
    src/ui_entry.cpp      — DLL export wrapper for imx_render()
    src/App.tsx           — your root component (compiled into DLL)
```

Register as: `registerTemplate({ name: 'hotreload', description: 'DLL hot reload for live UI iteration', generate })`

- [ ] **Step 2: Add side-effect import in `compiler/src/init.ts`**

Add after the existing networking import:
```ts
import './templates/hotreload.js';
```

- [ ] **Step 3: Build compiler and test template**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: 112/112 pass.

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_hot --template=hotreload`

Run: `ls test_hot/src/`
Expected: `App.tsx  AppState.h  hotreload.h  imx.d.ts  main.cpp  ui_entry.cpp`

Run: `grep "hotreload_ui\|APP_NAME_ui" test_hot/CMakeLists.txt`
Expected: shows `test_hot_ui` targets

Run: `rm -rf test_hot`

- [ ] **Step 4: Test error lists all five templates**

Run: `node compiler/dist/index.js init test_bad --template=nonexistent 2>&1`
Expected: `Available: minimal, async, persistence, networking, hotreload`

- [ ] **Step 5: Rebuild dist/ and commit**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`

```bash
git add compiler/src/templates/hotreload.ts compiler/src/init.ts compiler/dist/
git commit -m "feat: Phase 20 step 5 — hotreload template with DLL hot reload"
```
