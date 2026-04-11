# Phase 20 Step 2: Async Template

## Goal

Add an `async` template to `imxc init` that scaffolds background task execution using pure C++ standard library (`std::thread`). Demonstrates the IMX integration pattern: do work off-thread, update state, call `request_frame()`.

## Files generated

| File | Description |
|------|-------------|
| `src/async.h` | Single-header `imx::run_async()` helper (~30 lines) |
| `src/main.cpp` | Same GLFW/OpenGL shell as minimal, wires async callback |
| `src/AppState.h` | State struct with loading flag, result string, fetch callback |
| `src/App.tsx` | Button triggers async work, shows loading state, displays result |
| `src/imx.d.ts` | Shared (from `templates/index.ts`) |
| `tsconfig.json` | Shared |
| `CMakeLists.txt` | Same as minimal (no new deps) |
| `.gitignore` | Shared |
| `public/` | Empty asset directory |

## `async.h`

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

Intentionally minimal. User replaces with thread pool / cancellation / progress when needed. The pattern (`work` -> `update state` -> `request_frame()`) stays the same.

## `AppState.h`

```cpp
#pragma once
#include <string>
#include <functional>

struct AppState {
    bool loading = false;
    std::string result = "";
    std::function<void()> onFetchData;
};
```

## `main.cpp`

Same GLFW/OpenGL boilerplate as minimal template. The only difference is the `onFetchData` callback wiring:

```cpp
app.state.onFetchData = [&]() {
    app.state.loading = true;
    app.state.result = "";
    imx::run_async<std::string>(
        app.runtime,
        []() {
            // Simulate work (replace with real computation)
            std::this_thread::sleep_for(std::chrono::seconds(2));
            return std::string("Data loaded successfully!");
        },
        [&](std::string res) {
            app.state.result = std::move(res);
            app.state.loading = false;
        }
    );
};
```

Also includes `#include "async.h"` and `#include <thread>`.

## `App.tsx`

```tsx
export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Async Demo">
        <Column gap={8}>
          <Text>Background Task Example</Text>
          <Separator />
          <Button
            title="Fetch Data"
            onPress={props.onFetchData}
            disabled={props.loading}
          />
          {props.loading && <Text color={[1, 0.8, 0, 1]}>Loading...</Text>}
          {props.result !== "" && <Text color={[0, 1, 0, 1]}>Result: {props.result}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
```

## `AppState` interface in `imx.d.ts`

The shared `IMX_DTS` in `templates/index.ts` has a minimal `AppState` for the minimal template. Each template needs its own `AppState` interface in its own `imx.d.ts`. Solution: the async template writes its own `imx.d.ts` that replaces the `AppState` block while keeping all other type definitions.

Approach: the shared `IMX_DTS` string already contains `interface AppState { ... }`. The async template generates a custom `imx.d.ts` by replacing that block with its own AppState definition. Simpler approach: just write the full `imx.d.ts` from the template (copy the shared one, swap AppState). Since the type defs are identical across templates except for AppState, factor out the AppState block.

**Decision:** Split `IMX_DTS` in `templates/index.ts` into two parts:
- `IMX_DTS_BEFORE_APPSTATE` — everything before `interface AppState`
- `IMX_DTS_AFTER_APPSTATE` — everything after the closing `}`
- Each template provides its own AppState interface string
- `buildImxDts(appStateInterface: string)` helper assembles the full file

## Template registration

New file: `compiler/src/templates/async.ts`
- Imports shared strings + `buildImxDts` from `./index.js`
- Contains ASYNC_H, MAIN_CPP, APPSTATE_H template strings
- Has its own APP_TSX (different from minimal)
- Calls `registerTemplate({ name: 'async', description: 'Background tasks with std::thread', generate })`

Side-effect import added to `init.ts`: `import './templates/async.js';`

## What doesn't change

- `templates/index.ts` structure (just split IMX_DTS and add helper)
- `templates/minimal.ts` (updated to use `buildImxDts`)
- `init.ts` (add one import line)
- `index.ts` — unchanged
- CMakeLists.txt content — identical to minimal (no new dependencies)

## Cross-platform

Fully cross-platform. `std::thread`, `std::function`, `std::chrono` are C++ standard library. No `#ifdef` needed.
