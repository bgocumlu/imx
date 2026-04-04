#include <reimgui/renderer.h>
#include <cstdarg>

namespace reimgui::renderer {

// Per-frame ID counters — reset in begin_dockspace() each frame
static int g_table_id = 0;
static int g_tabbar_id = 0;

void begin_window(const char* title, const Style& style) {
    before_child();
    ImGui::Begin(title);
    if (style.font_size) {
        float scale = *style.font_size / ImGui::GetFontSize();
        ImGui::SetWindowFontScale(scale);
    }
}

void end_window() {
    ImGui::End();
}

void text(const char* fmt, ...) {
    before_child();
    va_list args;
    va_start(args, fmt);
    ImGui::TextV(fmt, args);
    va_end(args);
}

bool button(const char* title, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    return ImGui::Button(title, size);
}

void separator() {
    before_child();
    ImGui::Separator();
}

bool text_input(const char* label, TextBuffer& buffer, const Style& style) {
    before_child();
    float width = style.width.value_or(0.0f);
    if (width > 0.0f) ImGui::SetNextItemWidth(width);
    bool changed = ImGui::InputText(label, buffer.data(), buffer.capacity());
    if (changed) buffer.mark_modified();
    return changed;
}

bool checkbox(const char* label, bool* value, const Style& style) {
    before_child();
    return ImGui::Checkbox(label, value);
}

bool begin_popup(const char* id, const Style& style) {
    return ImGui::BeginPopup(id);
}

void end_popup() {
    ImGui::EndPopup();
}

void open_popup(const char* id) {
    ImGui::OpenPopup(id);
}

void begin_dockspace(const Style& style) {
    g_table_id = 0;
    g_tabbar_id = 0;

    // Create a fullscreen invisible host window and call DockSpace
    ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(viewport->WorkPos);
    ImGui::SetNextWindowSize(viewport->WorkSize);
    ImGui::SetNextWindowViewport(viewport->ID);

    ImGuiWindowFlags host_flags = ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoTitleBar |
                                  ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize |
                                  ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus |
                                  ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoBackground |
                                  ImGuiWindowFlags_MenuBar;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0F, 0.0F));
    ImGui::Begin("##DockSpaceHost", nullptr, host_flags);
    ImGui::PopStyleVar(3);
    ImGui::DockSpace(ImGui::GetID("MainDockSpace"), ImVec2(0.0F, 0.0F), ImGuiDockNodeFlags_None);
}

void end_dockspace() {
    ImGui::End();
}

bool begin_menu_bar() {
    return ImGui::BeginMenuBar();
}

void end_menu_bar() {
    ImGui::EndMenuBar();
}

bool begin_menu(const char* label) {
    return ImGui::BeginMenu(label);
}

void end_menu() {
    ImGui::EndMenu();
}

bool menu_item(const char* label, const char* shortcut) {
    return ImGui::MenuItem(label, shortcut);
}

bool begin_table(const char* id, int column_count, const char** column_names, const Style& style) {
    before_child();
    char table_id[64];
    snprintf(table_id, sizeof(table_id), "##table_%d", g_table_id++);
    if (ImGui::BeginTable(table_id, column_count, ImGuiTableFlags_Borders | ImGuiTableFlags_RowBg | ImGuiTableFlags_Resizable)) {
        for (int i = 0; i < column_count; i++) {
            ImGui::TableSetupColumn(column_names[i]);
        }
        ImGui::TableHeadersRow();
        return true;
    }
    return false;
}

void end_table() {
    ImGui::EndTable();
}

bool begin_tab_bar(const Style& style) {
    before_child();
    char id[64];
    snprintf(id, sizeof(id), "##tabbar_%d", g_tabbar_id++);
    return ImGui::BeginTabBar(id);
}

void end_tab_bar() {
    ImGui::EndTabBar();
}

bool begin_tab_item(const char* label) {
    return ImGui::BeginTabItem(label);
}

void end_tab_item() {
    ImGui::EndTabItem();
}

bool begin_tree_node(const char* label) {
    before_child();
    return ImGui::TreeNode(label);
}

void end_tree_node() {
    ImGui::TreePop();
}

bool begin_collapsing_header(const char* label) {
    before_child();
    return ImGui::CollapsingHeader(label);
}

void end_collapsing_header() {
    // CollapsingHeader doesn't need a matching close call
}

bool slider_float(const char* label, float* value, float min, float max, const Style& style) {
    before_child();
    return ImGui::SliderFloat(label, value, min, max);
}

bool slider_int(const char* label, int* value, int min, int max, const Style& style) {
    before_child();
    return ImGui::SliderInt(label, value, min, max);
}

bool drag_float(const char* label, float* value, float speed, const Style& style) {
    before_child();
    return ImGui::DragFloat(label, value, speed);
}

bool drag_int(const char* label, int* value, float speed, const Style& style) {
    before_child();
    return ImGui::DragInt(label, value, speed);
}

bool combo(const char* label, int* current_item, const char* const items[], int items_count, const Style& style) {
    before_child();
    return ImGui::Combo(label, current_item, items, items_count);
}

} // namespace reimgui::renderer
