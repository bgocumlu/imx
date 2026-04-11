# Phase 20 Step 4: Networking Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `networking` template and matching `examples/networking/` example that demonstrates HTTP client using cpp-httplib with background threading via `run_async`.

**Architecture:** Build example first (fast local build), verify it compiles, then extract to `templates/networking.ts`. Reuses `async.h` from the async template for background threading. Custom CMakeLists.txt adds cpp-httplib via FetchContent.

**Tech Stack:** cpp-httplib (header-only HTTP client, FetchContent), `std::thread` via async.h, plain HTTP.

---

### Task 1: Build `examples/networking/` and verify it compiles

**Files:**
- Create: `examples/networking/src/async.h`
- Create: `examples/networking/src/AppState.h`
- Create: `examples/networking/src/main.cpp`
- Create: `examples/networking/src/App.tsx`
- Create: `examples/networking/src/imx.d.ts`
- Create: `examples/networking/tsconfig.json`
- Create: `examples/networking/public/.gitkeep`
- Modify: `CMakeLists.txt` (add cpp-httplib FetchContent + networking_app target before `endif()` at line 335)

- [ ] **Step 1: Create `examples/networking/src/async.h`**

Copy from `examples/async/src/async.h` verbatim — same `imx::run_async<T>()` helper.

```cpp
#pragma once
#include <thread>
#include <functional>
#include <imx/runtime.h>

namespace imx {

// Runs `work` on a background thread, then calls `on_done` with the result.
// Calls request_frame() so the UI wakes up to display the result.
// Replace with a thread pool if you need to limit concurrency.
template<typename T>
void run_async(Runtime& runtime, std::function<T()> work, std::function<void(T)> on_done) {
    std::thread([&runtime, work = std::move(work), on_done = std::move(on_done)]() {
        T result = work();
        on_done(std::move(result));
        runtime.request_frame();
    }).detach();
}

} // namespace imx
```

- [ ] **Step 2: Create `examples/networking/src/AppState.h`**

```cpp
#pragma once
#include <string>
#include <functional>

struct AppState {
    std::string url = "http://jsonplaceholder.typicode.com/todos/1";
    std::string response = "";
    bool loading = false;
    std::function<void()> onFetch;
};
```

- [ ] **Step 3: Create `examples/networking/src/main.cpp`**

Read `examples/async/src/main.cpp` for the boilerplate pattern. Create main.cpp with these differences:
- `#include <httplib.h>` instead of `#include <chrono>`
- Keep `#include <thread>` and `#include "async.h"`
- `#include "AppState.h"`
- Window title: `"Networking Example"`
- Wire the fetch callback:

```cpp
    // Wire up the HTTP fetch callback
    app.state.onFetch = [&]() {
        app.state.loading = true;
        app.state.response = "";
        std::string url = app.state.url;
        imx::run_async<std::string>(
            app.runtime,
            [url]() -> std::string {
                // Parse http://host/path
                auto scheme_end = url.find("://");
                if (scheme_end == std::string::npos)
                    return "Error: invalid URL (must start with http://)";
                auto host_start = scheme_end + 3;
                auto path_start = url.find('/', host_start);
                std::string host = (path_start != std::string::npos)
                    ? url.substr(0, path_start) : url;
                std::string path = (path_start != std::string::npos)
                    ? url.substr(path_start) : "/";

                // For HTTPS: #define CPPHTTPLIB_OPENSSL_SUPPORT and link OpenSSL
                httplib::Client cli(host);
                cli.set_connection_timeout(5);
                cli.set_read_timeout(5);
                auto res = cli.Get(path);
                if (res) return res->body;
                return "Error: request failed";
            },
            [&](std::string body) {
                app.state.response = std::move(body);
                app.state.loading = false;
            }
        );
    };
```

Full main.cpp follows the same GLFW/OpenGL structure as async example.

- [ ] **Step 4: Create `examples/networking/src/App.tsx`**

```tsx
export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Networking Demo">
        <Column gap={8}>
          <Text>HTTP Client Example</Text>
          <Separator />
          <TextInput label="URL" value={props.url} />
          <Button title="Fetch" onPress={props.onFetch} disabled={props.loading} />
          {props.loading && <Text color={[1, 0.8, 0, 1]}>Loading...</Text>}
          {props.response !== "" && <Text wrapped={true}>{props.response}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
```

- [ ] **Step 5: Create `examples/networking/src/imx.d.ts` and `examples/networking/tsconfig.json`**

Copy `imx.d.ts` from `examples/async/src/imx.d.ts` but replace the `interface AppState` block with:
```ts
interface AppState {
    url: string;
    response: string;
    loading: boolean;
    onFetch: () => void;
}
```

Copy `tsconfig.json` from `examples/async/tsconfig.json` verbatim.

Create `examples/networking/public/.gitkeep`.

- [ ] **Step 6: Add cpp-httplib FetchContent and `networking_app` target to `CMakeLists.txt`**

Add before the `endif()` at line 335:

```cmake
    # --- cpp-httplib (for networking example) ---
    FetchContent_Declare(httplib
        GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
        GIT_TAG v0.18.3
        GIT_SHALLOW TRUE
    )
    set(HTTPLIB_COMPILE OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(httplib)

    # --- networking_app: HTTP client scaffolding ---
    imx_compile_tsx(NETWORKING_GENERATED
        SOURCES
            examples/networking/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_networking
    )

    add_executable(networking_app
        examples/networking/src/main.cpp
        ${NETWORKING_GENERATED}
    )
    set_target_properties(networking_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(networking_app PRIVATE imx_renderer httplib::httplib)
    target_include_directories(networking_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_networking
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/networking/src
    )
```

Note: `HTTPLIB_COMPILE OFF` keeps it header-only (no separate .cpp compilation).

- [ ] **Step 7: Build and test the example**

Run: `cd C:/Users/Berkay/Downloads/reimgui && cmake -B build -G "Visual Studio 17 2022"`
Run: `cmake --build build --target networking_app 2>&1`
Expected: Clean compile (cpp-httplib fetched automatically).

Do NOT run the app — just verify it compiles.

- [ ] **Step 8: Commit**

```bash
git add examples/networking/ CMakeLists.txt
git commit -m "feat: add examples/networking — HTTP client demo"
```

---

### Task 2: Create `templates/networking.ts` and register it

**Files:**
- Create: `compiler/src/templates/networking.ts`
- Modify: `compiler/src/init.ts` (add one import line)

- [ ] **Step 1: Create `compiler/src/templates/networking.ts`**

Read these files — their content becomes the template strings:
- `examples/networking/src/async.h` → `ASYNC_H` constant
- `examples/networking/src/AppState.h` → `APPSTATE_H` constant
- `examples/networking/src/main.cpp` → `MAIN_CPP` constant (change window title `"Networking Example"` to `"APP_NAME"`)
- `examples/networking/src/App.tsx` → `APP_TSX` constant

Follow the exact same pattern as `compiler/src/templates/persistence.ts`.

The `APPSTATE_INTERFACE` for imx.d.ts:
```ts
const APPSTATE_INTERFACE = `interface AppState {
    url: string;
    response: string;
    loading: boolean;
    onFetch: () => void;
}`;
```

Custom CMake function (like persistence but with cpp-httplib instead of nlohmann/json):
```ts
function cmakeWithHttplib(projectName: string): string {
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
    httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.18.3
    GIT_SHALLOW TRUE
)
set(HTTPLIB_COMPILE OFF CACHE BOOL "" FORCE)

message(STATUS "Fetching IMX (includes ImGui + GLFW)...")
FetchContent_MakeAvailable(imx httplib)

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
target_link_libraries(${projectName} PRIVATE imx::renderer httplib::httplib)
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

The `generate()` function writes:
- `main.cpp` (with APP_NAME replaced)
- `AppState.h`
- `async.h`
- `App.tsx`
- `imx.d.ts` (via `buildImxDts(APPSTATE_INTERFACE)`)
- `tsconfig.json` (shared TSCONFIG)
- `CMakeLists.txt` (via `cmakeWithHttplib(projectName)`)
- `.gitignore` (shared GITIGNORE)
- `public/` directory

Console output says `with template "networking"`. File descriptions:
```
    src/main.cpp          — app shell with HTTP fetch callback
    src/AppState.h        — C++ state struct with URL/response fields
    src/async.h           — run_async() helper (std::thread)
    src/App.tsx           — networking demo UI
```

Register as: `registerTemplate({ name: 'networking', description: 'HTTP client with cpp-httplib', generate })`

IMPORTANT: Escape backticks in template strings where needed.

- [ ] **Step 2: Add side-effect import in `compiler/src/init.ts`**

Add after the existing persistence import:
```ts
import './templates/networking.js';
```

- [ ] **Step 3: Build compiler and test template**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: 112/112 pass.

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_net --template=networking`
Expected: Creates project with `src/async.h`.

Run: `ls test_net/src/`
Expected: `App.tsx  AppState.h  async.h  imx.d.ts  main.cpp`

Run: `grep "httplib" test_net/CMakeLists.txt`
Expected: matches.

Run: `rm -rf test_net`

- [ ] **Step 4: Test error lists all four templates**

Run: `node compiler/dist/index.js init test_bad --template=nonexistent 2>&1`
Expected: `Available: minimal, async, persistence, networking`

- [ ] **Step 5: Rebuild dist/ and commit**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`

```bash
git add compiler/src/templates/networking.ts compiler/src/init.ts compiler/dist/
git commit -m "feat: Phase 20 step 4 — networking template with cpp-httplib"
```
