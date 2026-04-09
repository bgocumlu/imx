#include <imx/renderer.h>
#include <algorithm>
#include <cctype>
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
static std::unordered_map<std::string, ImFont*> g_font_registry;

static ImFontConfig make_font_config(const FontOptions& options) {
    ImFontConfig cfg;
    cfg.PixelSnapH = options.pixel_snap_h;
    cfg.OversampleH = options.oversample_h > 0 ? options.oversample_h : 1;
    cfg.OversampleV = options.oversample_v > 0 ? options.oversample_v : 1;
    cfg.RasterizerMultiply = options.rasterizer_multiply > 0.0f ? options.rasterizer_multiply : 1.0f;
    cfg.MergeMode = options.merge_mode;
    return cfg;
}

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

ImFont* load_font(const char* name, const char* path, float size, const FontOptions& options) {
    ImFontConfig cfg = make_font_config(options);
    ImFont* font = ImGui::GetIO().Fonts->AddFontFromFileTTF(path, size, &cfg);
    if (font) {
        g_font_registry[name] = font;
    }
    return font;
}

ImFont* load_font_embedded(const char* name, const unsigned char* data, int data_size, float size, const FontOptions& options) {
    ImFontConfig cfg = make_font_config(options);
    cfg.FontDataOwnedByAtlas = false;
    ImFont* font = ImGui::GetIO().Fonts->AddFontFromMemoryTTF(
        const_cast<void*>(static_cast<const void*>(data)), data_size, size, &cfg);
    if (font) {
        g_font_registry[name] = font;
    }
    return font;
}

ImFont* find_font(const char* name) {
    auto it = g_font_registry.find(name);
    return it != g_font_registry.end() ? it->second : nullptr;
}

bool set_default_font(const char* name) {
    ImFont* font = find_font(name);
    if (!font) {
        return false;
    }
    ImGui::GetIO().FontDefault = font;
    return true;
}

std::string clipboard_get() {
    const char* text = ImGui::GetClipboardText();
    return text ? std::string(text) : std::string();
}

void clipboard_set(const char* text) {
    ImGui::SetClipboardText(text ? text : "");
}

} // namespace imx

namespace imx::renderer {

static std::string trim_and_upper(const char* value) {
    if (!value) {
        return {};
    }

    std::string result(value);
    result.erase(result.begin(), std::find_if(result.begin(), result.end(), [](unsigned char ch) {
        return !std::isspace(ch);
    }));
    result.erase(std::find_if(result.rbegin(), result.rend(), [](unsigned char ch) {
        return !std::isspace(ch);
    }).base(), result.end());
    std::transform(result.begin(), result.end(), result.begin(), [](unsigned char ch) {
        return static_cast<char>(std::toupper(ch));
    });
    return result;
}

static ImGuiMouseCursor parse_mouse_cursor(const char* cursor) {
    const std::string value = trim_and_upper(cursor);
    if (value == "NONE") return ImGuiMouseCursor_None;
    if (value == "ARROW") return ImGuiMouseCursor_Arrow;
    if (value == "TEXTINPUT" || value == "TEXT") return ImGuiMouseCursor_TextInput;
    if (value == "RESIZEALL") return ImGuiMouseCursor_ResizeAll;
    if (value == "RESIZENS") return ImGuiMouseCursor_ResizeNS;
    if (value == "RESIZEEW") return ImGuiMouseCursor_ResizeEW;
    if (value == "RESIZENESW") return ImGuiMouseCursor_ResizeNESW;
    if (value == "RESIZENWSE") return ImGuiMouseCursor_ResizeNWSE;
    if (value == "HAND") return ImGuiMouseCursor_Hand;
    if (value == "WAIT") return ImGuiMouseCursor_Wait;
    if (value == "PROGRESS") return ImGuiMouseCursor_Progress;
    if (value == "NOTALLOWED") return ImGuiMouseCursor_NotAllowed;
    return ImGuiMouseCursor_Arrow;
}

static std::optional<ImGuiKey> parse_named_key(const std::string& value) {
    if (value.size() == 1) {
        const char ch = value[0];
        if (ch >= 'A' && ch <= 'Z') return static_cast<ImGuiKey>(ImGuiKey_A + (ch - 'A'));
        if (ch >= '0' && ch <= '9') return static_cast<ImGuiKey>(ImGuiKey_0 + (ch - '0'));
    }

    if (value.size() >= 2 && value[0] == 'F') {
        const int number = std::atoi(value.c_str() + 1);
        if (number >= 1 && number <= 24) return static_cast<ImGuiKey>(ImGuiKey_F1 + (number - 1));
    }

    if (value == "ENTER" || value == "RETURN") return ImGuiKey_Enter;
    if (value == "ESC" || value == "ESCAPE") return ImGuiKey_Escape;
    if (value == "SPACE") return ImGuiKey_Space;
    if (value == "TAB") return ImGuiKey_Tab;
    if (value == "BACKSPACE") return ImGuiKey_Backspace;
    if (value == "DELETE" || value == "DEL") return ImGuiKey_Delete;
    if (value == "INSERT" || value == "INS") return ImGuiKey_Insert;
    if (value == "HOME") return ImGuiKey_Home;
    if (value == "END") return ImGuiKey_End;
    if (value == "PAGEUP" || value == "PGUP") return ImGuiKey_PageUp;
    if (value == "PAGEDOWN" || value == "PGDN") return ImGuiKey_PageDown;
    if (value == "LEFT") return ImGuiKey_LeftArrow;
    if (value == "RIGHT") return ImGuiKey_RightArrow;
    if (value == "UP") return ImGuiKey_UpArrow;
    if (value == "DOWN") return ImGuiKey_DownArrow;
    if (value == "COMMA") return ImGuiKey_Comma;
    if (value == "PERIOD" || value == "DOT") return ImGuiKey_Period;
    if (value == "SLASH") return ImGuiKey_Slash;
    if (value == "BACKSLASH") return ImGuiKey_Backslash;
    if (value == "APOSTROPHE" || value == "QUOTE") return ImGuiKey_Apostrophe;
    if (value == "SEMICOLON") return ImGuiKey_Semicolon;
    if (value == "MINUS") return ImGuiKey_Minus;
    if (value == "EQUAL" || value == "PLUS") return ImGuiKey_Equal;
    if (value == "LEFTBRACKET" || value == "LBRACKET") return ImGuiKey_LeftBracket;
    if (value == "RIGHTBRACKET" || value == "RBRACKET") return ImGuiKey_RightBracket;
    if (value == "GRAVE" || value == "BACKTICK" || value == "TILDE") return ImGuiKey_GraveAccent;

    return std::nullopt;
}

static std::optional<ImGuiKeyChord> parse_key_chord(const char* keys) {
    if (!keys || keys[0] == '\0') {
        return std::nullopt;
    }

    std::string input(keys);
    ImGuiKeyChord chord = 0;
    std::optional<ImGuiKey> final_key;
    size_t start = 0;

    while (start <= input.size()) {
        const size_t end = input.find('+', start);
        const std::string token = trim_and_upper(input.substr(start, end == std::string::npos ? std::string::npos : end - start).c_str());
        if (token.empty()) {
            return std::nullopt;
        }

        if (token == "CTRL" || token == "CONTROL" || token == "CMD" || token == "COMMAND") {
            chord |= ImGuiMod_Ctrl;
        } else if (token == "SHIFT") {
            chord |= ImGuiMod_Shift;
        } else if (token == "ALT" || token == "OPTION") {
            chord |= ImGuiMod_Alt;
        } else if (token == "SUPER" || token == "META" || token == "WIN" || token == "WINDOWS") {
            chord |= ImGuiMod_Super;
        } else {
            final_key = parse_named_key(token);
            if (!final_key.has_value()) {
                return std::nullopt;
            }
        }

        if (end == std::string::npos) {
            break;
        }
        start = end + 1;
    }

    if (!final_key.has_value()) {
        return std::nullopt;
    }

    chord |= *final_key;
    return chord;
}

void begin_window(const char* title, int flags, bool* p_open, bool viewport_always_on_top, const Style& style) {
    before_child();
    ImGui::Begin(title, p_open, flags);
    if (viewport_always_on_top) {
        ImGuiViewport* vp = ImGui::GetWindowViewport();
        if (vp) vp->Flags |= ImGuiViewportFlags_TopMost;
    }
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

bool button(const char* title, const Style& style, bool disabled) {
    before_child();
    if (disabled) ImGui::BeginDisabled();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    bool pressed = ImGui::Button(title, size);
    if (disabled) ImGui::EndDisabled();
    return pressed;
}

bool small_button(const char* label) {
    before_child();
    return ImGui::SmallButton(label);
}

bool arrow_button(const char* id, int direction) {
    before_child();
    return ImGui::ArrowButton(id, static_cast<ImGuiDir>(direction));
}

bool invisible_button(const char* id, float width, float height) {
    before_child();
    return ImGui::InvisibleButton(id, ImVec2(width, height));
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

bool begin_context_menu_item(const char* id, int mouse_button) {
    return ImGui::BeginPopupContextItem((id && id[0] != '\0') ? id : nullptr, mouse_button);
}

bool begin_context_menu_window(const char* id, int mouse_button) {
    return ImGui::BeginPopupContextWindow((id && id[0] != '\0') ? id : nullptr, mouse_button);
}

void end_context_menu() {
    ImGui::EndPopup();
}

ImGuiMultiSelectIO* begin_multi_select(int flags, int selection_size, int items_count) {
    before_child();
    return ImGui::BeginMultiSelect(flags, selection_size, items_count);
}

ImGuiMultiSelectIO* end_multi_select() {
    return ImGui::EndMultiSelect();
}

void set_next_item_selection_data(int index) {
    ImGui::SetNextItemSelectionUserData(static_cast<ImGuiSelectionUserData>(index));
}

void begin_dockspace(const Style& style, bool has_menu_bar) {
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
                                  ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoBackground;
    if (has_menu_bar) host_flags |= ImGuiWindowFlags_MenuBar;

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

bool begin_main_menu_bar() {
    return ImGui::BeginMainMenuBar();
}

void end_main_menu_bar() {
    ImGui::EndMainMenuBar();
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

bool begin_table(const char* id, const TableColumn* columns, int column_count, const Style& style, const TableOptions& options) {
    before_child();
    char table_id[64];
    snprintf(table_id, sizeof(table_id), "##table_%d", g_table_id++);
    ImGuiTableFlags flags = ImGuiTableFlags_Resizable;
    if (!options.no_borders) flags |= ImGuiTableFlags_Borders;
    if (!options.no_row_bg) flags |= ImGuiTableFlags_RowBg;
    if (options.sortable) flags |= ImGuiTableFlags_Sortable;
    if (options.hideable) flags |= ImGuiTableFlags_Hideable;
    if (options.multi_sortable) flags |= ImGuiTableFlags_SortMulti;
    if (options.no_clip) flags |= ImGuiTableFlags_NoClip;
    if (options.pad_outer_x) flags |= ImGuiTableFlags_PadOuterX;
    if (options.scroll_x) flags |= ImGuiTableFlags_ScrollX;
    if (options.scroll_y) flags |= ImGuiTableFlags_ScrollY;
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    if (ImGui::BeginTable(table_id, column_count, flags, size)) {
        for (int i = 0; i < column_count; i++) {
            ImGui::TableSetupColumn(columns[i].label, columns[i].flags);
        }
        if (column_count > 0) {
            ImGui::TableHeadersRow();
        }
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

bool begin_tree_node(const char* label, ImGuiTreeNodeFlags flags) {
    before_child();
    return ImGui::TreeNodeEx(label, flags);
}

void end_tree_node(bool no_tree_push_on_open) {
    if (!no_tree_push_on_open) {
        ImGui::TreePop();
    }
}

bool begin_collapsing_header(const char* label, ImGuiTreeNodeFlags flags, bool* p_visible) {
    before_child();
    if (p_visible) {
        return ImGui::CollapsingHeader(label, p_visible, flags);
    }
    return ImGui::CollapsingHeader(label, flags);
}

void end_collapsing_header() {
    // CollapsingHeader doesn't need a matching close call
}

bool slider_float(const char* label, float* value, float min, float max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::SliderFloat(label, value, min, max);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool slider_int(const char* label, int* value, int min, int max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::SliderInt(label, value, min, max);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool vslider_float(const char* label, float width, float height, float* value, float min, float max, const Style& style) {
    before_child();
    return ImGui::VSliderFloat(label, ImVec2(width, height), value, min, max);
}

bool vslider_int(const char* label, float width, float height, int* value, int min, int max, const Style& style) {
    before_child();
    return ImGui::VSliderInt(label, ImVec2(width, height), value, min, max);
}

bool slider_angle(const char* label, float* value, float min, float max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::SliderAngle(label, value, min, max);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool drag_float(const char* label, float* value, float speed, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::DragFloat(label, value, speed);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool drag_int(const char* label, int* value, float speed, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::DragInt(label, value, speed);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool input_float_n(const char* label, float* values, int count, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::InputFloat2(label, values); break;
        case 3: r = ImGui::InputFloat3(label, values); break;
        case 4: r = ImGui::InputFloat4(label, values); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool input_int_n(const char* label, int* values, int count, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::InputInt2(label, values); break;
        case 3: r = ImGui::InputInt3(label, values); break;
        case 4: r = ImGui::InputInt4(label, values); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool drag_float_n(const char* label, float* values, int count, float speed, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::DragFloat2(label, values, speed); break;
        case 3: r = ImGui::DragFloat3(label, values, speed); break;
        case 4: r = ImGui::DragFloat4(label, values, speed); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool drag_int_n(const char* label, int* values, int count, float speed, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::DragInt2(label, values, speed); break;
        case 3: r = ImGui::DragInt3(label, values, speed); break;
        case 4: r = ImGui::DragInt4(label, values, speed); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool slider_float_n(const char* label, float* values, int count, float min, float max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::SliderFloat2(label, values, min, max); break;
        case 3: r = ImGui::SliderFloat3(label, values, min, max); break;
        case 4: r = ImGui::SliderFloat4(label, values, min, max); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool slider_int_n(const char* label, int* values, int count, int min, int max, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = false;
    switch (count) {
        case 2: r = ImGui::SliderInt2(label, values, min, max); break;
        case 3: r = ImGui::SliderInt3(label, values, min, max); break;
        case 4: r = ImGui::SliderInt4(label, values, min, max); break;
    }
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool combo(const char* label, int* current_item, const char* const items[], int items_count, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::Combo(label, current_item, items, items_count);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool begin_combo(const char* label, const char* preview, int flags, const Style& style) {
    before_child();
    return ImGui::BeginCombo(label, preview, flags);
}

void end_combo() {
    ImGui::EndCombo();
}

bool input_int(const char* label, int* value, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::InputInt(label, value);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool input_float(const char* label, float* value, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::InputFloat(label, value);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool color_edit(const char* label, float color[4], const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::ColorEdit4(label, color);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool color_edit3(const char* label, float color[3], const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::ColorEdit3(label, color);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

bool list_box(const char* label, int* current_item, const char* const items[], int items_count, const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::ListBox(label, current_item, items, items_count);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

void progress_bar(float fraction, const char* overlay, const Style& style) {
    before_child();
    ImVec2 size(-FLT_MIN, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    ImGui::ProgressBar(fraction, size, overlay);
}

void tooltip(const char* text) {
    if (text && text[0] != '\0') {
        ImGui::SetItemTooltip("%s", text);
    }
}

void request_keyboard_focus() {
    ImGui::SetKeyboardFocusHere();
}

bool item_hovered() {
    return ImGui::IsItemHovered();
}

bool item_active() {
    return ImGui::IsItemActive();
}

bool item_focused() {
    return ImGui::IsItemFocused();
}

bool item_clicked() {
    return ImGui::IsItemClicked();
}

bool item_double_clicked() {
    return ImGui::IsItemHovered() && ImGui::IsMouseDoubleClicked(ImGuiMouseButton_Left);
}

void item_scroll_to_here() {
    ImGui::SetScrollHereY();
}

void item_cursor(const char* cursor) {
    if (!ImGui::IsItemHovered()) {
        return;
    }
    ImGui::SetMouseCursor(parse_mouse_cursor(cursor));
}

bool shortcut_pressed(const char* keys) {
    const std::optional<ImGuiKeyChord> chord = parse_key_chord(keys);
    if (!chord.has_value()) {
        return false;
    }
    return ImGui::IsKeyChordPressed(*chord);
}

void bullet_text(const char* fmt, ...) {
    before_child();
    va_list args;
    va_start(args, fmt);
    ImGui::BulletTextV(fmt, args);
    va_end(args);
}

void label_text(const char* label, const char* text) {
    before_child();
    ImGui::LabelText(label, "%s", text);
}

bool selectable(const char* label, bool selected, const Style& style) {
    before_child();
    return ImGui::Selectable(label, selected);
}

bool radio(const char* label, int* value, int v_button, const Style& style) {
    before_child();
    return ImGui::RadioButton(label, value, v_button);
}

bool text_input_multiline(const char* label, TextBuffer& buffer, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    float item_width = style.width.value_or(0.0f);
    if (item_width > 0.0f) ImGui::SetNextItemWidth(item_width);
    bool changed = ImGui::InputTextMultiline(label, buffer.data(), buffer.capacity(), size);
    if (changed) buffer.mark_modified();
    return changed;
}

bool color_picker(const char* label, float color[4], const Style& style) {
    before_child();
    return ImGui::ColorPicker4(label, color);
}

bool color_picker3(const char* label, float color[3], const Style& style) {
    before_child();
    if (style.width) ImGui::PushItemWidth(*style.width);
    bool r = ImGui::ColorPicker3(label, color);
    if (style.width) ImGui::PopItemWidth();
    return r;
}

void plot_lines(const char* label, const float* values, int count, const char* overlay, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    ImGui::PlotLines(label, values, count, 0, overlay, FLT_MAX, FLT_MAX, size);
}

void plot_histogram(const char* label, const float* values, int count, const char* overlay, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    ImGui::PlotHistogram(label, values, count, 0, overlay, FLT_MAX, FLT_MAX, size);
}

bool begin_modal(const char* title, bool open, bool* user_closed, int flags, const Style& style) {
    // No before_child() — modals are overlays, not part of parent layout
    if (user_closed) *user_closed = false;

    if (open && !ImGui::IsPopupOpen(title)) {
        ImGui::OpenPopup(title);
    }
    // If state says closed but popup is still open (e.g., button set state to false
    // without going through ImGui's X button), force-close it properly.
    if (!open && ImGui::IsPopupOpen(title)) {
        if (ImGui::BeginPopupModal(title, nullptr, flags)) {
            ImGui::CloseCurrentPopup();
            ImGui::EndPopup();
        }
        return false;
    }
    if (!open) return false;

    // Pass p_open to get X button. If X is clicked, BeginPopupModal calls
    // EndPopup internally and returns false. We detect this via p_open.
    bool p_open = true;
    bool visible = ImGui::BeginPopupModal(title, &p_open, flags);
    if (!visible && !p_open) {
        // X was clicked — BeginPopupModal already called EndPopup
        if (user_closed) *user_closed = true;
    }
    return visible;
}

void end_modal() {
    ImGui::EndPopup();
}

// Helpers for deriving color variants
static ImVec4 lighten(const ImVec4& c, float amount) {
    return ImVec4(c.x + (1.0F - c.x) * amount, c.y + (1.0F - c.y) * amount,
                  c.z + (1.0F - c.z) * amount, c.w);
}
static ImVec4 darken(const ImVec4& c, float amount) {
    return ImVec4(c.x * (1.0F - amount), c.y * (1.0F - amount),
                  c.z * (1.0F - amount), c.w);
}
static ImVec4 with_alpha(const ImVec4& c, float a) {
    return ImVec4(c.x, c.y, c.z, a);
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
    ImGuiStyle& style = ImGui::GetStyle();

    auto bg_opt = config.background_color;

    // --- accentColor: interactive elements ---
    if (config.accent_color) {
        ImVec4 c = *config.accent_color;
        ImVec4 hovered = lighten(c, 0.2F);
        ImVec4 active = darken(c, 0.2F);
        ImVec4 dimmed = darken(c, 0.4F);
        ImVec4 frame_bg = with_alpha(darken(c, 0.7F), 0.5F);

        // Direct style assignment for docking chrome
        style.Colors[ImGuiCol_TitleBgActive] = active;
        style.Colors[ImGuiCol_Tab] = active;
        style.Colors[ImGuiCol_TabSelected] = c;
        style.Colors[ImGuiCol_TabSelectedOverline] = c;
        style.Colors[ImGuiCol_TabHovered] = hovered;
        style.Colors[ImGuiCol_TabDimmed] = with_alpha(dimmed, 0.8F);
        style.Colors[ImGuiCol_TabDimmedSelected] = active;
        style.Colors[ImGuiCol_TabDimmedSelectedOverline] = c;
        style.Colors[ImGuiCol_ScrollbarGrab] = c;
        style.Colors[ImGuiCol_ScrollbarGrabHovered] = hovered;
        style.Colors[ImGuiCol_ScrollbarGrabActive] = active;
        style.Colors[ImGuiCol_ResizeGrip] = c;
        style.Colors[ImGuiCol_ResizeGripHovered] = hovered;
        style.Colors[ImGuiCol_ResizeGripActive] = active;
        style.Colors[ImGuiCol_SeparatorHovered] = hovered;
        style.Colors[ImGuiCol_SeparatorActive] = active;
        style.Colors[ImGuiCol_DockingPreview] = c;
        style.Colors[ImGuiCol_FrameBgHovered] = with_alpha(darken(c, 0.6F), 0.7F);
        style.Colors[ImGuiCol_FrameBgActive] = with_alpha(darken(c, 0.5F), 0.8F);

        // Push on style stack for normal widgets
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
        ImGui::PushStyleColor(ImGuiCol_ScrollbarGrab, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ScrollbarGrabHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ScrollbarGrabActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ResizeGrip, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ResizeGripHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ResizeGripActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_SeparatorHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_SeparatorActive, active); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TextSelectedBg, frame_bg); color_count++;
        ImGui::PushStyleColor(ImGuiCol_DragDropTarget, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_DragDropTargetBg, with_alpha(c, 0.1F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_NavCursor, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_InputTextCursor, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_PlotLines, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_PlotLinesHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_PlotHistogram, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_PlotHistogramHovered, hovered); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TextLink, c); color_count++;
        ImGui::PushStyleColor(ImGuiCol_UnsavedMarker, c); color_count++;
    }

    // --- backgroundColor: all background surfaces ---
    if (bg_opt) {
        ImVec4 bg = *bg_opt;
        ImVec4 bg_child = with_alpha(bg, bg.w * 0.9F);
        ImVec4 bg_popup = lighten(bg, 0.05F);
        ImVec4 bg_menubar = lighten(bg, 0.03F);
        ImVec4 scrollbar_bg = darken(bg, 0.1F);

        ImGui::PushStyleColor(ImGuiCol_WindowBg, bg); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ChildBg, bg_child); color_count++;
        ImGui::PushStyleColor(ImGuiCol_PopupBg, bg_popup); color_count++;
        ImGui::PushStyleColor(ImGuiCol_MenuBarBg, bg_menubar); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ScrollbarBg, scrollbar_bg); color_count++;
        ImGui::PushStyleColor(ImGuiCol_DockingEmptyBg, darken(bg, 0.2F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_NavWindowingDimBg, with_alpha(bg, 0.2F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_ModalWindowDimBg, with_alpha(bg, 0.5F)); color_count++;
    }

    // --- textColor: all text variants ---
    if (config.text_color) {
        ImVec4 t = *config.text_color;
        ImVec4 t_disabled = with_alpha(t, t.w * 0.5F);

        ImGui::PushStyleColor(ImGuiCol_Text, t); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TextDisabled, t_disabled); color_count++;
    }

    // --- borderColor: borders, separators, table lines ---
    if (config.border_color) {
        ImVec4 b = *config.border_color;
        ImVec4 b_shadow = with_alpha(b, 0.0F);

        ImGui::PushStyleColor(ImGuiCol_Border, b); color_count++;
        ImGui::PushStyleColor(ImGuiCol_BorderShadow, b_shadow); color_count++;
        ImGui::PushStyleColor(ImGuiCol_Separator, b); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TableBorderStrong, b); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TableBorderLight, with_alpha(b, b.w * 0.6F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TreeLines, with_alpha(b, b.w * 0.5F)); color_count++;
    }

    // --- surfaceColor: title bars, table rows, nav highlights ---
    if (config.surface_color) {
        ImVec4 s = *config.surface_color;
        ImVec4 s_alt = lighten(s, 0.05F);

        ImGui::PushStyleColor(ImGuiCol_TitleBg, darken(s, 0.1F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TitleBgCollapsed, with_alpha(darken(s, 0.2F), 0.5F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TableHeaderBg, lighten(s, 0.1F)); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TableRowBg, s); color_count++;
        ImGui::PushStyleColor(ImGuiCol_TableRowBgAlt, s_alt); color_count++;
        ImGui::PushStyleColor(ImGuiCol_NavWindowingHighlight, with_alpha(lighten(s, 0.3F), 0.7F)); color_count++;
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

struct StyleColorState {
    int count;
};
static std::vector<StyleColorState> g_style_color_stack;

void begin_style_color(const StyleColorOverrides& o) {
    int count = 0;
    if (o.text)             { ImGui::PushStyleColor(ImGuiCol_Text, *o.text); count++; }
    if (o.text_disabled)    { ImGui::PushStyleColor(ImGuiCol_TextDisabled, *o.text_disabled); count++; }
    if (o.window_bg)        { ImGui::PushStyleColor(ImGuiCol_WindowBg, *o.window_bg); count++; }
    if (o.frame_bg)         { ImGui::PushStyleColor(ImGuiCol_FrameBg, *o.frame_bg); count++; }
    if (o.frame_bg_hovered) { ImGui::PushStyleColor(ImGuiCol_FrameBgHovered, *o.frame_bg_hovered); count++; }
    if (o.frame_bg_active)  { ImGui::PushStyleColor(ImGuiCol_FrameBgActive, *o.frame_bg_active); count++; }
    if (o.title_bg)         { ImGui::PushStyleColor(ImGuiCol_TitleBg, *o.title_bg); count++; }
    if (o.title_bg_active)  { ImGui::PushStyleColor(ImGuiCol_TitleBgActive, *o.title_bg_active); count++; }
    if (o.button)           { ImGui::PushStyleColor(ImGuiCol_Button, *o.button); count++; }
    if (o.button_hovered)   { ImGui::PushStyleColor(ImGuiCol_ButtonHovered, *o.button_hovered); count++; }
    if (o.button_active)    { ImGui::PushStyleColor(ImGuiCol_ButtonActive, *o.button_active); count++; }
    if (o.header)           { ImGui::PushStyleColor(ImGuiCol_Header, *o.header); count++; }
    if (o.header_hovered)   { ImGui::PushStyleColor(ImGuiCol_HeaderHovered, *o.header_hovered); count++; }
    if (o.header_active)    { ImGui::PushStyleColor(ImGuiCol_HeaderActive, *o.header_active); count++; }
    if (o.separator)        { ImGui::PushStyleColor(ImGuiCol_Separator, *o.separator); count++; }
    if (o.check_mark)       { ImGui::PushStyleColor(ImGuiCol_CheckMark, *o.check_mark); count++; }
    if (o.slider_grab)      { ImGui::PushStyleColor(ImGuiCol_SliderGrab, *o.slider_grab); count++; }
    if (o.border)           { ImGui::PushStyleColor(ImGuiCol_Border, *o.border); count++; }
    if (o.popup_bg)         { ImGui::PushStyleColor(ImGuiCol_PopupBg, *o.popup_bg); count++; }
    if (o.tab)              { ImGui::PushStyleColor(ImGuiCol_Tab, *o.tab); count++; }
    StyleColorState s;
    s.count = count;
    g_style_color_stack.push_back(s);
}

void end_style_color() {
    if (!g_style_color_stack.empty()) {
        int count = g_style_color_stack.back().count;
        g_style_color_stack.pop_back();
        if (count > 0) ImGui::PopStyleColor(count);
    }
}

struct StyleVarState {
    int count;
};
static std::vector<StyleVarState> g_style_var_stack;

void begin_style_var(const StyleVarOverrides& o) {
    int count = 0;
    if (o.alpha)              { ImGui::PushStyleVar(ImGuiStyleVar_Alpha, *o.alpha); count++; }
    if (o.window_padding)     { ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, *o.window_padding); count++; }
    if (o.window_rounding)    { ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, *o.window_rounding); count++; }
    if (o.frame_padding)      { ImGui::PushStyleVar(ImGuiStyleVar_FramePadding, *o.frame_padding); count++; }
    if (o.frame_rounding)     { ImGui::PushStyleVar(ImGuiStyleVar_FrameRounding, *o.frame_rounding); count++; }
    if (o.frame_border_size)  { ImGui::PushStyleVar(ImGuiStyleVar_FrameBorderSize, *o.frame_border_size); count++; }
    if (o.item_spacing)       { ImGui::PushStyleVar(ImGuiStyleVar_ItemSpacing, *o.item_spacing); count++; }
    if (o.item_inner_spacing) { ImGui::PushStyleVar(ImGuiStyleVar_ItemInnerSpacing, *o.item_inner_spacing); count++; }
    if (o.indent_spacing)     { ImGui::PushStyleVar(ImGuiStyleVar_IndentSpacing, *o.indent_spacing); count++; }
    if (o.cell_padding)       { ImGui::PushStyleVar(ImGuiStyleVar_CellPadding, *o.cell_padding); count++; }
    if (o.tab_rounding)       { ImGui::PushStyleVar(ImGuiStyleVar_TabRounding, *o.tab_rounding); count++; }
    StyleVarState s;
    s.count = count;
    g_style_var_stack.push_back(s);
}

void end_style_var() {
    if (!g_style_var_stack.empty()) {
        int count = g_style_var_stack.back().count;
        g_style_var_stack.pop_back();
        if (count > 0) ImGui::PopStyleVar(count);
    }
}

static std::vector<ImVec2> g_canvas_origin_stack;

void begin_canvas(float width, float height, const Style& style) {
    before_child();
    ImVec2 pos = ImGui::GetCursorScreenPos();
    g_canvas_origin_stack.push_back(pos);
    if (style.background_color) {
        ImGui::GetWindowDrawList()->AddRectFilled(
            pos, ImVec2(pos.x + width, pos.y + height),
            ImGui::ColorConvertFloat4ToU32(*style.background_color));
    }
    ImGui::Dummy(ImVec2(width, height));
}

void end_canvas() {
    if (!g_canvas_origin_stack.empty()) {
        g_canvas_origin_stack.pop_back();
    }
}

ImVec2 canvas_origin() {
    if (!g_canvas_origin_stack.empty()) {
        return g_canvas_origin_stack.back();
    }
    return ImVec2(0, 0);
}

ImVec2 get_main_viewport_pos() {
    return ImGui::GetMainViewport()->Pos;
}

ImVec2 get_main_viewport_size() {
    return ImGui::GetMainViewport()->Size;
}

ImVec2 get_main_viewport_work_pos() {
    return ImGui::GetMainViewport()->WorkPos;
}

ImVec2 get_main_viewport_work_size() {
    return ImGui::GetMainViewport()->WorkSize;
}

void draw_line(float x1, float y1, float x2, float y2, ImVec4 color, float thickness) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddLine(
        ImVec2(o.x + x1, o.y + y1), ImVec2(o.x + x2, o.y + y2),
        ImGui::ColorConvertFloat4ToU32(color), thickness);
}

void draw_rect(float x1, float y1, float x2, float y2, ImVec4 color, bool filled, float thickness, float rounding) {
    ImVec2 o = canvas_origin();
    ImU32 col = ImGui::ColorConvertFloat4ToU32(color);
    if (filled) {
        ImGui::GetWindowDrawList()->AddRectFilled(
            ImVec2(o.x + x1, o.y + y1), ImVec2(o.x + x2, o.y + y2), col, rounding);
    } else {
        ImGui::GetWindowDrawList()->AddRect(
            ImVec2(o.x + x1, o.y + y1), ImVec2(o.x + x2, o.y + y2), col, rounding, 0, thickness);
    }
}

void draw_circle(float cx, float cy, float radius, ImVec4 color, bool filled, float thickness) {
    ImVec2 o = canvas_origin();
    ImU32 col = ImGui::ColorConvertFloat4ToU32(color);
    if (filled) {
        ImGui::GetWindowDrawList()->AddCircleFilled(ImVec2(o.x + cx, o.y + cy), radius, col);
    } else {
        ImGui::GetWindowDrawList()->AddCircle(ImVec2(o.x + cx, o.y + cy), radius, col, 0, thickness);
    }
}

void draw_text(float x, float y, ImVec4 color, const char* text) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddText(ImVec2(o.x + x, o.y + y),
        ImGui::ColorConvertFloat4ToU32(color), text);
}

void draw_bezier_cubic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, float p4x, float p4y, ImVec4 color, float thickness, int segments) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddBezierCubic(
        ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
        ImVec2(o.x + p3x, o.y + p3y), ImVec2(o.x + p4x, o.y + p4y),
        ImGui::ColorConvertFloat4ToU32(color), thickness, segments);
}

void draw_bezier_quadratic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, float thickness, int segments) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddBezierQuadratic(
        ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
        ImVec2(o.x + p3x, o.y + p3y),
        ImGui::ColorConvertFloat4ToU32(color), thickness, segments);
}

void draw_polyline(const float* points, int point_count, ImVec4 color, float thickness, bool closed) {
    ImVec2 o = canvas_origin();
    std::vector<ImVec2> pts(point_count);
    for (int i = 0; i < point_count; ++i) {
        pts[i] = ImVec2(o.x + points[i * 2], o.y + points[i * 2 + 1]);
    }
    ImGui::GetWindowDrawList()->AddPolyline(pts.data(), point_count,
        ImGui::ColorConvertFloat4ToU32(color), closed ? ImDrawFlags_Closed : ImDrawFlags_None, thickness);
}

void draw_convex_poly_filled(const float* points, int point_count, ImVec4 color) {
    ImVec2 o = canvas_origin();
    std::vector<ImVec2> pts(point_count);
    for (int i = 0; i < point_count; ++i) {
        pts[i] = ImVec2(o.x + points[i * 2], o.y + points[i * 2 + 1]);
    }
    ImGui::GetWindowDrawList()->AddConvexPolyFilled(pts.data(), point_count,
        ImGui::ColorConvertFloat4ToU32(color));
}

void draw_ngon(float cx, float cy, float radius, ImVec4 color, int num_segments, float thickness) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddNgon(ImVec2(o.x + cx, o.y + cy), radius,
        ImGui::ColorConvertFloat4ToU32(color), num_segments, thickness);
}

void draw_ngon_filled(float cx, float cy, float radius, ImVec4 color, int num_segments) {
    ImVec2 o = canvas_origin();
    ImGui::GetWindowDrawList()->AddNgonFilled(ImVec2(o.x + cx, o.y + cy), radius,
        ImGui::ColorConvertFloat4ToU32(color), num_segments);
}

void draw_triangle(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, bool filled, float thickness) {
    ImVec2 o = canvas_origin();
    ImU32 col = ImGui::ColorConvertFloat4ToU32(color);
    if (filled) {
        ImGui::GetWindowDrawList()->AddTriangleFilled(
            ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
            ImVec2(o.x + p3x, o.y + p3y), col);
    } else {
        ImGui::GetWindowDrawList()->AddTriangle(
            ImVec2(o.x + p1x, o.y + p1y), ImVec2(o.x + p2x, o.y + p2y),
            ImVec2(o.x + p3x, o.y + p3y), col, thickness);
    }
}

void begin_font(const char* name) {
    before_child();
    auto it = g_font_registry.find(name);
    if (it != g_font_registry.end()) {
        ImGui::PushFont(it->second);
    } else {
        ImGui::PushFont(nullptr);
    }
}

void end_font() {
    ImGui::PopFont();
}

} // namespace imx::renderer
