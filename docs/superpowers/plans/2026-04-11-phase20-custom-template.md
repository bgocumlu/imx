# Phase 20 Step 7: Custom Template (Multi-Select) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow combining multiple templates via comma-separated `--template` flag or interactive multi-select. `imxc init my_app --template=async,persistence` generates a project with both features merged.

**Architecture:** Define composable feature modules with AppState fields, headers, callback wiring, and TSX windows. When multiple templates are selected, merge them into one project. Single template selection passes through to existing generators unchanged.

**Tech Stack:** No new dependencies. Pure TypeScript composition logic.

---

### Task 1: Create `templates/custom.ts` with feature modules and merge logic

**Files:**
- Create: `compiler/src/templates/custom.ts`

This file defines each feature as a composable module and provides a `generateCombined()` function that merges selected features into one project.

- [ ] **Step 1: Create `compiler/src/templates/custom.ts`**

Read these template files first to understand the content that gets composed:
- `compiler/src/templates/async.ts`
- `compiler/src/templates/persistence.ts`
- `compiler/src/templates/networking.ts`
- `compiler/src/templates/filedialog.ts`

Also read `compiler/src/templates/minimal.ts` for the base main.cpp boilerplate structure.

The file should define:

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildImxDts, TSCONFIG, GITIGNORE, cmakeTemplate } from './index.js';

interface FeatureModule {
    name: string;
    description: string;
    requires?: string[];
    exclusive?: boolean;
    includes: string[];        // extra #include lines for main.cpp
    appStateCppFields: string; // C++ struct fields (one per line, with trailing semicolons)
    appStateTsFields: string;  // TypeScript interface fields
    appStateHeaders: string;   // extra #include lines for AppState.h
    callbacks: string;         // main.cpp callback wiring code (after state.onIncrement)
    tsxWindow: string;         // TSX window content (inside DockSpace)
    extraFiles: Record<string, string>; // filename → content (e.g. "async.h" → content)
    nlohmannMacro?: string;    // e.g. "NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AppState, ...)"
}
```

Define these feature modules (extract the relevant snippets from the existing template files):

**FEATURES array** with modules for: `async`, `persistence`, `networking`, `filedialog`

Each module's content should be extracted from the corresponding template file. For example, the `async` module:
- `includes`: `['#include <thread>', '#include <chrono>']`
- `appStateCppFields`: `'    bool loading = false;\n    std::string result = "";\n    std::function<void()> onFetchData;'`
- `appStateTsFields`: `'    loading: boolean;\n    result: string;\n    onFetchData: () => void;'`
- `appStateHeaders`: `'#include <string>'`
- `callbacks`: the `app.state.onFetchData = [&]() { ... };` block from async's main.cpp
- `tsxWindow`: the Window content from async's App.tsx
- `extraFiles`: `{ 'async.h': ASYNC_H_CONTENT }`

For `networking`:
- `requires`: `['async']` (needs run_async)
- The callbacks include the inline URL parser + httplib::Client code
- `includes` adds `'#include <imx/httplib.h>'`
- Uses `async.h` from the async feature (auto-included)

For `persistence`:
- `appStateHeaders` includes `'#include <nlohmann/json.hpp>'`
- `nlohmannMacro`: `'NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AppState, name, volume, darkMode)'` — but this needs to list ALL data fields across all selected features. Handle this specially.
- Needs custom CMakeLists with nlohmann/json FetchContent

For `filedialog`:
- `includes`: `['#include <imx/pfd.h>']`
- `callbacks`: includes both dialog callbacks AND the `glfwSetDropCallback` setup

For `hotreload`:
- `exclusive`: `true` — cannot combine with others

Then the `generateCombined()` function:

```ts
export function generateCombined(
    features: string[],
    projectDir: string,
    projectName: string
): void
```

This function:
1. Resolves dependencies (networking → adds async if not already present)
2. Validates no exclusive features are combined with others
3. Collects all unique includes, fields, callbacks, tsx windows, extra files
4. Generates merged AppState.h (union of fields + headers + nlohmann macro if persistence included)
5. Generates merged main.cpp (base boilerplate + all includes + all callbacks)
6. Generates merged App.tsx (DockSpace with all feature windows)
7. Generates merged imx.d.ts (union AppState interface)
8. Picks CMakeLists (custom if persistence included, standard otherwise)
9. Writes all files

The base main.cpp boilerplate is the same as minimal — GLFW/OpenGL init, ImGui setup, render loop. The differences are:
- Extra `#include` lines at the top
- Extra callback wiring after `app.state.onIncrement = ...`
- For persistence: auto-load line before main loop
- For filedialog: `glfwSetDropCallback` after `glfwSetWindowUserPointer`

The merged App.tsx has one Window per feature inside a DockSpace.

For the nlohmann macro when persistence is combined with other features: the macro needs to list ALL non-function data fields from ALL features. Build this dynamically from the feature modules.

- [ ] **Step 2: Build and verify compilation**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

- [ ] **Step 3: Commit**

```bash
git add compiler/src/templates/custom.ts
git commit -m "feat: add custom template composition module"
```

---

### Task 2: Update init.ts and index.ts for multi-template support

**Files:**
- Modify: `compiler/src/init.ts`
- Modify: `compiler/src/index.ts`
- Modify: `compiler/src/templates/index.ts`

- [ ] **Step 1: Add import and multi-template logic to `compiler/src/init.ts`**

Read the current `init.ts`. Add import for custom.ts:
```ts
import { generateCombined, FEATURES } from './templates/custom.js';
```

Modify `initProject` to handle comma-separated template names:

```ts
export function initProject(projectDir: string, projectName?: string, templateName?: string): void {
    const name = projectName ?? path.basename(projectDir);
    const tpl = templateName ?? 'minimal';
    
    // Check for comma-separated (combined template)
    const parts = tpl.split(',').map(s => s.trim());
    if (parts.length > 1) {
        // Validate all parts are known features
        for (const p of parts) {
            const isFeature = FEATURES.some(f => f.name === p);
            const isTemplate = TEMPLATES.find(t => t.name === p);
            if (!isFeature && !isTemplate) {
                console.error(`Error: unknown template "${p}". Available: ${TEMPLATES.map(t => t.name).join(', ')}`);
                process.exit(1);
            }
        }
        generateCombined(parts, projectDir, name);
        return;
    }
    
    // Single template — use existing generator
    const entry = TEMPLATES.find(t => t.name === tpl);
    if (!entry) {
        console.error(`Error: unknown template "${tpl}". Available: ${TEMPLATES.map(t => t.name).join(', ')}`);
        process.exit(1);
    }
    entry.generate(projectDir, name);
}
```

- [ ] **Step 2: Update `compiler/src/templates/index.ts` prompt to accept comma-separated**

Read `compiler/src/templates/index.ts`. Modify `promptTemplateName()`:

Change the prompt text from:
```
'Template (number or name): '
```
to:
```
'Template (number or name, comma-separated to combine): '
```

The input parsing needs to handle comma-separated values. If the input contains commas, split and resolve each part (number or name), join with commas and return:

```ts
rl.question('Template (number or name, comma-separated to combine): ', (answer) => {
    rl.close();
    const input = answer.trim();
    
    // Check for comma-separated
    if (input.includes(',')) {
        const parts = input.split(',').map(s => s.trim());
        const resolved: string[] = [];
        for (const part of parts) {
            const num = parseInt(part, 10);
            if (!isNaN(num) && num >= 1 && num <= TEMPLATES.length) {
                resolved.push(TEMPLATES[num - 1].name);
            } else {
                const found = TEMPLATES.find(t => t.name === part);
                if (found) {
                    resolved.push(found.name);
                } else {
                    console.error(`Error: unknown template "${part}".`);
                    process.exit(1);
                }
            }
        }
        resolve(resolved.join(','));
        return;
    }
    
    // Single value (existing logic)
    const byNumber = parseInt(input, 10);
    if (!isNaN(byNumber) && byNumber >= 1 && byNumber <= TEMPLATES.length) {
        resolve(TEMPLATES[byNumber - 1].name);
        return;
    }
    const byName = TEMPLATES.find(t => t.name === input);
    if (byName) {
        resolve(byName.name);
        return;
    }
    console.error(`Error: unknown template "${input}".`);
    process.exit(1);
});
```

- [ ] **Step 3: Update `compiler/src/index.ts` help text**

In the `imxc templates` command output, add a combine hint:
```ts
console.log('\nUsage: imxc init <project-name> --template=<name>');
console.log('Combine: imxc init <project-name> --template=async,persistence');
```

In the usage help at the bottom, update:
```
'       imxc init [project-dir] [--template=<name[,name,...]>]'
```

- [ ] **Step 4: Build and test**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile.

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: 112/112 pass.

- [ ] **Step 5: Test single template still works**

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_single --template=async`
Expected: Same as before, creates async project.
Run: `rm -rf test_single`

- [ ] **Step 6: Test combined templates**

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_combined --template=async,persistence`
Expected: Creates project with both features. Check:
- `ls test_combined/src/` — should have `async.h`, `persistence.h`, `main.cpp`, `AppState.h`, `App.tsx`, `imx.d.ts`
- `grep "loading" test_combined/src/AppState.h` — async field
- `grep "volume" test_combined/src/AppState.h` — persistence field
- `grep "NLOHMANN_DEFINE" test_combined/src/AppState.h` — should list persistence data fields
- `grep "nlohmann_json" test_combined/CMakeLists.txt` — persistence needs json
- App.tsx should have both "Async Demo" and "Persistence Demo" windows

Run: `rm -rf test_combined`

- [ ] **Step 7: Test three-way combine**

Run: `node compiler/dist/index.js init test_three --template=async,persistence,filedialog`
Expected: All three features merged.
Run: `ls test_three/src/` — async.h, persistence.h, main.cpp, AppState.h, App.tsx, imx.d.ts
Run: `rm -rf test_three`

- [ ] **Step 8: Test networking auto-includes async**

Run: `node compiler/dist/index.js init test_net --template=networking`
Expected: Single networking template (existing behavior).
Run: `node compiler/dist/index.js init test_net2 --template=networking,persistence`
Expected: Combined, async auto-included (async.h present).
Run: `grep "async.h\|run_async" test_net2/src/main.cpp` — should find run_async include
Run: `rm -rf test_net test_net2`

- [ ] **Step 9: Test hotreload exclusive error**

Run: `node compiler/dist/index.js init test_hot --template=hotreload,async 2>&1`
Expected: Error message about hotreload being exclusive.

- [ ] **Step 10: Test templates command shows combine hint**

Run: `node compiler/dist/index.js templates`
Expected: Shows "Combine: imxc init <project-name> --template=async,persistence"

- [ ] **Step 11: Rebuild dist/ and commit**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`

```bash
git add compiler/src/templates/index.ts compiler/src/templates/custom.ts compiler/src/init.ts compiler/src/index.ts compiler/dist/
git commit -m "feat: Phase 20 step 7 — multi-template combining via --template=a,b,c"
```
