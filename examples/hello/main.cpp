// examples/hello/main.cpp
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

    // DockSpace component handles the dock host window now
    imx::render_root(app.runtime);

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

    GLFWwindow* window = glfwCreateWindow(800, 600, "imx", nullptr, nullptr);
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

    // --- Custom widget: ToggleSwitch ---
    imx::register_widget("ToggleSwitch", [](imx::WidgetArgs& a) {
        bool on = a.get<bool>("value");
        ImVec4 bg = on ? ImVec4(0.2f, 0.8f, 0.2f, 1.0f) : ImVec4(0.5f, 0.5f, 0.5f, 1.0f);
        ImGui::PushStyleColor(ImGuiCol_Button, bg);
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, bg);
        if (ImGui::Button(on ? "  ON " : " OFF ", ImVec2(50, 0))) {
            a.call<bool>("onToggle", !on);
        }
        ImGui::PopStyleColor(2);
    });

    App app;
    app.window = window;
    app.io     = &io;
    // --- Resize: callback needs App* (same object the main loop uses for render_frame) ---
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
