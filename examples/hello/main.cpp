#include "hand_written_app.h"
#include <reimgui/runtime.h>
#include <reimgui/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>

#include <GLFW/glfw3.h>

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    reimgui::Runtime runtime;
};

// --- Docking: fullscreen invisible host window + DockSpace() fills the main viewport every frame ---
static void draw_dockspace() {
    ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(viewport->WorkPos);
    ImGui::SetNextWindowSize(viewport->WorkSize);
    ImGui::SetNextWindowViewport(viewport->ID);

    ImGuiWindowFlags host_flags = ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoTitleBar |
                                  ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize |
                                  ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus |
                                  ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoBackground;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0F, 0.0F));

    ImGui::Begin("DockSpaceHost", nullptr, host_flags);
    ImGui::PopStyleVar(3);

    ImGui::DockSpace(ImGui::GetID("MainDockSpace"), ImVec2(0.0F, 0.0F), ImGuiDockNodeFlags_None);
    ImGui::End();
}

static void render_frame(App& app) {
    // --- Resize / viewports: always use the main window's GL context for the main pass ---
    glfwMakeContextCurrent(app.window);

    if (glfwGetWindowAttrib(app.window, GLFW_ICONIFIED) != 0) {
        return;
    }

    int fb_w = 0;
    int fb_h = 0;
    glfwGetFramebufferSize(app.window, &fb_w, &fb_h);
    // --- Resize: skip GL when framebuffer not ready (minimize / transient 0 size during drag) ---
    if (fb_w <= 0 || fb_h <= 0) {
        return;
    }

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    draw_dockspace();

    // --- ReImGui: hand-written render function (simulates compiler output) ---
    hand_written_render_root(app.runtime);

    ImGui::Render();

    glViewport(0, 0, fb_w, fb_h);
    glClearColor(0.12F, 0.12F, 0.15F, 1.0F);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    // --- Multi-viewports: required when ImGuiConfigFlags_ViewportsEnable is set ---
    if ((app.io->ConfigFlags & ImGuiConfigFlags_ViewportsEnable) != 0) {
        ImGui::UpdatePlatformWindows();
        ImGui::RenderPlatformWindowsDefault();
    }

    // --- Resize / viewports: restore main context before swapping the main window ---
    glfwMakeContextCurrent(app.window);
    glfwSwapBuffers(app.window);
}

// --- Resize: repaint while the user drags window edges ---
static void window_size_callback(GLFWwindow* window, int /*width*/, int /*height*/) {
    auto* app = static_cast<App*>(glfwGetWindowUserPointer(window));
    if (app != nullptr) {
        render_frame(*app);
    }
}

int main() {
    if (glfwInit() == 0) {
        return 1;
    }

    const char* glsl_version = "#version 150";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(600, 400, "reimgui - hand-written test", nullptr, nullptr);
    if (window == nullptr) {
        glfwTerminate();
        return 1;
    }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();

    // --- Docking: enable dock nodes and tab/split UI ---
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    // --- Multi-viewports: drag imgui windows outside the GLFW window as separate OS windows ---
    io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;

    ImGui::StyleColorsDark();
    // --- Multi-viewports: keep platform windows visually consistent with the main imgui style ---
    ImGuiStyle& style = ImGui::GetStyle();
    if ((io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable) != 0) {
        style.WindowRounding = 0.0F;
        style.Colors[ImGuiCol_WindowBg].w = 1.0F;
    }

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    App app;
    app.window = window;
    app.io     = &io;
    // --- Resize: callback needs App* (same object the main loop uses for render_frame) ---
    glfwSetWindowUserPointer(window, &app);
    glfwSetWindowSizeCallback(window, window_size_callback);

    while (glfwWindowShouldClose(window) == 0) {
        glfwPollEvents();
        // --- Resize: one shared render path for main loop and window_size_callback ---
        render_frame(app);
    }

    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();

    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
