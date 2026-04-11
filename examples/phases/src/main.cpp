#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "PhasesState.h"

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    PhasesState state;
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

    GLFWwindow* window = glfwCreateWindow(1000, 700, "IMX Phase Showcase", nullptr, nullptr);
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

    // Phase 11: initialize struct binding demo data
    {
        auto& p = app.state.phase11;
        Phase11Task t1; t1.name = "Alpha";  t1.progress = 0.3f;
        Phase11Task t2; t2.name = "Beta";   t2.progress = 0.7f;
        Phase11Task t3; t3.name = "Gamma";  t3.progress = 0.5f;
        p.tasks.push_back(t1);
        p.tasks.push_back(t2);
        p.tasks.push_back(t3);
        p.total_tasks = static_cast<int>(p.tasks.size());

        p.add_task = [&app]() {
            auto& p = app.state.phase11;
            Phase11Task t;
            t.name = "Task " + std::to_string(p.tasks.size() + 1);
            p.tasks.push_back(t);
            p.total_tasks = static_cast<int>(p.tasks.size());
        };
        p.reset = [&app]() {
            auto& p = app.state.phase11;
            p.speed = 5.0f;
            p.count = 3;
            p.volume = 50.0f;
            p.tasks.clear();
            Phase11Task r1; r1.name = "Alpha";  r1.progress = 0.3f;
            Phase11Task r2; r2.name = "Beta";   r2.progress = 0.7f;
            Phase11Task r3; r3.name = "Gamma";  r3.progress = 0.5f;
            p.tasks.push_back(r1);
            p.tasks.push_back(r2);
            p.tasks.push_back(r3);
            p.total_tasks = 3;
        };
    }

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
