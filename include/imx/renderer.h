#pragma once

#include <imgui.h>
#include <imx/runtime.h>
#include <any>
#include <functional>
#include <optional>
#include <string>
#include <unordered_map>

namespace imx {

struct Style {
    std::optional<float> padding;
    std::optional<float> padding_horizontal;
    std::optional<float> padding_vertical;
    std::optional<float> gap;
    std::optional<float> width;
    std::optional<float> height;
    std::optional<float> min_width;
    std::optional<float> min_height;
    std::optional<ImVec4> background_color;
    std::optional<ImVec4> text_color;
    std::optional<float> font_size;
};

struct ThemeConfig {
    std::optional<ImVec4> accent_color;
    std::optional<ImVec4> window_bg;
    std::optional<ImVec4> text_color;
    std::optional<float> rounding;
    std::optional<float> border_size;
    std::optional<float> spacing;
};

class WidgetArgs {
public:
    explicit WidgetArgs(const char* label);

    const char* label() const;

    template <typename T>
    void set(const char* name, const T& value) {
        values_[name] = value;
    }

    void set_callback(const char* name, std::function<void(std::any)> cb);

    template <typename T>
    T get(const char* name) const {
        auto it = values_.find(name);
        if (it == values_.end()) {
            return T{};
        }
        return std::any_cast<T>(it->second);
    }

    template <typename T>
    T get(const char* name, const T& default_value) const {
        auto it = values_.find(name);
        if (it == values_.end()) {
            return default_value;
        }
        return std::any_cast<T>(it->second);
    }

    bool has(const char* name) const;

    void call(const char* name) const;

    template <typename T>
    void call(const char* name, const T& value) const {
        auto it = callbacks_.find(name);
        if (it != callbacks_.end()) {
            it->second(std::any(value));
        }
    }

private:
    std::string label_;
    std::unordered_map<std::string, std::any> values_;
    std::unordered_map<std::string, std::function<void(std::any)>> callbacks_;
};

using WidgetFunc = std::function<void(WidgetArgs&)>;
void register_widget(const std::string& name, WidgetFunc func);
void call_widget(const std::string& name, WidgetArgs& args);

using ThemeFunc = std::function<void()>;
void register_theme(const std::string& name, ThemeFunc func);

namespace renderer {

void before_child();

void begin_window(const char* title, int flags = 0, bool* p_open = nullptr, const Style& style = {});
void end_window();

void begin_view(const Style& style = {});
void end_view();

void begin_row(const Style& style = {});
void end_row();

void begin_column(const Style& style = {});
void end_column();

void text(const char* fmt, ...) IM_FMTARGS(1);

bool button(const char* title, const Style& style = {});

bool text_input(const char* label, TextBuffer& buffer, const Style& style = {});

bool checkbox(const char* label, bool* value, const Style& style = {});

void separator();

bool begin_popup(const char* id, const Style& style = {});
void end_popup();
void open_popup(const char* id);

void begin_dockspace(const Style& style = {});
void end_dockspace();

bool begin_menu_bar();
void end_menu_bar();

bool begin_menu(const char* label);
void end_menu();

bool menu_item(const char* label, const char* shortcut = nullptr);

bool begin_table(const char* id, int column_count, const char** column_names, const Style& style = {});
void end_table();
void begin_table_row();
void end_table_row();
void table_next_column();

bool begin_tab_bar(const Style& style = {});
void end_tab_bar();
bool begin_tab_item(const char* label);
void end_tab_item();

bool begin_tree_node(const char* label);
void end_tree_node();
bool begin_collapsing_header(const char* label);
void end_collapsing_header();

bool slider_float(const char* label, float* value, float min, float max, const Style& style = {});
bool slider_int(const char* label, int* value, int min, int max, const Style& style = {});
bool drag_float(const char* label, float* value, float speed = 1.0f, const Style& style = {});
bool drag_int(const char* label, int* value, float speed = 1.0f, const Style& style = {});
bool combo(const char* label, int* current_item, const char* const items[], int items_count, const Style& style = {});

bool input_int(const char* label, int* value, const Style& style = {});
bool input_float(const char* label, float* value, const Style& style = {});
bool color_edit(const char* label, float color[4], const Style& style = {});
bool list_box(const char* label, int* current_item, const char* const items[], int items_count, const Style& style = {});
void progress_bar(float fraction, const char* overlay = nullptr, const Style& style = {});
void tooltip(const char* text);

void bullet_text(const char* fmt, ...) IM_FMTARGS(1);
void label_text(const char* label, const char* text);
bool selectable(const char* label, bool selected = false, const Style& style = {});
bool radio(const char* label, int* value, int v_button, const Style& style = {});
bool text_input_multiline(const char* label, TextBuffer& buffer, const Style& style = {});
bool color_picker(const char* label, float color[4], const Style& style = {});
void plot_lines(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});
void plot_histogram(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});

bool begin_modal(const char* title, bool open, bool* p_open, const Style& style = {});
void end_modal();

void image(const char* path, float width = 0, float height = 0);
void image_embedded(const char* key, const unsigned char* data, unsigned int size, float width = 0, float height = 0);

void begin_theme(const char* preset, const ThemeConfig& config = {});
void end_theme();

} // namespace renderer
} // namespace imx
