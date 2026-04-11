# Phase 20 Step 1: Interactive Template Selector — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `imxc init` to support multiple project templates via an interactive CLI menu and `--template` flag. The current init output becomes the "minimal" template.

**Architecture:** Template registry in `compiler/src/templates/index.ts` collects `TemplateInfo` objects from per-template files. `init.ts` becomes a thin dispatcher. `index.ts` parses `--template` and calls async prompt functions when needed.

**Tech Stack:** Node.js `readline` for interactive prompts, `parseArgs` from `node:util` for CLI flags. No new dependencies.

---

### Task 1: Create `templates/index.ts` — registry and shared utilities

**Files:**
- Create: `compiler/src/templates/index.ts`

This file contains: the `TemplateInfo` interface, the `TEMPLATES` registry array, shared template strings (GITIGNORE, APP_TSX, IMX_DTS, TSCONFIG), shared `cmakeTemplate()` function, and the prompt helpers (`promptProjectName`, `promptTemplateName`).

- [ ] **Step 1: Create `compiler/src/templates/index.ts` with shared strings and registry**

```ts
import * as readline from 'node:readline';

// --- Template interface and registry ---

export interface TemplateInfo {
    name: string;
    description: string;
    generate: (projectDir: string, projectName: string) => void;
}

export const TEMPLATES: TemplateInfo[] = [];

export function registerTemplate(info: TemplateInfo): void {
    TEMPLATES.push(info);
}

// --- Shared template strings (used by multiple templates) ---

export const GITIGNORE = `build/
node_modules/
*.ini
.cache/
`;

export const APP_TSX = `export default function App(props: AppState) {
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
        <Text>Built with IMX</Text>
        <Button title="Close" onPress={() => setShowAbout(false)} />
      </Window>}
    </DockSpace>
  );
}
`;

export const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ES2022",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "imx",
    "strict": false,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.tsx", "src/imx.d.ts"]
}
`;

export function cmakeTemplate(projectName: string, repoUrl: string): string {
    return `cmake_minimum_required(VERSION 3.25)
project(${projectName} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
set(FETCHCONTENT_QUIET OFF)

FetchContent_Declare(
    imx
    GIT_REPOSITORY ${repoUrl}
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

add_executable(${projectName}
    src/main.cpp
    \${GENERATED}
)
set_target_properties(${projectName} PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
target_link_libraries(${projectName} PRIVATE imx::renderer)
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

// IMX_DTS is very long — it's exported from here so all templates share one copy.
// Copied verbatim from the existing init.ts (lines 157-499).
export const IMX_DTS = `<PLACEHOLDER — will be copied verbatim from init.ts lines 157-499 in the actual implementation>`;

// --- Interactive prompts ---

function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

export async function promptProjectName(): Promise<string> {
    const name = await prompt('Project name: ');
    if (!name) {
        console.error('Error: project name is required.');
        process.exit(1);
    }
    return name;
}

export async function promptTemplateName(): Promise<string> {
    console.log('');
    console.log('Select a template:');
    console.log('');
    TEMPLATES.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.name} — ${t.description}`);
    });
    console.log('');

    const answer = await prompt('Template (number or name): ');

    const num = parseInt(answer, 10);
    if (!isNaN(num) && num >= 1 && num <= TEMPLATES.length) {
        return TEMPLATES[num - 1].name;
    }

    const found = TEMPLATES.find(t => t.name === answer);
    if (found) return found.name;

    console.error(`Error: unknown template "${answer}". Available: ${TEMPLATES.map(t => t.name).join(', ')}`);
    process.exit(1);
}
```

Note: The `IMX_DTS` placeholder above will be replaced with the full verbatim content from the current `init.ts` (lines 157-499 — the entire type definitions string). It's too long to repeat in this plan, but it's a direct copy with zero changes.

- [ ] **Step 2: Verify file compiles**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx tsc --noEmit src/templates/index.ts`

This won't fully work yet (needs the template import), but check for syntax errors.

---

### Task 2: Create `templates/minimal.ts` — the minimal template

**Files:**
- Create: `compiler/src/templates/minimal.ts`

This file contains the APPSTATE_H and MAIN_CPP template strings (specific to minimal), plus the generate function that writes all project files.

- [ ] **Step 1: Create `compiler/src/templates/minimal.ts`**

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerTemplate, GITIGNORE, APP_TSX, IMX_DTS, TSCONFIG, cmakeTemplate } from './index.js';

const APPSTATE_H = `#pragma once
#include <functional>

struct AppState {
    int count = 0;
    float speed = 5.0f;
    std::function<void()> onIncrement;
};
`;

const MAIN_CPP = `#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "AppState.h"

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    AppState state;
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

    imx::render_root(app.runtime, app.state);

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

    GLFWwindow* window = glfwCreateWindow(800, 600, "APP_NAME", nullptr, nullptr);
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

    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }

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
`;

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
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), IMX_DTS);
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), cmakeTemplate(projectName, 'https://github.com/bgocumlu/imx.git'));
    fs.writeFileSync(path.join(projectDir, '.gitignore'), GITIGNORE);

    console.log(`imxc: initialized project "${projectName}" with template "minimal"`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/main.cpp          — app shell (GLFW + OpenGL + ImGui)`);
    console.log(`    src/AppState.h        — C++ state struct (bound to TSX props)`);
    console.log(`    src/App.tsx           — your root component`);
    console.log(`    src/imx.d.ts          — type definitions for IDE support`);
    console.log(`    tsconfig.json         — TypeScript config`);
    console.log(`    CMakeLists.txt        — build config with FetchContent`);
    console.log(`    .gitignore            — ignores build/, node_modules/, *.ini`);
    console.log(`    public/               — static assets (copied to exe directory)`);
    console.log('');
    console.log('  Next steps:');
    console.log(`    cmake -B build`);
    console.log(`    cmake --build build`);
}

registerTemplate({
    name: 'minimal',
    description: 'Bare ImGui app with struct binding',
    generate,
});
```

---

### Task 3: Rewrite `init.ts` as thin dispatcher

**Files:**
- Modify: `compiler/src/init.ts` (full rewrite — goes from 660 lines to ~50)

- [ ] **Step 1: Replace `init.ts` with dispatcher**

```ts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEMPLATES, APP_TSX, IMX_DTS, TSCONFIG } from './templates/index.js';

// Import template modules to trigger registration
import './templates/minimal.js';

export function addToProject(projectDir: string): void {
    const srcDir = path.join(projectDir, 'src');

    if (fs.existsSync(path.join(srcDir, 'App.tsx'))) {
        console.error(`Error: ${srcDir}/App.tsx already exists. Aborting.`);
        process.exit(1);
    }

    fs.mkdirSync(srcDir, { recursive: true });
    const publicDir = path.join(projectDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), IMX_DTS);
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);

    console.log(`imxc: added IMX sources to project`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/App.tsx            — your root component`);
    console.log(`    src/imx.d.ts           — type definitions for IDE support`);
    console.log(`    tsconfig.json          — TypeScript config`);
    console.log(`    public/                — static assets (copied to exe directory)`);
    console.log('');
    console.log('  Add to your CMakeLists.txt:');
    console.log('');
    console.log('    # --- IMX integration ---');
    console.log('    include(FetchContent)');
    console.log('    FetchContent_Declare(imx');
    console.log('        GIT_REPOSITORY https://github.com/bgocumlu/imx.git');
    console.log('        GIT_TAG main');
    console.log('    )');
    console.log('    FetchContent_MakeAvailable(imx)');
    console.log('    include(ImxCompile)');
    console.log('');
    console.log('    imx_compile_tsx(GENERATED');
    console.log('        SOURCES src/App.tsx');
    console.log('        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated');
    console.log('    )');
    console.log('');
    console.log('    # Add ${GENERATED} to your target sources:');
    console.log('    target_sources(your_app PRIVATE ${GENERATED})');
    console.log('    target_link_libraries(your_app PRIVATE imx::renderer)');
    console.log('    target_include_directories(your_app PRIVATE ${CMAKE_BINARY_DIR}/generated)');
    console.log('');
    console.log('    # Copy assets to exe directory:');
    console.log('    add_custom_command(TARGET your_app POST_BUILD');
    console.log('        COMMAND ${CMAKE_COMMAND} -E copy_directory');
    console.log('            ${CMAKE_CURRENT_SOURCE_DIR}/public $<TARGET_FILE_DIR:your_app>');
    console.log('    )');
    console.log('');
    console.log('  Then add the IMX render call to your main loop:');
    console.log('');
    console.log('    #include <imx/runtime.h>');
    console.log('    imx::Runtime runtime;');
    console.log('    // In your frame loop, between NewFrame() and Render():');
    console.log('    imx::render_root(runtime);');
}

export function initProject(projectDir: string, projectName?: string, templateName?: string): void {
    const name = projectName ?? path.basename(projectDir);
    const template = templateName ?? 'minimal';

    const entry = TEMPLATES.find(t => t.name === template);
    if (!entry) {
        console.error(`Error: unknown template "${template}". Available: ${TEMPLATES.map(t => t.name).join(', ')}`);
        process.exit(1);
    }

    entry.generate(projectDir, name);
}
```

---

### Task 4: Update `index.ts` — parse `--template` flag and async prompts

**Files:**
- Modify: `compiler/src/index.ts:1-14` (the init subcommand block)

- [ ] **Step 1: Rewrite `index.ts` init block with `--template` parsing and prompts**

Replace the full file with:

```ts
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import * as path from 'node:path';
import { initProject, addToProject } from './init.js';
import { promptProjectName, promptTemplateName } from './templates/index.js';
import { compile } from './compile.js';
import { startWatch } from './watch.js';

// Handle `imxc init [dir] [--template=X]` subcommand
if (process.argv[2] === 'init') {
    const { values, positionals } = parseArgs({
        args: process.argv.slice(3),
        allowPositionals: true,
        options: { template: { type: 'string', short: 't' } },
    });

    let dir = positionals[0];
    let templateName = values.template;

    if (!dir) {
        const name = await promptProjectName();
        dir = name;
    }

    if (!templateName) {
        templateName = await promptTemplateName();
    }

    const absDir = path.resolve(dir);
    initProject(absDir, path.basename(absDir), templateName);
    process.exit(0);
}

// Handle `imxc add [dir]` subcommand
if (process.argv[2] === 'add') {
    const dir = process.argv[3] ?? '.';
    const absDir = path.resolve(dir);
    addToProject(absDir);
    process.exit(0);
}

// Handle `imxc watch <dir> -o <output-dir>` subcommand
if (process.argv[2] === 'watch') {
    const watchDir = process.argv[3];
    if (!watchDir) {
        console.error('Usage: imxc watch <dir> -o <output-dir>');
        process.exit(1);
    }
    const { values } = parseArgs({
        args: process.argv.slice(4),
        allowPositionals: false,
        options: { output: { type: 'string', short: 'o' } },
    });
    const outputDir = values.output ?? '.';
    startWatch(path.resolve(watchDir), path.resolve(outputDir));
} else {
    // Default: build command
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: { output: { type: 'string', short: 'o' } },
    });

    if (positionals.length === 0) {
        console.error('Usage: imxc <input.tsx ...> -o <output-dir>');
        console.error('       imxc init [project-dir] [--template=<name>]');
        console.error('       imxc add [project-dir]');
        console.error('       imxc watch <dir> -o <output-dir>');
        process.exit(1);
    }

    const outputDir = values.output ?? '.';
    const result = compile(positionals, outputDir);

    if (result.warnings.length > 0) {
        result.warnings.forEach(w => console.warn(w));
    }

    if (!result.success) {
        result.errors.forEach(e => console.error(e));
        process.exit(1);
    }

    console.log(`imxc: ${result.componentCount} component(s) compiled successfully.`);
}
```

---

### Task 5: Build and test

**Files:**
- No new files — verification only

- [ ] **Step 1: Build the compiler**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
Expected: Clean compile, no errors. `dist/templates/index.js` and `dist/templates/minimal.js` should exist.

- [ ] **Step 2: Run compiler tests**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npx vitest run`
Expected: All existing tests pass (template refactor doesn't touch compiler logic).

- [ ] **Step 3: Test `--template` flag (non-interactive)**

Run: `cd C:/Users/Berkay/Downloads/reimgui && node compiler/dist/index.js init test_project --template=minimal`
Expected: Creates `test_project/` with all files. Output shows `initialized project "test_project" with template "minimal"`.

- [ ] **Step 4: Verify generated files match previous output**

Run: `ls test_project/src/` and `head -5 test_project/src/main.cpp`
Expected: `main.cpp`, `AppState.h`, `App.tsx`, `imx.d.ts` in src/. `main.cpp` contains `#include <imx/runtime.h>`.

- [ ] **Step 5: Test unknown template error**

Run: `node compiler/dist/index.js init test_bad --template=nonexistent`
Expected: `Error: unknown template "nonexistent". Available: minimal`

- [ ] **Step 6: Clean up test artifacts**

Run: `rm -rf test_project test_bad`

- [ ] **Step 7: Update `compiler/dist/`**

Run: `cd C:/Users/Berkay/Downloads/reimgui/compiler && npm run build`
The dist/ directory should now contain `dist/templates/index.js`, `dist/templates/index.d.ts`, `dist/templates/minimal.js`, `dist/templates/minimal.d.ts` alongside the existing dist files.

- [ ] **Step 8: Commit**

```bash
git add compiler/src/templates/ compiler/src/init.ts compiler/src/index.ts compiler/dist/
git commit -m "feat: Phase 20 step 1 — interactive template selector and --template flag

Refactor imxc init to support multiple project templates:
- templates/index.ts: registry, shared strings, interactive prompts (readline)
- templates/minimal.ts: current template renamed as 'minimal'
- init.ts: thin dispatcher using template registry
- index.ts: --template/-t flag, prompts for name and template when omitted"
```
