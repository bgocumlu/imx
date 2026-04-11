import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerTemplate, buildImxDts, TSCONFIG, GITIGNORE } from './index.js';

const APPSTATE_INTERFACE = `interface AppState {
    name: string;
    volume: number;
    darkMode: boolean;
    onSave: () => void;
    onLoad: () => void;
}`;

const APPSTATE_H = `#pragma once
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
`;

const PERSISTENCE_H = `#pragma once
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
`;

const MAIN_CPP = `#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "persistence.h"
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

    app.state.onSave = [&]() {
        imx::save_json("state.json", app.state);
    };
    app.state.onLoad = [&]() {
        imx::load_json("state.json", app.state);
        app.runtime.request_frame();
    };

    // Auto-load saved state (silently fails if no file exists)
    imx::load_json("state.json", app.state);

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
`;

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

function generate(projectDir: string, projectName: string): void {
    const srcDir = path.join(projectDir, 'src');

    if (fs.existsSync(path.join(srcDir, 'App.tsx'))) {
        console.error(`Error: ${srcDir}/App.tsx already exists. Aborting.`);
        process.exit(1);
    }

    fs.mkdirSync(srcDir, { recursive: true });
    const publicDir = path.join(projectDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });

    // Write files
    fs.writeFileSync(path.join(srcDir, 'main.cpp'), MAIN_CPP.replace('APP_NAME', projectName));
    fs.writeFileSync(path.join(srcDir, 'AppState.h'), APPSTATE_H);
    fs.writeFileSync(path.join(srcDir, 'persistence.h'), PERSISTENCE_H);
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(APPSTATE_INTERFACE));
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), cmakeWithJson(projectName));
    fs.writeFileSync(path.join(projectDir, '.gitignore'), GITIGNORE);

    console.log(`imxc: initialized project "${projectName}" with template "persistence"`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/main.cpp          — app shell with save/load callbacks`);
    console.log(`    src/AppState.h        — C++ state struct with nlohmann/json serialization`);
    console.log(`    src/persistence.h     — save_json/load_json helpers (nlohmann/json)`);
    console.log(`    src/App.tsx           — your root component`);
    console.log(`    src/imx.d.ts          — type definitions for IDE support`);
    console.log(`    tsconfig.json         — TypeScript config`);
    console.log(`    CMakeLists.txt        — build config with FetchContent (imx + nlohmann/json)`);
    console.log(`    .gitignore            — ignores build/, node_modules/, *.ini`);
    console.log(`    public/               — static assets (copied to exe directory)`);
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd ${projectName}`);
    console.log(`    cmake -B build`);
    console.log(`    cmake --build build`);
}

registerTemplate({ name: 'persistence', description: 'JSON save/load with nlohmann/json', generate });
