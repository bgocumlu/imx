#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "PhasesState.h"
#include <algorithm>

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

    // Phase 12: initialize struct binding fixes demo data
    {
        auto& p = app.state.phase12;
        p.username = "user123";
        p.notes = "Edit this text.\nMulti-line struct binding.";
        p.inner.brightness = 0.5f;
        p.inner.priority = 1;

        Phase12DragItem a1; a1.label = "Apple";  a1.id = 1;
        Phase12DragItem a2; a2.label = "Banana"; a2.id = 2;
        Phase12DragItem a3; a3.label = "Cherry"; a3.id = 3;
        p.pool_a.push_back(a1);
        p.pool_a.push_back(a2);
        p.pool_a.push_back(a3);

        Phase12DragItem b1; b1.label = "Date";       b1.id = 4;
        Phase12DragItem b2; b2.label = "Elderberry"; b2.id = 5;
        p.pool_b.push_back(b1);
        p.pool_b.push_back(b2);

        p.move_to_b = [&app](int id) {
            auto& a = app.state.phase12.pool_a;
            auto& b = app.state.phase12.pool_b;
            for (auto it = a.begin(); it != a.end(); ++it) {
                if (it->id == id) { b.push_back(*it); a.erase(it); return; }
            }
        };
        p.move_to_a = [&app](int id) {
            auto& a = app.state.phase12.pool_a;
            auto& b = app.state.phase12.pool_b;
            for (auto it = b.begin(); it != b.end(); ++it) {
                if (it->id == id) { a.push_back(*it); b.erase(it); return; }
            }
        };
    }

    // Phase 15: initialize sortable table data
    {
        auto& p = app.state.phase15;
        Phase15Row r1; r1.name = "Alice"; r1.score = "95"; r1.status = "Pass";
        Phase15Row r2; r2.name = "Bob";   r2.score = "72"; r2.status = "Warn";
        Phase15Row r3; r3.name = "Carol"; r3.score = "88"; r3.status = "Pass";
        Phase15Row r4; r4.name = "Dave";  r4.score = "61"; r4.status = "Fail";
        Phase15Row r5; r5.name = "Eve";   r5.score = "97"; r5.status = "Pass";
        p.rows.push_back(r1);
        p.rows.push_back(r2);
        p.rows.push_back(r3);
        p.rows.push_back(r4);
        p.rows.push_back(r5);

        p.sort_rows = [&app](int col, int dir) {
            auto& rows = app.state.phase15.rows;
            bool asc = (dir == 1);
            std::sort(rows.begin(), rows.end(), [col, asc](const Phase15Row& a, const Phase15Row& b) {
                if (col == 0) return asc ? a.name < b.name : a.name > b.name;
                if (col == 1) {
                    int sa = std::stoi(a.score), sb = std::stoi(b.score);
                    return asc ? sa < sb : sa > sb;
                }
                return asc ? a.status < b.status : a.status > b.status;
            });
        };
    }

    // Phase 17: wire MultiSelect callback
    {
        auto& p = app.state.phase17;
        p.apply_selection = [&app](ImGuiMultiSelectIO* io) {
            auto& p = app.state.phase17;
            imx::renderer::apply_multi_select_requests(io, p.ms_selected, p.MS_COUNT);
            p.ms_selection_count = 0;
            for (int i = 0; i < p.MS_COUNT; i++)
                if (p.ms_selected[i]) p.ms_selection_count++;
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
