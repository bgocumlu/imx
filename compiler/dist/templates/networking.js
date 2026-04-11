import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerTemplate, buildImxDts, TSCONFIG, GITIGNORE } from './index.js';
const APPSTATE_INTERFACE = `interface AppState {
    url: string;
    response: string;
    loading: boolean;
    onFetch: () => void;
}`;
const APPSTATE_H = `#pragma once
#include <string>
#include <functional>

struct AppState {
    std::string url = "http://jsonplaceholder.typicode.com/todos/1";
    std::string response = "";
    bool loading = false;
    std::function<void()> onFetch;
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
const MAIN_CPP = `#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include <thread>
#include <httplib.h>
#include "async.h"
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
`;
function cmakeWithHttplib(projectName) {
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
function generate(projectDir, projectName) {
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
    fs.writeFileSync(path.join(srcDir, 'async.h'), ASYNC_H);
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(APPSTATE_INTERFACE));
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), cmakeWithHttplib(projectName));
    fs.writeFileSync(path.join(projectDir, '.gitignore'), GITIGNORE);
    console.log(`imxc: initialized project "${projectName}" with template "networking"`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/main.cpp          — app shell with HTTP fetch callback`);
    console.log(`    src/AppState.h        — C++ state struct with URL/response fields`);
    console.log(`    src/async.h           — run_async() helper (std::thread)`);
    console.log(`    src/App.tsx           — networking demo UI`);
    console.log(`    src/imx.d.ts          — type definitions for IDE support`);
    console.log(`    tsconfig.json         — TypeScript config`);
    console.log(`    CMakeLists.txt        — build config with FetchContent (imx + cpp-httplib)`);
    console.log(`    .gitignore            — ignores build/, node_modules/, *.ini`);
    console.log(`    public/               — static assets (copied to exe directory)`);
    console.log('');
    console.log('  Next steps:');
    console.log(`    cd ${projectName}`);
    console.log(`    cmake -B build`);
    console.log(`    cmake --build build`);
}
registerTemplate({ name: 'networking', description: 'HTTP client with cpp-httplib', generate });
