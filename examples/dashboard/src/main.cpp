#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "DashboardState.h"
#include <cstdlib>
#include <ctime>
#include <cmath>

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    DashboardState state;
    int frameCount = 0;
};

static void simulate_data(App& app) {
    app.frameCount++;

    // Update metrics with simulated values
    float t = static_cast<float>(app.frameCount) * 0.02f;
    app.state.cpuUsage = 30.0f + 20.0f * sinf(t) + static_cast<float>(rand() % 10);
    app.state.memoryUsage = 55.0f + 10.0f * sinf(t * 0.5f) + static_cast<float>(rand() % 5);
    app.state.activeConnections = 80 + static_cast<int>(30.0f * sinf(t * 0.3f));
    app.state.requestsPerSec = 1200 + rand() % 400;

    // Update history every 10 frames
    if (app.frameCount % 10 == 0) {
        auto& cpu = app.state.cpuHistory;
        auto& mem = app.state.memHistory;
        auto& req = app.state.requestHistory;

        cpu.push_back(app.state.cpuUsage);
        mem.push_back(app.state.memoryUsage);
        req.push_back(static_cast<float>(app.state.requestsPerSec));

        if (cpu.size() > 60) cpu.erase(cpu.begin());
        if (mem.size() > 60) mem.erase(mem.begin());
        if (req.size() > 60) req.erase(req.begin());
    }

    // Add a log entry every 120 frames
    if (app.frameCount % 120 == 0) {
        const char* levels[] = {"INFO", "WARN", "ERROR"};
        const char* messages[] = {
            "Request processed successfully",
            "High memory usage detected",
            "Connection timeout on port 8080",
            "Cache invalidated",
            "New client connected",
            "Rate limit exceeded",
        };
        int li = rand() % 3;
        int mi = rand() % 6;

        char ts[32];
        int sec = app.frameCount / 60;
        snprintf(ts, sizeof(ts), "%02d:%02d:%02d", sec / 3600, (sec / 60) % 60, sec % 60);

        app.state.logs.insert(app.state.logs.begin(), {ts, levels[li], messages[mi]});
        if (app.state.logs.size() > 20) {
            app.state.logs.pop_back();
        }
    }
}

static void render_frame(App& app) {
    glfwMakeContextCurrent(app.window);
    if (glfwGetWindowAttrib(app.window, GLFW_ICONIFIED) != 0) return;

    int fb_w = 0, fb_h = 0;
    glfwGetFramebufferSize(app.window, &fb_w, &fb_h);
    if (fb_w <= 0 || fb_h <= 0) return;

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    simulate_data(app);
    imx::render_root(app.runtime, app.state);

    ImGui::Render();
    glViewport(0, 0, fb_w, fb_h);
    glClearColor(0.10F, 0.10F, 0.12F, 1.0F);
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
    srand(static_cast<unsigned>(time(nullptr)));

    if (glfwInit() == 0) return 1;

    const char* glsl_version = "#version 150";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(1000, 700, "Dashboard", nullptr, nullptr);
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

    app.state.onRefresh = [&]() {
        app.state.cpuHistory.clear();
        app.state.memHistory.clear();
        app.state.requestHistory.clear();
    };

    app.state.onClearLogs = [&]() {
        app.state.logs.clear();
    };

    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
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
