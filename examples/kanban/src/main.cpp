#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

#include "KanbanState.h"

struct App {
    GLFWwindow*      window  = nullptr;
    ImGuiIO*         io      = nullptr;
    imx::Runtime runtime;
    KanbanState state;
    int nextId = 10;
};

static void move_card(KanbanState& state, int cardId, int toColumn) {
    for (size_t c = 0; c < state.columns.size(); c++) {
        auto& cards = state.columns[c].cards;
        for (size_t i = 0; i < cards.size(); i++) {
            if (cards[i].id == cardId) {
                if (static_cast<int>(c) == toColumn) return;
                KanbanCard card = cards[i];
                cards.erase(cards.begin() + static_cast<int>(i));
                state.columns[toColumn].cards.push_back(card);
                return;
            }
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

    // Wire per-column onAdd callbacks
    for (size_t c = 0; c < app.state.columns.size(); c++) {
        app.state.columns[c].onAdd = [&app, c]() {
            KanbanCard card;
            card.title = "Card " + std::to_string(app.nextId++);
            card.id = app.nextId - 1;
            app.state.columns[c].cards.push_back(card);
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

    GLFWwindow* window = glfwCreateWindow(900, 600, "Kanban Board", nullptr, nullptr);
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

    // Set up columns with sample data
    KanbanColumn todo;
    todo.name = "To Do";
    todo.cards = {{"Design UI", 1}, {"Write tests", 2}, {"Setup CI", 3}};

    KanbanColumn inProgress;
    inProgress.name = "In Progress";
    inProgress.cards = {{"Implement API", 4}, {"Code review", 5}};

    KanbanColumn done;
    done.name = "Done";
    done.cards = {{"Project setup", 6}};

    app.state.columns = {todo, inProgress, done};

    app.state.onClearAll = [&]() {
        for (auto& col : app.state.columns) {
            col.cards.clear();
        }
    };

    // Register native widget for drag-drop of cards between columns
    imx::register_widget("DropZone", [&](imx::WidgetArgs& a) {
        int colIndex = a.get<int>("column");
        if (ImGui::BeginDragDropTarget()) {
            if (const ImGuiPayload* payload = ImGui::AcceptDragDropPayload("card")) {
                int cardId = *static_cast<const int*>(payload->Data);
                move_card(app.state, cardId, colIndex);
            }
            ImGui::EndDragDropTarget();
        }
    });

    while (glfwWindowShouldClose(window) == 0) {
        glfwPollEvents();
        render_frame(app);
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
