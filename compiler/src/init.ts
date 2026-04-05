import * as fs from 'node:fs';
import * as path from 'node:path';

const GITIGNORE = `build/
node_modules/
*.ini
.cache/
`;

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

const APP_TSX = `export default function App(props: AppState) {
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

const IMX_DTS = `// imx.d.ts — Type definitions for IMX components

interface Style {
  padding?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  gap?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  backgroundColor?: [number, number, number, number];
  textColor?: [number, number, number, number];
  fontSize?: number;
}

declare function useState<T>(initial: T): [T, (value: T) => void];

interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}

interface WindowProps { title: string; open?: boolean; onClose?: () => void; noTitleBar?: boolean; noResize?: boolean; noMove?: boolean; noCollapse?: boolean; noDocking?: boolean; noScrollbar?: boolean; style?: Style; children?: any; }
interface ViewProps { style?: Style; children?: any; }
interface RowProps { gap?: number; style?: Style; children?: any; }
interface ColumnProps { gap?: number; style?: Style; children?: any; }
interface TextProps { style?: Style; children?: any; }
interface ButtonProps { title: string; onPress: () => void; disabled?: boolean; style?: Style; }
interface TextInputProps { value: string; onChange?: (v: string) => void; label?: string; placeholder?: string; style?: Style; }
interface CheckboxProps { value: boolean; onChange?: (v: boolean) => void; label?: string; style?: Style; }
interface SeparatorProps {}
interface PopupProps { id: string; style?: Style; children?: any; }
interface DockSpaceProps { style?: Style; children?: any; }
interface DockLayoutProps { children?: any; }
interface DockSplitProps { direction: "horizontal" | "vertical"; size: number; children?: any; }
interface DockPanelProps { children?: any; }
interface ThemeProps {
  preset: string;
  accentColor?: [number, number, number, number];
  backgroundColor?: [number, number, number, number];
  textColor?: [number, number, number, number];
  borderColor?: [number, number, number, number];
  surfaceColor?: [number, number, number, number];
  rounding?: number;
  borderSize?: number;
  spacing?: number;
  children?: any;
}
interface MenuBarProps { children?: any; }
interface MenuProps { label: string; children?: any; }
interface MenuItemProps { label: string; onPress?: () => void; shortcut?: string; }
interface TableProps { columns: string[]; scrollY?: boolean; noBorders?: boolean; noRowBg?: boolean; style?: Style; children?: any; }
interface TableRowProps { key?: number | string; children?: any; }
interface TabBarProps { style?: Style; children?: any; }
interface TabItemProps { label: string; children?: any; }
interface TreeNodeProps { label: string; children?: any; }
interface CollapsingHeaderProps { label: string; children?: any; }
interface SliderFloatProps { label: string; value: number; onChange?: (v: number) => void; min: number; max: number; style?: Style; }
interface SliderIntProps { label: string; value: number; onChange?: (v: number) => void; min: number; max: number; style?: Style; }
interface DragFloatProps { label: string; value: number; onChange?: (v: number) => void; speed?: number; style?: Style; }
interface DragIntProps { label: string; value: number; onChange?: (v: number) => void; speed?: number; style?: Style; }
interface ComboProps { label: string; value: number; onChange?: (v: number) => void; items: string[]; style?: Style; }
interface InputIntProps { label: string; value: number; onChange?: (v: number) => void; style?: Style; }
interface InputFloatProps { label: string; value: number; onChange?: (v: number) => void; style?: Style; }
interface ColorEditProps { label: string; value: number[]; onChange: (v: number[]) => void; style?: Style; }
interface ListBoxProps { label: string; value: number; onChange?: (v: number) => void; items: string[]; style?: Style; }
interface ProgressBarProps { value: number; overlay?: string; style?: Style; }
interface TooltipProps { text: string; }
interface BulletTextProps { style?: Style; children?: any; }
interface LabelTextProps { label: string; value: string; }
interface SelectableProps { label: string; selected?: boolean; onSelect?: () => void; style?: Style; }
interface RadioProps { label: string; value: number; index: number; onChange?: (v: number) => void; style?: Style; }
interface InputTextMultilineProps { label: string; value: string; style?: Style; }
interface ColorPickerProps { label: string; value: number[]; style?: Style; }
interface PlotLinesProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface PlotHistogramProps { label: string; values: number[]; overlay?: string; style?: Style; }
interface ModalProps { title: string; open?: boolean; onClose?: () => void; style?: Style; children?: any; }
interface ImageProps { src: string; embed?: boolean; width?: number; height?: number; }
interface GroupProps { style?: Style; children?: any; }
interface IDProps { scope: string | number; children?: any; }
interface DragDropSourceProps { type: string; payload: number | string; children?: any; }
interface DragDropTargetProps { type: string; onDrop: (payload: any) => void; children?: any; }
interface CanvasProps { width: number; height: number; style?: Style; children?: any; }
interface DrawLineProps { p1: [number, number]; p2: [number, number]; color: [number, number, number, number]; thickness?: number; }
interface DrawRectProps { min: [number, number]; max: [number, number]; color: [number, number, number, number]; filled?: boolean; thickness?: number; rounding?: number; }
interface DrawCircleProps { center: [number, number]; radius: number; color: [number, number, number, number]; filled?: boolean; thickness?: number; }
interface DrawTextProps { pos: [number, number]; text: string; color: [number, number, number, number]; }
interface StyleColorProps {
  text?: [number, number, number, number];
  textDisabled?: [number, number, number, number];
  windowBg?: [number, number, number, number];
  frameBg?: [number, number, number, number];
  frameBgHovered?: [number, number, number, number];
  frameBgActive?: [number, number, number, number];
  titleBg?: [number, number, number, number];
  titleBgActive?: [number, number, number, number];
  button?: [number, number, number, number];
  buttonHovered?: [number, number, number, number];
  buttonActive?: [number, number, number, number];
  header?: [number, number, number, number];
  headerHovered?: [number, number, number, number];
  headerActive?: [number, number, number, number];
  separator?: [number, number, number, number];
  checkMark?: [number, number, number, number];
  sliderGrab?: [number, number, number, number];
  border?: [number, number, number, number];
  popupBg?: [number, number, number, number];
  tab?: [number, number, number, number];
  children?: any;
}

declare function Window(props: WindowProps): any;
declare function View(props: ViewProps): any;
declare function Row(props: RowProps): any;
declare function Column(props: ColumnProps): any;
declare function Text(props: TextProps): any;
declare function Button(props: ButtonProps): any;
declare function TextInput(props: TextInputProps): any;
declare function Checkbox(props: CheckboxProps): any;
declare function Separator(props: SeparatorProps): any;
declare function Popup(props: PopupProps): any;
declare function DockSpace(props: DockSpaceProps): any;
declare function DockLayout(props: DockLayoutProps): any;
declare function DockSplit(props: DockSplitProps): any;
declare function DockPanel(props: DockPanelProps): any;
declare function Theme(props: ThemeProps): any;
declare function MenuBar(props: MenuBarProps): any;
declare function Menu(props: MenuProps): any;
declare function MenuItem(props: MenuItemProps): any;
declare function Table(props: TableProps): any;
declare function TableRow(props: TableRowProps): any;
declare function TabBar(props: TabBarProps): any;
declare function TabItem(props: TabItemProps): any;
declare function TreeNode(props: TreeNodeProps): any;
declare function CollapsingHeader(props: CollapsingHeaderProps): any;
declare function SliderFloat(props: SliderFloatProps): any;
declare function SliderInt(props: SliderIntProps): any;
declare function DragFloat(props: DragFloatProps): any;
declare function DragInt(props: DragIntProps): any;
declare function Combo(props: ComboProps): any;
declare function InputInt(props: InputIntProps): any;
declare function InputFloat(props: InputFloatProps): any;
declare function ColorEdit(props: ColorEditProps): any;
declare function ListBox(props: ListBoxProps): any;
declare function ProgressBar(props: ProgressBarProps): any;
declare function Tooltip(props: TooltipProps): any;
declare function BulletText(props: BulletTextProps): any;
declare function LabelText(props: LabelTextProps): any;
declare function Selectable(props: SelectableProps): any;
declare function Radio(props: RadioProps): any;
declare function InputTextMultiline(props: InputTextMultilineProps): any;
declare function ColorPicker(props: ColorPickerProps): any;
declare function PlotLines(props: PlotLinesProps): any;
declare function PlotHistogram(props: PlotHistogramProps): any;
declare function Modal(props: ModalProps): any;
declare function Image(props: ImageProps): any;
declare function Group(props: GroupProps): any;
declare function ID(props: IDProps): any;
declare function StyleColor(props: StyleColorProps): any;
declare function Canvas(props: CanvasProps): any;
declare function DrawLine(props: DrawLineProps): any;
declare function DrawRect(props: DrawRectProps): any;
declare function DrawCircle(props: DrawCircleProps): any;
declare function DrawText(props: DrawTextProps): any;

interface StyleVarProps {
  alpha?: number;
  windowPadding?: [number, number];
  windowRounding?: number;
  framePadding?: [number, number];
  frameRounding?: number;
  frameBorderSize?: number;
  itemSpacing?: [number, number];
  itemInnerSpacing?: [number, number];
  indentSpacing?: number;
  cellPadding?: [number, number];
  tabRounding?: number;
  children?: any;
}
declare function StyleVar(props: StyleVarProps): any;
declare function DragDropSource(props: DragDropSourceProps): any;
declare function DragDropTarget(props: DragDropTargetProps): any;
interface DisabledProps { disabled?: boolean; children?: any; }
interface ChildProps { id: string; width?: number; height?: number; border?: boolean; style?: Style; children?: any; }
declare function Disabled(props: DisabledProps): any;
declare function Child(props: ChildProps): any;

declare function resetLayout(): void;

// --- Custom native widgets ---
// Declare your C++ registered widgets here for type checking:
//
// interface KnobProps {
//     value: number;
//     onChange: (value: number) => void;
//     min: number;
//     max: number;
//     width?: number;
//     height?: number;
// }
// declare function Knob(props: KnobProps): any;

declare module "imx/jsx-runtime" {
  export namespace JSX {
    type Element = any;
    interface IntrinsicElements { [tag: string]: any; }
    interface ElementChildrenAttribute { children: {}; }
  }
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export function Fragment(props: any): any;
}
`;

const TSCONFIG = `{
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

function cmakeTemplate(projectName: string, repoUrl: string): string {
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

export function addToProject(projectDir: string): void {
    const srcDir = path.join(projectDir, 'src');

    if (fs.existsSync(path.join(srcDir, 'App.tsx'))) {
        console.error(`Error: ${srcDir}/App.tsx already exists. Aborting.`);
        process.exit(1);
    }

    fs.mkdirSync(srcDir, { recursive: true });
    const publicDir = path.join(projectDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    // Write TSX source files only — no CMakeLists.txt or main.cpp
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

export function initProject(projectDir: string, projectName?: string): void {
    const name = projectName ?? path.basename(projectDir);
    const srcDir = path.join(projectDir, 'src');

    if (fs.existsSync(path.join(srcDir, 'App.tsx'))) {
        console.error(`Error: ${srcDir}/App.tsx already exists. Aborting.`);
        process.exit(1);
    }

    fs.mkdirSync(srcDir, { recursive: true });
    const publicDir = path.join(projectDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    // Write files
    fs.writeFileSync(path.join(srcDir, 'main.cpp'), MAIN_CPP.replace('APP_NAME', name));
    fs.writeFileSync(path.join(srcDir, 'AppState.h'), APPSTATE_H);
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), IMX_DTS);
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), cmakeTemplate(name, 'https://github.com/bgocumlu/imx.git'));
    fs.writeFileSync(path.join(projectDir, '.gitignore'), GITIGNORE);

    console.log(`imxc: initialized project "${name}"`);
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
