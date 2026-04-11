import * as fs from 'node:fs';
import * as path from 'node:path';
import { registerTemplate, buildImxDts, TSCONFIG, GITIGNORE, cmakeTemplate } from './index.js';
const APPSTATE_INTERFACE = `interface AppState {
    filePath: string;
    message: string;
    onOpen: () => void;
    onSave: () => void;
}`;
const APPSTATE_H = `#pragma once
#include <string>
#include <functional>

struct AppState {
    std::string filePath = "";
    std::string message = "";
    std::function<void()> onOpen;
    std::function<void()> onSave;
};
`;
const MAIN_CPP = `#include <imx/runtime.h>
#include <imx/renderer.h>
#include <imx/pfd.h>

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

    app.state.onOpen = [&]() {
        auto result = pfd::open_file("Open File").result();
        if (!result.empty()) {
            app.state.filePath = result[0];
            app.state.message = "Opened: " + result[0];
            app.runtime.request_frame();
        }
    };

    app.state.onSave = [&]() {
        auto result = pfd::save_file("Save File").result();
        if (!result.empty()) {
            app.state.filePath = result;
            app.state.message = "Save to: " + result;
            app.runtime.request_frame();
        }
    };

    // GLFW file drop callback
    glfwSetDropCallback(window, [](GLFWwindow* w, int count, const char** paths) {
        auto* a = static_cast<App*>(glfwGetWindowUserPointer(w));
        if (a && count > 0) {
            a->state.filePath = paths[0];
            a->state.message = "Dropped: " + std::string(paths[0]);
            a->runtime.request_frame();
        }
    });

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
      <Window title="File Dialog Demo">
        <Column gap={8}>
          <Text>Native File Dialogs + Drag & Drop</Text>
          <Separator />
          <Row gap={8}>
            <Button title="Open File" onPress={props.onOpen} />
            <Button title="Save File" onPress={props.onSave} />
          </Row>
          <Text>Drag & drop a file onto this window</Text>
          {props.message !== "" && <Text color={[0, 1, 0, 1]}>{props.message}</Text>}
          {props.filePath !== "" && <Text>Path: {props.filePath}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
`;
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
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(APPSTATE_INTERFACE));
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), cmakeTemplate(projectName, 'https://github.com/bgocumlu/imx.git'));
    fs.writeFileSync(path.join(projectDir, '.gitignore'), GITIGNORE);
    console.log(`imxc: initialized project "${projectName}" with template "filedialog"`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/main.cpp          — app shell with pfd + GLFW drop callback`);
    console.log(`    src/AppState.h        — C++ state struct with filePath/message fields`);
    console.log(`    src/App.tsx           — your root component`);
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
registerTemplate({ name: 'filedialog', description: 'Native file dialogs + drag & drop', generate });
