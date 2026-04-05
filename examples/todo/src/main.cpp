#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "TodoState.h"

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    TodoState state;
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

    // Compute counts each frame
    auto& st = app.state;
    st.itemCount = static_cast<int>(st.items.size());
    st.doneCount = 0;
    for (auto& item : st.items) {
        if (item.done) st.doneCount++;
    }

    // Wire per-item callbacks each frame
    for (size_t i = 0; i < st.items.size(); i++) {
        st.items[i].onToggle = [&st, i]() {
            if (i < st.items.size()) {
                st.items[i].done = !st.items[i].done;
            }
        };
        st.items[i].onRemove = [&st, i]() {
            if (i < st.items.size()) {
                st.items.erase(st.items.begin() + static_cast<int>(i));
            }
        };
    }

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

    GLFWwindow* window = glfwCreateWindow(600, 500, "Todo App", nullptr, nullptr);
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

    // Pre-populate sample items
    app.state.items.push_back({"Buy groceries", false, {}, {}});
    app.state.items.push_back({"Write documentation", false, {}, {}});
    app.state.items.push_back({"Review pull request", false, {}, {}});

    // Wire top-level callbacks
    app.state.onClearCompleted = [&]() {
        auto& items = app.state.items;
        items.erase(
            std::remove_if(items.begin(), items.end(),
                [](const TodoItem& t) { return t.done; }),
            items.end());
    };

    // Native widget: text input + add button (handles add-task flow in C++)
    imx::register_widget("AddTaskInput", [&](imx::WidgetArgs& a) {
        static char buf[256] = "";
        ImGui::SetNextItemWidth(200.0F);
        bool entered = ImGui::InputText("##new_task", buf, sizeof(buf),
            ImGuiInputTextFlags_EnterReturnsTrue);
        ImGui::SameLine();
        if ((ImGui::Button("Add") || entered) && buf[0] != '\0') {
            app.state.items.push_back({buf, false, {}, {}});
            buf[0] = '\0';
        }
    });

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
