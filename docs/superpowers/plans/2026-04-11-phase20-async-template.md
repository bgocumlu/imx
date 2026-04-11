# Phase 20 Step 2: Async Template — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `async` project template to `imxc init` and a matching `examples/async/` example. Both use the same stripped-down code. Build and test the example first (fast, local), then extract to the template.

**Architecture:** Split the shared `IMX_DTS` string so each template can provide its own `AppState` interface. Create `examples/async/` with the async demo files. Create `templates/async.ts` with the same content as strings. Register it so `imxc init my_app --template=async` works.

**Tech Stack:** C++ standard library (`std::thread`, `std::function`, `std::chrono`), no new dependencies.

---

### Task 1: Split IMX_DTS to support per-template AppState

**Files:**
- Modify: `compiler/src/templates/index.ts`
- Modify: `compiler/src/templates/minimal.ts`
- Modify: `compiler/src/init.ts`

The current `IMX_DTS` constant contains a hardcoded `interface AppState { count: number; speed: number; onIncrement: () => void; }` block (lines 94-98 of the string content in `templates/index.ts`). Each template needs a different AppState. Split into prefix/suffix and add a builder helper.

- [ ] **Step 1: In `compiler/src/templates/index.ts`, replace the single `IMX_DTS` export with `IMX_DTS_PREFIX`, `IMX_DTS_SUFFIX`, and `buildImxDts()`**

The split points in the existing `IMX_DTS` string:
- `IMX_DTS_PREFIX` = from `// imx.d.ts` through the closing `}` of `interface ItemInteractionProps` (ends with `}\n\n`)
- `IMX_DTS_SUFFIX` = from `\ninterface WindowProps` through the closing of the `declare module "imx/jsx-runtime"` block and final backtick
- The `interface AppState { ... }` block between them is removed

Add the helper:
```ts
export function buildImxDts(appStateInterface: string): string {
    return IMX_DTS_PREFIX + appStateInterface + '\n' + IMX_DTS_SUFFIX;
}
```

Remove the old `export const IMX_DTS`.

- [ ] **Step 2: Update `compiler/src/templates/minimal.ts` to use `buildImxDts`**

Change import: replace `IMX_DTS` with `buildImxDts`.

Add constant:
```ts
const APPSTATE_INTERFACE = `interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}`;
```

Change the write line in `generate()`:
```ts
fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(APPSTATE_INTERFACE));
```

- [ ] **Step 3: Update `compiler/src/init.ts` to use `buildImxDts`**

Change import: replace `IMX_DTS` with `buildImxDts`.

Change the write line in `addToProject()`:
```ts
fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(`interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}`));
```

- [ ] **Step 4: Build and verify**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: 112/112 tests pass.

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_minimal --template=minimal && grep "count" test_minimal/src/imx.d.ts && rm -rf test_minimal`
Expected: `    count: number;`

- [ ] **Step 5: Commit**

```bash
git add compiler/src/templates/index.ts compiler/src/templates/minimal.ts compiler/src/init.ts
git commit -m "refactor: split IMX_DTS for per-template AppState"
```

---

### Task 2: Build `examples/async/` and verify it compiles

**Files:**
- Create: `examples/async/src/main.cpp`
- Create: `examples/async/src/AppState.h`
- Create: `examples/async/src/async.h`
- Create: `examples/async/src/App.tsx`
- Create: `examples/async/src/imx.d.ts`
- Create: `examples/async/tsconfig.json`
- Create: `examples/async/public/` (empty directory)
- Modify: `CMakeLists.txt` (add async_app target, before `endif()` at line 290)

- [ ] **Step 1: Create `examples/async/src/async.h`**

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

- [ ] **Step 2: Create `examples/async/src/AppState.h`**

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

- [ ] **Step 3: Create `examples/async/src/main.cpp`**

Same GLFW/OpenGL boilerplate as other examples (copy from `examples/hello/src/main.cpp` pattern), but with:
- `#include "async.h"` and `#include <thread>` and `#include <chrono>`
- `AppState` instead of hello's state struct
- Callback wiring:

```cpp
app.state.onFetchData = [&]() {
    app.state.loading = true;
    app.state.result = "";
    imx::run_async<std::string>(
        app.runtime,
        []() {
            // Simulate work — replace with real computation
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

The full main.cpp follows the exact same structure as the minimal template's MAIN_CPP but with the async-specific includes and callback. Window title: `"Async Example"`.

- [ ] **Step 4: Create `examples/async/src/App.tsx`**

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

- [ ] **Step 5: Create `examples/async/src/imx.d.ts` and `examples/async/tsconfig.json`**

Copy `imx.d.ts` from `examples/hello/src/imx.d.ts` but replace the `interface AppState` block with:
```ts
interface AppState {
    loading: boolean;
    result: string;
    onFetchData: () => void;
}
```

Copy `tsconfig.json` from `examples/hello/tsconfig.json` verbatim.

Create empty `examples/async/public/` directory (add a `.gitkeep` if needed).

- [ ] **Step 6: Add `async_app` target to `CMakeLists.txt`**

Add before the `endif()` at line 290:

```cmake
    # --- async_app: background task scaffolding ---
    imx_compile_tsx(ASYNC_GENERATED
        SOURCES
            examples/async/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_async
    )

    add_executable(async_app
        examples/async/src/main.cpp
        ${ASYNC_GENERATED}
    )
    set_target_properties(async_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(async_app PRIVATE imx_renderer)
    target_include_directories(async_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_async
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/async/src
    )
```

- [ ] **Step 7: Build and test the example**

Run: `cd C:/Users/Berkay/Downloads/reimgui && cmake -B build -G "Visual Studio 17 2022"`
Run: `cmake --build build --target async_app`
Expected: Clean compile.

Run: `./build/Debug/async_app.exe`
Expected: Window opens with "Async Demo", click "Fetch Data", see "Loading..." for 2 seconds, then "Result: Data loaded successfully!" appears. Close the window.

- [ ] **Step 8: Commit**

```bash
git add examples/async/ CMakeLists.txt
git commit -m "feat: add examples/async — background task demo"
```

---

### Task 3: Create `templates/async.ts` and register it

**Files:**
- Create: `compiler/src/templates/async.ts`
- Modify: `compiler/src/init.ts` (add one import line)

The template strings are the same content as the example files from Task 2.

- [ ] **Step 1: Create `compiler/src/templates/async.ts`**

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerTemplate, buildImxDts, TSCONFIG, GITIGNORE, cmakeTemplate } from './index.js';

const APPSTATE_INTERFACE = `interface AppState {
    loading: boolean;
    result: string;
    onFetchData: () => void;
}`;

const APPSTATE_H = `#pragma once
#include <string>
#include <functional>

struct AppState {
    bool loading = false;
    std::string result = "";
    std::function<void()> onFetchData;
};
`;

const ASYNC_H = `#pragma once
#include <thread>
#include <functional>
#include <imx/runtime.h>

namespace imx {

// Runs \`work\` on a background thread, then calls \`on_done\` with the result.
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
`;

const APP_TSX = `export default function App(props: AppState) {
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
`;
```

The MAIN_CPP string is the same as `examples/async/src/main.cpp` content but with the window title set to `"APP_NAME"` (replaced at generation time). Copy the full main.cpp from the example, changing only `"Async Example"` to `"APP_NAME"`.

The `generate()` function:

```ts
function generate(projectDir: string, projectName: string): void {
    const srcDir = path.join(projectDir, 'src');

    if (fs.existsSync(path.join(srcDir, 'App.tsx'))) {
        console.error(`Error: ${srcDir}/App.tsx already exists. Aborting.`);
        process.exit(1);
    }

    fs.mkdirSync(srcDir, { recursive: true });
    const publicDir = path.join(projectDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'main.cpp'), MAIN_CPP.replace('APP_NAME', projectName));
    fs.writeFileSync(path.join(srcDir, 'AppState.h'), APPSTATE_H);
    fs.writeFileSync(path.join(srcDir, 'async.h'), ASYNC_H);
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(APPSTATE_INTERFACE));
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), cmakeTemplate(projectName, 'https://github.com/bgocumlu/imx.git'));
    fs.writeFileSync(path.join(projectDir, '.gitignore'), GITIGNORE);

    console.log(`imxc: initialized project "${projectName}" with template "async"`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/main.cpp          — app shell with async callback wiring`);
    console.log(`    src/AppState.h        — C++ state struct with loading/result fields`);
    console.log(`    src/async.h           — run_async() helper (std::thread)`);
    console.log(`    src/App.tsx           — async demo UI`);
    console.log(`    src/imx.d.ts          — type definitions for IDE support`);
    console.log(`    tsconfig.json         — TypeScript config`);
    console.log(`    CMakeLists.txt        — build config with FetchContent`);
    console.log(`    .gitignore            — ignores build/, node_modules/, *.ini`);
    console.log(`    public/               — static assets (copied to exe directory)`);
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd ${projectName}`);
    console.log(`    cmake -B build`);
    console.log(`    cmake --build build`);
}

registerTemplate({ name: 'async', description: 'Background tasks with std::thread', generate });
```

- [ ] **Step 2: Add side-effect import in `compiler/src/init.ts`**

Add after `import './templates/minimal.js';`:
```ts
import './templates/async.js';
```

- [ ] **Step 3: Build compiler and test template**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: 112/112 tests pass.

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_async --template=async`
Expected: Creates project with `src/async.h`.

Run: `ls test_async/src/`
Expected: `App.tsx  AppState.h  async.h  imx.d.ts  main.cpp`

Run: `grep "loading" test_async/src/imx.d.ts && grep "run_async" test_async/src/async.h`
Expected: Both match.

Run: `rm -rf test_async`

- [ ] **Step 4: Test both templates still listed**

Run: `node compiler/dist/index.js init test_bad --template=nonexistent 2>&1`
Expected: `Error: unknown template "nonexistent". Available: minimal, async`

- [ ] **Step 5: Rebuild dist/ and commit**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`

```bash
git add compiler/src/templates/async.ts compiler/src/init.ts compiler/dist/
git commit -m "feat: Phase 20 step 2 — async template for imxc init"
```
