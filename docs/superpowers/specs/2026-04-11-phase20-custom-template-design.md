# Phase 20 Step 7: Custom Template (Multi-Select)

## Goal

Allow combining multiple templates via comma-separated `--template` flag or interactive multi-select. No separate "custom" template entry — just multi-select on existing templates.

## UX

### CLI flag
```bash
imxc init my_app --template=async,persistence,filedialog
```

### Interactive menu
```
Select a template:

  1. minimal — Bare ImGui app with struct binding
  2. async — Background tasks with std::thread
  3. persistence — JSON save/load with nlohmann/json
  4. networking — HTTP client with cpp-httplib
  5. hotreload — DLL hot reload for live UI iteration
  6. filedialog — Native file dialogs + drag & drop

Template (number or name, comma-separated to combine): 2,3
```

### `imxc templates` output
```
Available templates:
  ...
Usage: imxc init <project-name> --template=<name>
Combine: imxc init <project-name> --template=async,persistence
```

## How combining works

Each feature template is a composable module. When multiple are selected, the generator:

1. **Merges AppState fields** — union of all selected templates' C++ struct fields + TS interface fields
2. **Copies header files** — each template's headers (async.h, persistence.h, etc.)
3. **Merges main.cpp** — base GLFW/OpenGL boilerplate + each feature's `#include` lines + callback wiring blocks
4. **Merges App.tsx** — DockSpace with one Window per feature
5. **Merges CMakeLists.txt** — base + extra FetchContent/link libs for persistence (nlohmann/json)
6. **Merges imx.d.ts** — union AppState interface

## Feature module data structure

Each feature (async, persistence, networking, filedialog) is defined as a composable module in `compiler/src/templates/custom.ts`:

```ts
interface FeatureModule {
    name: string;
    requires?: string[];           // auto-include dependencies (networking → async)
    includes: string[];            // #include lines for main.cpp
    appStateFields: string;        // C++ struct fields
    appStateTs: string;            // TS interface fields  
    callbacks: string;             // main.cpp callback wiring code
    tsxWindow: string;             // App.tsx Window content
    extraFiles?: Record<string, string>;  // additional files to write (async.h, persistence.h, etc.)
    cmakeDeps?: string;            // extra CMake FetchContent + link libs
}
```

## Dependencies

- **networking** auto-includes **async** (needs `run_async`)
- **hotreload** is exclusive — cannot combine (different build architecture with DLL split). If hotreload is in the list with others, error and explain.

## Single template pass-through

If only one template is specified, use the existing template generator directly (no merging). `--template=async` works exactly as before.

## Files changed

- Modify: `compiler/src/templates/index.ts` — update `promptTemplateName()` to accept comma-separated
- Create: `compiler/src/templates/custom.ts` — feature module definitions + merge logic
- Modify: `compiler/src/init.ts` — add import for custom.ts, handle multi-template in `initProject()`
- Modify: `compiler/src/index.ts` — parse comma-separated `--template`, update usage/help text
