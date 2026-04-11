# Phase 20 Step 3: Persistence Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `persistence` project template and matching `examples/persistence/` example that demonstrates JSON save/load using nlohmann/json.

**Architecture:** Build the example first (fast local build), verify it compiles and runs, then extract the same code into `templates/persistence.ts`. The persistence template needs a custom CMakeLists.txt string (adds nlohmann/json FetchContent), unlike minimal/async which use the shared `cmakeTemplate()`.

**Tech Stack:** nlohmann/json (FetchContent, header-only), `std::fstream` for file I/O, no platform-specific code.

---

### Task 1: Build `examples/persistence/` and verify it compiles

**Files:**
- Create: `examples/persistence/src/persistence.h`
- Create: `examples/persistence/src/AppState.h`
- Create: `examples/persistence/src/main.cpp`
- Create: `examples/persistence/src/App.tsx`
- Create: `examples/persistence/src/imx.d.ts`
- Create: `examples/persistence/tsconfig.json`
- Create: `examples/persistence/public/.gitkeep`
- Modify: `CMakeLists.txt` (add nlohmann/json FetchContent + persistence_app target)

- [ ] **Step 1: Create `examples/persistence/src/persistence.h`**

```cpp
#pragma once
#include <fstream>
#include <string>
#include <nlohmann/json.hpp>

namespace imx {

// Save state as formatted JSON. Returns true on success.
// Saves next to the executable by default — change path for platform app data dirs.
template<typename T>
bool save_json(const std::string& path, const T& state) {
    std::ofstream f(path);
    if (!f) return false;
    f << nlohmann::json(state).dump(2);
    return true;
}

// Load state from JSON file. Returns true on success, leaves state unchanged on failure.
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

- [ ] **Step 2: Create `examples/persistence/src/AppState.h`**

```cpp
#pragma once
#include <string>
#include <functional>
#include <nlohmann/json.hpp>

struct AppState {
    std::string name = "World";
    float volume = 50.0F;
    bool darkMode = true;
    std::function<void()> onSave;
    std::function<void()> onLoad;
};

// Only serialize data fields — callbacks are not persisted
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AppState, name, volume, darkMode)
```

- [ ] **Step 3: Create `examples/persistence/src/main.cpp`**

Read `examples/async/src/main.cpp` for the boilerplate pattern. Create main.cpp with these differences:
- `#include "persistence.h"` (no async.h, no thread/chrono)
- Window title: `"Persistence Example"`
- After creating App, auto-load state:
```cpp
imx::load_json("state.json", app.state);
```
- Wire callbacks:
```cpp
app.state.onSave = [&]() {
    imx::save_json("state.json", app.state);
};
app.state.onLoad = [&]() {
    imx::load_json("state.json", app.state);
    app.runtime.request_frame();
};
```

Full main.cpp follows the same structure as async example (GLFW init, ImGui setup, render loop, cleanup) but with the persistence-specific includes and callbacks above.

- [ ] **Step 4: Create `examples/persistence/src/App.tsx`**

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

- [ ] **Step 5: Create `examples/persistence/src/imx.d.ts` and `examples/persistence/tsconfig.json`**

Copy `imx.d.ts` from `examples/async/src/imx.d.ts` but replace the `interface AppState` block with:
```ts
interface AppState {
    name: string;
    volume: number;
    darkMode: boolean;
    onSave: () => void;
    onLoad: () => void;
}
```

Copy `tsconfig.json` from `examples/async/tsconfig.json` verbatim.

Create `examples/persistence/public/.gitkeep`.

- [ ] **Step 6: Add nlohmann/json FetchContent and `persistence_app` target to `CMakeLists.txt`**

Add inside the `if(IMX_BUILD_EXAMPLES)` block, before `endif()` at line 308. First add the FetchContent for nlohmann/json (only needed for the persistence example), then the target:

```cmake
    # --- nlohmann/json (for persistence example) ---
    FetchContent_Declare(json
        GIT_REPOSITORY https://github.com/nlohmann/json.git
        GIT_TAG v3.11.3
        GIT_SHALLOW TRUE
    )
    set(JSON_BuildTests OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(json)

    # --- persistence_app: JSON save/load scaffolding ---
    imx_compile_tsx(PERSISTENCE_GENERATED
        SOURCES
            examples/persistence/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_persistence
    )

    add_executable(persistence_app
        examples/persistence/src/main.cpp
        ${PERSISTENCE_GENERATED}
    )
    set_target_properties(persistence_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(persistence_app PRIVATE imx_renderer nlohmann_json::nlohmann_json)
    target_include_directories(persistence_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_persistence
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/persistence/src
    )
```

- [ ] **Step 7: Build and test the example**

Run: `cd C:/Users/Berkay/Downloads/reimgui && cmake -B build -G "Visual Studio 17 2022"`
Run: `cmake --build build --target persistence_app`
Expected: Clean compile (nlohmann/json fetched automatically).

Do NOT run the app — just verify it compiles.

- [ ] **Step 8: Commit**

```bash
git add examples/persistence/ CMakeLists.txt
git commit -m "feat: add examples/persistence — JSON save/load demo"
```

---

### Task 2: Create `templates/persistence.ts` and register it

**Files:**
- Create: `compiler/src/templates/persistence.ts`
- Modify: `compiler/src/init.ts` (add one import line)

- [ ] **Step 1: Create `compiler/src/templates/persistence.ts`**

Read these files first — their content becomes the template strings:
- `examples/persistence/src/persistence.h` → `PERSISTENCE_H` constant
- `examples/persistence/src/AppState.h` → `APPSTATE_H` constant
- `examples/persistence/src/main.cpp` → `MAIN_CPP` constant (change window title from `"Persistence Example"` to `"APP_NAME"`)
- `examples/persistence/src/App.tsx` → `APP_TSX` constant

Also read `compiler/src/templates/async.ts` to follow the exact same file pattern.

The template needs a custom CMakeLists.txt string because it adds nlohmann/json. Define a `CMAKELISTS` constant instead of using the shared `cmakeTemplate()`:

```ts
function cmakeWithJson(projectName: string): string {
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

FetchContent_Declare(
    json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    GIT_SHALLOW TRUE
)
set(JSON_BuildTests OFF CACHE BOOL "" FORCE)

message(STATUS "Fetching IMX (includes ImGui + GLFW)...")
FetchContent_MakeAvailable(imx json)

include(ImxCompile)

imx_compile_tsx(GENERATED
    SOURCES src/App.tsx
    OUTPUT_DIR \${CMAKE_BINARY_DIR}/generated
)

add_executable(${projectName}
    src/main.cpp
    \${GENERATED}
)
set_target_properties(${projectName} PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
target_link_libraries(${projectName} PRIVATE imx::renderer nlohmann_json::nlohmann_json)
target_include_directories(${projectName} PRIVATE \${CMAKE_BINARY_DIR}/generated \${CMAKE_CURRENT_SOURCE_DIR}/src)

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

The `APPSTATE_INTERFACE` for imx.d.ts:
```ts
const APPSTATE_INTERFACE = `interface AppState {
    name: string;
    volume: number;
    darkMode: boolean;
    onSave: () => void;
    onLoad: () => void;
}`;
```

The `generate()` function writes the same files as other templates but:
- Also writes `persistence.h`
- Uses `cmakeWithJson(projectName)` instead of `cmakeTemplate()`
- Output message says `with template "persistence"`
- File descriptions reflect persistence template files

Register as: `registerTemplate({ name: 'persistence', description: 'JSON save/load with nlohmann/json', generate })`

IMPORTANT: Escape backticks in template strings where needed.

- [ ] **Step 2: Add side-effect import in `compiler/src/init.ts`**

Add after the existing async import:
```ts
import './templates/persistence.js';
```

- [ ] **Step 3: Build compiler and test template**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: 112/112 pass.

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_persist --template=persistence`
Expected: Creates project with `src/persistence.h`.

Run: `ls test_persist/src/`
Expected: `App.tsx  AppState.h  imx.d.ts  main.cpp  persistence.h`

Run: `grep "save_json" test_persist/src/persistence.h`
Expected: matches.

Run: `grep "nlohmann_json" test_persist/CMakeLists.txt`
Expected: matches.

Run: `rm -rf test_persist`

- [ ] **Step 4: Test error lists all three templates**

Run: `node compiler/dist/index.js init test_bad --template=nonexistent 2>&1`
Expected: `Available: minimal, async, persistence`

- [ ] **Step 5: Rebuild dist/ and commit**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`

```bash
git add compiler/src/templates/persistence.ts compiler/src/init.ts compiler/dist/
git commit -m "feat: Phase 20 step 3 — persistence template with nlohmann/json"
```
