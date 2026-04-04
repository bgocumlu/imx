#include <imx/renderer.h>
#include <cstdarg>
#include <cfloat>
#include <cstring>
#include <vector>

namespace imx::renderer {

// Per-frame ID counters — reset in begin_dockspace() each frame
static int g_table_id = 0;
static int g_tabbar_id = 0;

struct ThemeState {
    int color_count;
    int var_count;
};
static std::vector<ThemeState> g_theme_stack;

} // temporarily close namespace imx::renderer

namespace imx {

static std::unordered_map<std::string, WidgetFunc> g_widget_registry;
static std::unordered_map<std::string, ThemeFunc> g_theme_registry;

void register_widget(const std::string& name, WidgetFunc func) {
    g_widget_registry[name] = std::move(func);
}

void call_widget(const std::string& name, WidgetArgs& args) {
    auto it = g_widget_registry.find(name);
    if (it != g_widget_registry.end()) {
        renderer::before_child();
        it->second(args);
    }
}

void register_theme(const std::string& name, ThemeFunc func) {
    g_theme_registry[name] = std::move(func);
}

} // namespace imx

namespace imx::renderer {

void begin_window(const char* title, int flags, bool* p_open, const Style& style) {
    before_child();
    ImGui::Begin(title, p_open, flags);
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

bool input_int(const char* label, int* value, const Style& style) {
    before_child();
    return ImGui::InputInt(label, value);
}

bool input_float(const char* label, float* value, const Style& style) {
    before_child();
    return ImGui::InputFloat(label, value);
}

bool color_edit(const char* label, float color[4], const Style& style) {
    before_child();
    return ImGui::ColorEdit4(label, color);
}

bool list_box(const char* label, int* current_item, const char* const items[], int items_count, const Style& style) {
    before_child();
    return ImGui::ListBox(label, current_item, items, items_count);
}

void progress_bar(float fraction, const char* overlay, const Style& style) {
    before_child();
    ImGui::ProgressBar(fraction, ImVec2(-FLT_MIN, 0), overlay);
}

void tooltip(const char* text) {
    // Don't call before_child() -- tooltip attaches to previous item
    if (ImGui::IsItemHovered()) {
        ImGui::SetTooltip("%s", text);
    }
}

void begin_theme(const char* preset, const ThemeConfig& config) {
    before_child();

    // Apply preset — check custom registry first, then built-ins
    auto it = g_theme_registry.find(preset);
    if (it != g_theme_registry.end()) {
        it->second();
    } else if (std::strcmp(preset, "dark") == 0) {
        ImGui::StyleColorsDark();
    } else if (std::strcmp(preset, "light") == 0) {
        ImGui::StyleColorsLight();
    } else if (std::strcmp(preset, "classic") == 0) {
        ImGui::StyleColorsClassic();
    }

    int color_count = 0;
    int var_count = 0;

    // Accent color overrides
    if (config.accent_color) {
        ImVec4 c = *config.accent_color;
        ImVec4 hovered(c.x + (1.0F - c.x) * 0.2F, c.y + (1.0F - c.y) * 0.2F,
                       c.z + (1.0F - c.z) * 0.2F, c.w);
        ImVec4 active(c.x * 0.8F, c.y * 0.8F, c.z * 0.8F, c.w);
        ImVec4 frame_bg(c.x * 0.3F, c.y * 0.3F, c.z * 0.3F, 0.5F);

        ImGui::PushStyleColor(ImGuiCol_Button, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ButtonHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ButtonActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_Header, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_HeaderHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_HeaderActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_Tab, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TabSelected, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TabHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_SliderGrab, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_SliderGrabActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_CheckMark, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_FrameBg, frame_bg); color_count++;
    }
    if (config.window_bg) {
        ImGui::PushStyleColor(ImGuiCol_WindowBg, *config.window_bg); color_count++;
    }
    if (config.text_color) {
        ImGui::PushStyleColor(ImGuiCol_Text, *config.text_color); color_count++;
    }

    // Style var overrides
    if (config.rounding) {
        float r = *config.rounding;
        ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_ChildRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_PopupRounding, r); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_TabRounding, r); var_count++;
    }
    if (config.border_size) {
        float b = *config.border_size;
        ImGui::PushStyleVar(ImGuiStyleVar_FrameBorderSize, b); var_count++;
        ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, b); var_count++;
    }
    if (config.spacing) {
        float s = *config.spacing;
        ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, ImVec2(s, s)); var_count++;
    }

    ThemeState state;
    state.color_count = color_count;
    state.var_count = var_count;
    g_theme_stack.push_back(state);
}

void end_theme() {
    if (!g_theme_stack.empty()) {
        ThemeState state = g_theme_stack.back();
        g_theme_stack.pop_back();
        if (state.color_count > 0) ImGui::PopStyleColor(state.color_count);
        if (state.var_count > 0) ImGui::PopStyleVar(state.var_count);
    }
}

} // namespace imx::renderer
