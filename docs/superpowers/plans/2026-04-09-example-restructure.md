# Example Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the monolithic 608-line hello example with three focused apps: minimal hello, component-organized demo, and phase showcase hub.

**Architecture:** Three independent example apps sharing the same hub pattern (DockSpace + buttons → toggleable windows with close buttons). Demo has 14 category .tsx files. Phases hub is infrastructure-only (user fills in phase content later). Hello becomes a ~25 line getting-started app.

**Tech Stack:** TypeScript (TSX), C++20, ImGui, CMake, GLFW/OpenGL

---

### Task 1: Create directory structure and shared files

**Files:**
- Create: `examples/demo/src/main.cpp`
- Create: `examples/demo/src/DemoState.h`
- Create: `examples/demo/src/imx.d.ts` (copy from hello)
- Create: `examples/demo/src/tsconfig.json`
- Create: `examples/demo/public/` (copy fonts + images from hello)
- Create: `examples/phases/src/main.cpp`
- Create: `examples/phases/src/PhasesState.h`
- Create: `examples/phases/src/imx.d.ts` (copy from hello)
- Create: `examples/phases/src/tsconfig.json`

- [ ] **Step 1: Create demo directories and copy shared files**

```bash
mkdir -p examples/demo/src examples/demo/public
mkdir -p examples/phases/src examples/phases/public

# Copy type definitions
cp examples/hello/imx.d.ts examples/demo/src/imx.d.ts
cp examples/hello/imx.d.ts examples/phases/src/imx.d.ts

# Copy public assets
cp examples/hello/public/Inter-Regular.ttf examples/demo/public/
cp examples/hello/public/JetBrainsMono-Regular.ttf examples/demo/public/
cp examples/hello/public/Inter-Regular.ttf examples/phases/public/
cp examples/hello/public/JetBrainsMono-Regular.ttf examples/phases/public/

# Copy images for demo only
cp examples/hello/image.jpg examples/demo/public/
cp examples/hello/public/flower.jpg examples/demo/public/
```

- [ ] **Step 2: Create tsconfig.json for both**

`examples/demo/src/tsconfig.json`:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["*.tsx", "imx.d.ts"]
}
```

`examples/phases/src/tsconfig.json` — identical content.

- [ ] **Step 3: Create demo main.cpp**

`examples/demo/src/main.cpp` — follow the todo_app pattern but with DemoState and font embed:

```cpp
#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "DemoState.h"

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    DemoState state;
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

    GLFWwindow* window = glfwCreateWindow(1200, 800, "IMX Demo", nullptr, nullptr);
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

    // Register custom widget for AdvancedDemo
    imx::register_widget("ToggleSwitch", [](imx::WidgetArgs& a) {
        bool val = a.get_float(0) > 0.5F;
        if (ImGui::Checkbox("##toggle", &val)) {
            a.set_result(val ? 1.0F : 0.0F);
        }
    });

    App app;
    app.window = window;
    app.io = &io;
    glfwSetWindowUserPointer(window, &app);
    glfwSetWindowSizeCallback(window, window_size_callback);

    // Load TSX-declared fonts before first frame
    extern void _imx_load_fonts();
    _imx_load_fonts();

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
```

- [ ] **Step 4: Create DemoState.h**

`examples/demo/src/DemoState.h`:
```cpp
#pragma once
#include <imgui.h>
#include <imx/renderer.h>

struct DemoState {
    // MultiSelect demo state (AdvancedDemo)
    static constexpr int MS_COUNT = 6;
    bool ms_selected[MS_COUNT] = {};
    int ms_selection_count = 0;

    void apply_selection(ImGuiMultiSelectIO* io) {
        imx::renderer::apply_multi_select_requests(io, ms_selected, MS_COUNT);
        ms_selection_count = 0;
        for (int i = 0; i < MS_COUNT; i++)
            if (ms_selected[i]) ms_selection_count++;
    }
};
```

- [ ] **Step 5: Create phases main.cpp**

`examples/phases/src/main.cpp` — identical to demo main.cpp but with `PhasesState` instead of `DemoState`, window title "IMX Phase Showcase", and no ToggleSwitch registration.

- [ ] **Step 6: Create PhasesState.h**

`examples/phases/src/PhasesState.h`:
```cpp
#pragma once
#include <imgui.h>
#include <imx/renderer.h>

struct PhasesState {
    // Phase 17: MultiSelect demo
    static constexpr int MS_COUNT = 6;
    bool ms_selected[MS_COUNT] = {};
    int ms_selection_count = 0;

    void apply_selection(ImGuiMultiSelectIO* io) {
        imx::renderer::apply_multi_select_requests(io, ms_selected, MS_COUNT);
        ms_selection_count = 0;
        for (int i = 0; i < MS_COUNT; i++)
            if (ms_selected[i]) ms_selection_count++;
    }
};
```

- [ ] **Step 7: Commit**

```bash
git add examples/demo/ examples/phases/
git commit -m "feat: create demo and phases example infrastructure"
```

---

### Task 2: Slim hello example

**Files:**
- Create: `examples/hello/src/App.tsx`
- Create: `examples/hello/src/main.cpp`
- Create: `examples/hello/src/imx.d.ts`
- Create: `examples/hello/src/tsconfig.json`
- Remove: `examples/hello/App.tsx`, `examples/hello/TodoItem.tsx`, `examples/hello/AppState.h`, `examples/hello/hand_written_app.cpp`, `examples/hello/hand_written_app.h`, `examples/hello/image.jpg`, `examples/hello/imx.d.ts`, `examples/hello/main.cpp`, `examples/hello/tsconfig.json`

- [ ] **Step 1: Create hello/src/ directory and new files**

`examples/hello/src/App.tsx`:
```tsx
export default function App() {
  const [count, setCount] = useState(0);
  const [speed, setSpeed] = useState(5.0);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <DockSpace>
      <Window title="Hello IMX">
        <Column gap={8}>
          <Text>Welcome to IMX</Text>
          <Text>Count: {count}</Text>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <SliderFloat label="Speed" value={speed} onChange={setSpeed} min={0} max={100} />
          <Separator />
          <Button title="About" onPress={() => setShowAbout(!showAbout)} />
        </Column>
      </Window>
      {showAbout && <Window title="About" open={true} onClose={() => setShowAbout(false)}>
        <Text>Built with IMX — React-Native-like authoring for Dear ImGui</Text>
      </Window>}
    </DockSpace>
  );
}
```

`examples/hello/src/main.cpp` — minimal, no fonts, no custom widgets:
```cpp
#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
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

    imx::render_root(app.runtime);

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

    GLFWwindow* window = glfwCreateWindow(800, 600, "Hello IMX", nullptr, nullptr);
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
```

Copy imx.d.ts and tsconfig.json:
```bash
cp examples/hello/imx.d.ts examples/hello/src/imx.d.ts
cp examples/demo/src/tsconfig.json examples/hello/src/tsconfig.json
```

- [ ] **Step 2: Remove old hello files**

```bash
git rm examples/hello/App.tsx examples/hello/TodoItem.tsx examples/hello/AppState.h
git rm examples/hello/hand_written_app.cpp examples/hello/hand_written_app.h
git rm examples/hello/image.jpg examples/hello/imx.d.ts examples/hello/main.cpp examples/hello/tsconfig.json
```

- [ ] **Step 3: Commit**

```bash
git add examples/hello/src/
git commit -m "feat: slim hello example to minimal getting-started (~25 lines TSX)"
```

---

### Task 3: Update CMakeLists.txt

**Files:**
- Modify: `CMakeLists.txt:112-136` (hello target) and add demo + phases targets

- [ ] **Step 1: Update hello_app target**

Replace the hello_app section (lines 113-136) with:

```cmake
    # --- hello_app: minimal getting-started ---
    imx_compile_tsx(HELLO_GENERATED
        SOURCES
            examples/hello/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_hello
    )

    add_executable(hello_app
        examples/hello/src/main.cpp
        ${HELLO_GENERATED}
    )
    set_target_properties(hello_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(hello_app PRIVATE imx_renderer)
    target_include_directories(hello_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_hello
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/src
    )

    # Copy hello public/ assets to output directory
    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/public)
        add_custom_command(TARGET hello_app POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/public
                $<TARGET_FILE_DIR:hello_app>
            COMMENT "Copying hello public/ assets"
        )
    endif()
```

- [ ] **Step 2: Add demo_app target**

After the hello_app section, add:

```cmake
    # --- demo_app: component-organized demo (like imgui_demo) ---
    imx_compile_tsx(DEMO_GENERATED
        SOURCES
            examples/demo/src/App.tsx
            examples/demo/src/LayoutDemo.tsx
            examples/demo/src/TextDemo.tsx
            examples/demo/src/InputsDemo.tsx
            examples/demo/src/SlidersDemo.tsx
            examples/demo/src/ButtonsDemo.tsx
            examples/demo/src/ColorDemo.tsx
            examples/demo/src/TablesDemo.tsx
            examples/demo/src/TreesDemo.tsx
            examples/demo/src/MenusDemo.tsx
            examples/demo/src/DragDropDemo.tsx
            examples/demo/src/CanvasDemo.tsx
            examples/demo/src/ThemingDemo.tsx
            examples/demo/src/ImagesDemo.tsx
            examples/demo/src/AdvancedDemo.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_demo
    )

    add_executable(demo_app
        examples/demo/src/main.cpp
        ${DEMO_GENERATED}
    )
    set_target_properties(demo_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(demo_app PRIVATE imx_renderer)
    target_include_directories(demo_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_demo
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/demo/src
    )

    add_custom_command(TARGET demo_app POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/demo/public
            $<TARGET_FILE_DIR:demo_app>
        COMMENT "Copying demo public/ assets"
    )
```

- [ ] **Step 3: Add phases_app target**

```cmake
    # --- phases_app: phase showcase (content added incrementally) ---
    imx_compile_tsx(PHASES_GENERATED
        SOURCES
            examples/phases/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_phases
    )

    add_executable(phases_app
        examples/phases/src/main.cpp
        ${PHASES_GENERATED}
    )
    set_target_properties(phases_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(phases_app PRIVATE imx_renderer)
    target_include_directories(phases_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_phases
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/phases/src
    )

    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/examples/phases/public)
        add_custom_command(TARGET phases_app POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${CMAKE_CURRENT_SOURCE_DIR}/examples/phases/public
                $<TARGET_FILE_DIR:phases_app>
            COMMENT "Copying phases public/ assets"
        )
    endif()
```

- [ ] **Step 4: Commit**

```bash
git add CMakeLists.txt
git commit -m "build: update CMake for hello slim + demo + phases example targets"
```

---

### Task 4: Demo hub App.tsx

**Files:**
- Create: `examples/demo/src/App.tsx`

- [ ] **Step 1: Write the demo hub**

The hub uses useState booleans to toggle each category window. Each category component is imported and conditionally rendered. The `onClose` callback flips the boolean back.

```tsx
import { LayoutDemo } from './LayoutDemo';
import { TextDemo } from './TextDemo';
import { InputsDemo } from './InputsDemo';
import { SlidersDemo } from './SlidersDemo';
import { ButtonsDemo } from './ButtonsDemo';
import { ColorDemo } from './ColorDemo';
import { TablesDemo } from './TablesDemo';
import { TreesDemo } from './TreesDemo';
import { MenusDemo } from './MenusDemo';
import { DragDropDemo } from './DragDropDemo';
import { CanvasDemo } from './CanvasDemo';
import { ThemingDemo } from './ThemingDemo';
import { ImagesDemo } from './ImagesDemo';
import { AdvancedDemo } from './AdvancedDemo';

export default function App(props: DemoState) {
  const [showLayout, setShowLayout] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showInputs, setShowInputs] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showColor, setShowColor] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showTrees, setShowTrees] = useState(false);
  const [showMenus, setShowMenus] = useState(false);
  const [showDragDrop, setShowDragDrop] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showTheming, setShowTheming] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Font name="inter-ui" src="Inter-Regular.ttf" size={16} embed>
    <DockSpace>
      <Window title="IMX Demo">
        <Column gap={4}>
          <Text>Component Demos</Text>
          <Text disabled>Click a button to open a demo window.</Text>
          <Separator />
          <Button title="Layout" onPress={() => setShowLayout(!showLayout)} />
          <Button title="Text" onPress={() => setShowText(!showText)} />
          <Button title="Inputs" onPress={() => setShowInputs(!showInputs)} />
          <Button title="Sliders & Drags" onPress={() => setShowSliders(!showSliders)} />
          <Button title="Buttons" onPress={() => setShowButtons(!showButtons)} />
          <Button title="Color" onPress={() => setShowColor(!showColor)} />
          <Button title="Tables" onPress={() => setShowTables(!showTables)} />
          <Button title="Trees" onPress={() => setShowTrees(!showTrees)} />
          <Button title="Menus & Popups" onPress={() => setShowMenus(!showMenus)} />
          <Button title="Drag & Drop" onPress={() => setShowDragDrop(!showDragDrop)} />
          <Button title="Canvas" onPress={() => setShowCanvas(!showCanvas)} />
          <Button title="Theming" onPress={() => setShowTheming(!showTheming)} />
          <Button title="Images" onPress={() => setShowImages(!showImages)} />
          <Button title="Advanced" onPress={() => setShowAdvanced(!showAdvanced)} />
        </Column>
      </Window>
      {showLayout && <LayoutDemo onClose={() => setShowLayout(false)} />}
      {showText && <TextDemo onClose={() => setShowText(false)} />}
      {showInputs && <InputsDemo onClose={() => setShowInputs(false)} />}
      {showSliders && <SlidersDemo onClose={() => setShowSliders(false)} />}
      {showButtons && <ButtonsDemo onClose={() => setShowButtons(false)} />}
      {showColor && <ColorDemo onClose={() => setShowColor(false)} />}
      {showTables && <TablesDemo onClose={() => setShowTables(false)} />}
      {showTrees && <TreesDemo onClose={() => setShowTrees(false)} />}
      {showMenus && <MenusDemo onClose={() => setShowMenus(false)} />}
      {showDragDrop && <DragDropDemo onClose={() => setShowDragDrop(false)} />}
      {showCanvas && <CanvasDemo onClose={() => setShowCanvas(false)} />}
      {showTheming && <ThemingDemo onClose={() => setShowTheming(false)} />}
      {showImages && <ImagesDemo onClose={() => setShowImages(false)} />}
      {showAdvanced && <AdvancedDemo onClose={() => setShowAdvanced(false)} props={props} />}
    </DockSpace>
    </Font>
  );
}
```

Note: `AdvancedDemo` receives `props` for MultiSelect struct binding. All others use only useState.

- [ ] **Step 2: Commit**

```bash
git add examples/demo/src/App.tsx
git commit -m "feat: add demo hub App.tsx with all 14 category buttons"
```

---

### Task 5: Demo categories — Layout, Text, Buttons, Color

**Files:**
- Create: `examples/demo/src/LayoutDemo.tsx`
- Create: `examples/demo/src/TextDemo.tsx`
- Create: `examples/demo/src/ButtonsDemo.tsx`
- Create: `examples/demo/src/ColorDemo.tsx`

Each file follows this pattern:
```tsx
export function XDemo(props: { onClose: () => void }) {
  // local useState for interactive demos
  return (
    <Window title="X" open={true} onClose={props.onClose}>
      <Column gap={8}>
        // demo content with CollapsingHeaders grouping related components
      </Column>
    </Window>
  );
}
```

**LayoutDemo** must demonstrate: Row (gap), Column (gap), View, SameLine (offset, spacing), NewLine, Spacing, Dummy (width, height), Indent (width), Cursor (x, y), Child (id, width, height, border, scrollable content)

**TextDemo** must demonstrate: Text (plain), Text (color), Text (disabled), Text (wrapped), Text (color + wrapped), BulletText, Bullet + SameLine + Text, LabelText

**ButtonsDemo** must demonstrate: Button, SmallButton, ArrowButton (all 4 directions), InvisibleButton (with visual indicator), ImageButton, Checkbox, Disabled wrapping a Button

**ColorDemo** must demonstrate: ColorEdit (RGBA), ColorEdit3 (RGB), ColorPicker (RGBA), ColorPicker3 (RGB)

- [ ] **Step 1: Write all four files**

Each file should be 40-80 lines. Use CollapsingHeaders to organize sub-groups. Use useState for interactive state (colors, checkbox values, etc.).

- [ ] **Step 2: Build to verify**

```bash
cd compiler && npm run build && cd ..
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --target demo_app
```

Note: cmake configure (-B) is needed since CMakeLists.txt changed. If build fails, fix TSX errors and retry.

- [ ] **Step 3: Commit**

```bash
git add examples/demo/src/LayoutDemo.tsx examples/demo/src/TextDemo.tsx examples/demo/src/ButtonsDemo.tsx examples/demo/src/ColorDemo.tsx
git commit -m "feat: add demo categories — Layout, Text, Buttons, Color"
```

---

### Task 6: Demo categories — Inputs, Sliders

**Files:**
- Create: `examples/demo/src/InputsDemo.tsx`
- Create: `examples/demo/src/SlidersDemo.tsx`

**InputsDemo** must demonstrate: TextInput, InputTextMultiline (with style width/height), InputInt, InputFloat, InputFloat2, InputFloat3, InputFloat4, InputInt2, InputInt3, InputInt4, Combo (simple items mode), Combo (manual Begin/End mode with Selectable children), ListBox (simple items), ListBox (manual mode with Selectable children), Radio (group of 3), Selectable (basic + spanAllColumns + allowDoubleClick)

**SlidersDemo** must demonstrate: SliderFloat, SliderInt, SliderAngle, VSliderFloat (vertical), VSliderInt (vertical), DragFloat, DragInt, SliderFloat2, SliderFloat3, SliderFloat4, SliderInt2, SliderInt3, SliderInt4, DragFloat2, DragFloat3, DragFloat4, DragInt2, DragInt3, DragInt4 — all with explicit width props

- [ ] **Step 1: Write both files**

Each 60-120 lines. Group related widgets under CollapsingHeaders.

- [ ] **Step 2: Build and verify**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target demo_app
```

- [ ] **Step 3: Commit**

```bash
git add examples/demo/src/InputsDemo.tsx examples/demo/src/SlidersDemo.tsx
git commit -m "feat: add demo categories — Inputs, Sliders"
```

---

### Task 7: Demo categories — Tables, Trees, Menus

**Files:**
- Create: `examples/demo/src/TablesDemo.tsx`
- Create: `examples/demo/src/TreesDemo.tsx`
- Create: `examples/demo/src/MenusDemo.tsx`

**TablesDemo** must demonstrate: Basic Table (columns + TableRow), sortable table (sortable, onSort, multiSortable), column flags (fixedWidth, noResize, defaultHide, preferSortAscending, preferSortDescending), row bgColor, cell bgColor, columnIndex jump, hideable, scrollX, scrollY, padOuterX, noClip

**TreesDemo** must demonstrate: TreeNode (basic), TreeNode (defaultOpen), TreeNode (openOnArrow, openOnDoubleClick), TreeNode (leaf, bullet, noTreePushOnOpen), programmatic forceOpen with Checkbox, CollapsingHeader (basic), CollapsingHeader (defaultOpen), CollapsingHeader (closable + onClose)

**MenusDemo** must demonstrate: MainMenuBar with Menu/MenuItem/Separator, MenuBar (window-level), MenuItem with shortcut text, Modal (open/close), Popup (open via button), ContextMenu (right-click on item), ContextMenu (right-click on window, target="window"), ContextMenu (left-click, mouseButton="left")

- [ ] **Step 1: Write all three files**

Each 60-120 lines. Tables is the most complex (sortable + flags). Menus needs careful structure (MainMenuBar is outside the Window).

- [ ] **Step 2: Build and verify**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target demo_app
```

- [ ] **Step 3: Commit**

```bash
git add examples/demo/src/TablesDemo.tsx examples/demo/src/TreesDemo.tsx examples/demo/src/MenusDemo.tsx
git commit -m "feat: add demo categories — Tables, Trees, Menus"
```

---

### Task 8: Demo categories — DragDrop, Canvas, Theming, Images, Advanced

**Files:**
- Create: `examples/demo/src/DragDropDemo.tsx`
- Create: `examples/demo/src/CanvasDemo.tsx`
- Create: `examples/demo/src/ThemingDemo.tsx`
- Create: `examples/demo/src/ImagesDemo.tsx`
- Create: `examples/demo/src/AdvancedDemo.tsx`

**DragDropDemo** must demonstrate: DragDropSource + DragDropTarget with typed payload, visual feedback text showing drop result

**CanvasDemo** must demonstrate: DrawLine, DrawRect (filled + outlined + rounding), DrawCircle (filled + outlined), DrawText, DrawBezierCubic, DrawBezierQuadratic, DrawPolyline, DrawConvexPolyFilled, DrawNgon, DrawNgonFilled, DrawTriangle

**ThemingDemo** must demonstrate: Theme (preset dark/light switching), Theme with accentColor/backgroundColor/textColor/borderColor/surfaceColor, StyleColor overrides (multiple color props), StyleVar overrides (frameRounding, framePadding, etc.), Font switching (name="jetbrains-mono" with src/embed), Group, ID scoping

The `<Font>` in ThemingDemo should use TSX font embed:
```tsx
<Font name="jetbrains-mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
```

**ImagesDemo** must demonstrate: Image (file loading from public/), Image (embed), width/height control, ImageButton

**AdvancedDemo** receives `props: { onClose: () => void, props: DemoState }` for MultiSelect. Must demonstrate: MultiSelect (boxSelect, selectionSize, itemsCount, onSelectionChange with struct binding), Shortcut (Ctrl+S), Custom widget (ToggleSwitch), window flags demo (noTitleBar, noResize, alwaysAutoResize), window positioning (x, y, width, height), window size constraints (minWidth, maxWidth), bgAlpha, Selectable (selectionIndex), viewport hints (noViewport)

- [ ] **Step 1: Write all five files**

DragDrop and Canvas are 30-50 lines each. Theming and Images are 40-80 lines. Advanced is the largest (80-120 lines) due to MultiSelect and window flags.

- [ ] **Step 2: Build and verify**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target demo_app
```

Delete `build/Debug/imgui.ini` if the app freezes.

- [ ] **Step 3: Commit**

```bash
git add examples/demo/src/DragDropDemo.tsx examples/demo/src/CanvasDemo.tsx examples/demo/src/ThemingDemo.tsx examples/demo/src/ImagesDemo.tsx examples/demo/src/AdvancedDemo.tsx
git commit -m "feat: add demo categories — DragDrop, Canvas, Theming, Images, Advanced"
```

---

### Task 9: Phases hub

**Files:**
- Create: `examples/phases/src/App.tsx`

- [ ] **Step 1: Write the phases hub**

```tsx
export default function App(props: PhasesState) {
  const [showPhase11, setShowPhase11] = useState(false);
  const [showPhase12, setShowPhase12] = useState(false);
  const [showPhase13, setShowPhase13] = useState(false);
  const [showPhase14, setShowPhase14] = useState(false);
  const [showPhase15, setShowPhase15] = useState(false);
  const [showPhase16, setShowPhase16] = useState(false);
  const [showPhase17, setShowPhase17] = useState(false);
  const [showPhase18, setShowPhase18] = useState(false);

  return (
    <Font name="inter-ui" src="Inter-Regular.ttf" size={16} embed>
    <DockSpace>
      <Window title="Phase Showcase">
        <Column gap={4}>
          <Text>IMX Phase Showcase</Text>
          <Text disabled>Select a phase to open its demo window.</Text>
          <Text disabled>Phase files are added incrementally.</Text>
          <Separator />
          <Button title="Phase 11: C++ Struct Binding" onPress={() => setShowPhase11(!showPhase11)} />
          <Button title="Phase 12: Struct Binding Fixes" onPress={() => setShowPhase12(!showPhase12)} />
          <Button title="Phase 13: Font & Input Expansion" onPress={() => setShowPhase13(!showPhase13)} />
          <Button title="Phase 14: Layout & Positioning" onPress={() => setShowPhase14(!showPhase14)} />
          <Button title="Phase 15: Table & Tree Enhancements" onPress={() => setShowPhase15(!showPhase15)} />
          <Button title="Phase 16: Interaction & State Queries" onPress={() => setShowPhase16(!showPhase16)} />
          <Button title="Phase 17: Window & Popup Control" onPress={() => setShowPhase17(!showPhase17)} />
          <Button title="Phase 18: Text & Display Variants" onPress={() => setShowPhase18(!showPhase18)} />
        </Column>
      </Window>
    </DockSpace>
    </Font>
  );
}
```

Note: No conditional renders yet — phase .tsx files don't exist. The user adds them incrementally. Each phase addition needs:
1. Create `PhaseXX.tsx` in `examples/phases/src/`
2. Add to CMakeLists SOURCES
3. Add `import` + `{showPhaseXX && <PhaseXXDemo onClose={...} />}` to App.tsx

- [ ] **Step 2: Build phases_app**

```bash
cd compiler && npm run build && cd ..
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --target phases_app
```

- [ ] **Step 3: Commit**

```bash
git add examples/phases/src/App.tsx
git commit -m "feat: add phases hub with buttons for Phase 11-18"
```

---

### Task 10: Build all targets and final verification

- [ ] **Step 1: Reconfigure cmake**

```bash
cmake -B build -G "Visual Studio 17 2022"
```

- [ ] **Step 2: Build all three apps**

```bash
cmake --build build --target hello_app
cmake --build build --target demo_app
cmake --build build --target phases_app
```

- [ ] **Step 3: Run each app**

Run each exe and verify:
- `hello_app.exe` — simple window with counter, slider, about button
- `demo_app.exe` — hub with 14 category buttons, each opens a working demo window
- `phases_app.exe` — hub with 8 phase buttons (none functional yet — just the hub)

Delete `build/Debug/imgui.ini` before each if they freeze.

- [ ] **Step 4: Run compiler tests**

```bash
cd compiler && npx vitest run && cd ..
```

- [ ] **Step 5: Build and commit compiler/dist/**

```bash
cd compiler && npm run build && cd ..
git add compiler/dist/
git commit -m "build: update compiler/dist after example restructure"
```

- [ ] **Step 6: Update CLAUDE.md**

Update the file structure section and example descriptions in CLAUDE.md to reflect the new layout.

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for example restructure"
```
