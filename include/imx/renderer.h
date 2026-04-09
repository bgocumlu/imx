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
    std::optional<ImVec4> background_color;
    std::optional<ImVec4> text_color;
    std::optional<ImVec4> border_color;
    std::optional<ImVec4> surface_color;
    std::optional<float> rounding;
    std::optional<float> border_size;
    std::optional<float> spacing;
};

struct FontOptions {
    bool pixel_snap_h = true;
    int oversample_h = 2;
    int oversample_v = 2;
    float rasterizer_multiply = 1.0f;
    bool merge_mode = false;
};

struct TableColumn {
    const char* label = "";
    ImGuiTableColumnFlags flags = 0;
};

struct TableOptions {
    bool sortable = false;
    bool hideable = false;
    bool multi_sortable = false;
    bool no_clip = false;
    bool pad_outer_x = false;
    bool scroll_x = false;
    bool scroll_y = false;
    bool no_borders = false;
    bool no_row_bg = false;
};

struct StyleColorOverrides {
    std::optional<ImVec4> text;
    std::optional<ImVec4> text_disabled;
    std::optional<ImVec4> window_bg;
    std::optional<ImVec4> frame_bg;
    std::optional<ImVec4> frame_bg_hovered;
    std::optional<ImVec4> frame_bg_active;
    std::optional<ImVec4> title_bg;
    std::optional<ImVec4> title_bg_active;
    std::optional<ImVec4> button;
    std::optional<ImVec4> button_hovered;
    std::optional<ImVec4> button_active;
    std::optional<ImVec4> header;
    std::optional<ImVec4> header_hovered;
    std::optional<ImVec4> header_active;
    std::optional<ImVec4> separator;
    std::optional<ImVec4> check_mark;
    std::optional<ImVec4> slider_grab;
    std::optional<ImVec4> border;
    std::optional<ImVec4> popup_bg;
    std::optional<ImVec4> tab;
};

struct StyleVarOverrides {
    std::optional<float> alpha;
    std::optional<ImVec2> window_padding;
    std::optional<float> window_rounding;
    std::optional<ImVec2> frame_padding;
    std::optional<float> frame_rounding;
    std::optional<float> frame_border_size;
    std::optional<ImVec2> item_spacing;
    std::optional<ImVec2> item_inner_spacing;
    std::optional<float> indent_spacing;
    std::optional<ImVec2> cell_padding;
    std::optional<float> tab_rounding;
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

// Font loading — call before first frame, after ImGui context created
ImFont* load_font(const char* name, const char* path, float size, const FontOptions& options = {});
ImFont* load_font_embedded(const char* name, const unsigned char* data, int data_size, float size, const FontOptions& options = {});
ImFont* find_font(const char* name);
bool set_default_font(const char* name);
std::string clipboard_get();
void clipboard_set(const char* text);

namespace renderer {

void before_child();

void begin_window(const char* title, int flags = 0, bool* p_open = nullptr, bool viewport_always_on_top = false, const Style& style = {});
void end_window();

void begin_view(const Style& style = {});
void end_view();

void begin_indent(float width = 0.0f);
void end_indent(float width = 0.0f);

void begin_text_wrap(float width);
void end_text_wrap();

void begin_row(const Style& style = {});
void end_row();

void begin_column(const Style& style = {});
void end_column();

void text(const char* fmt, ...) IM_FMTARGS(1);

bool button(const char* title, const Style& style = {}, bool disabled = false);

bool small_button(const char* label);
bool arrow_button(const char* id, int direction);
bool invisible_button(const char* id, float width, float height);
bool image_button(const char* id, const char* src, float width, float height);

bool text_input(const char* label, TextBuffer& buffer, const Style& style = {});

bool checkbox(const char* label, bool* value, const Style& style = {});

void separator();
void spacing();
void dummy(float width, float height);
void same_line(float offset = 0.0f, float spacing = -1.0f);
void new_line();
void set_cursor_pos(float x, float y);

bool begin_popup(const char* id, const Style& style = {});
void end_popup();
void open_popup(const char* id);
bool begin_context_menu_item(const char* id = nullptr, int mouse_button = 1);
bool begin_context_menu_window(const char* id = nullptr, int mouse_button = 1);
void end_context_menu();

ImGuiMultiSelectIO* begin_multi_select(int flags, int selection_size, int items_count);
ImGuiMultiSelectIO* end_multi_select();
void set_next_item_selection_data(int index);
void apply_multi_select_requests(ImGuiMultiSelectIO* ms_io, bool* selection, int count);

void begin_dockspace(const Style& style = {}, bool has_menu_bar = false);
void end_dockspace();

bool begin_menu_bar();
void end_menu_bar();

bool begin_main_menu_bar();
void end_main_menu_bar();

bool begin_menu(const char* label);
void end_menu();

bool menu_item(const char* label, const char* shortcut = nullptr);

bool begin_table(const char* id, const TableColumn* columns, int column_count, const Style& style = {}, const TableOptions& options = {});
void end_table();
void begin_table_row(std::optional<ImVec4> bg_color = std::nullopt);
void end_table_row();
void begin_table_cell(int column_index = -1, std::optional<ImVec4> bg_color = std::nullopt);
void end_table_cell();

bool begin_tab_bar(const Style& style = {});
void end_tab_bar();
bool begin_tab_item(const char* label);
void end_tab_item();

bool begin_tree_node(const char* label, ImGuiTreeNodeFlags flags = 0);
void end_tree_node(bool no_tree_push_on_open = false);
bool begin_collapsing_header(const char* label, ImGuiTreeNodeFlags flags = 0, bool* p_visible = nullptr);
void end_collapsing_header();

bool slider_float(const char* label, float* value, float min, float max, const Style& style = {});
bool slider_int(const char* label, int* value, int min, int max, const Style& style = {});
bool vslider_float(const char* label, float width, float height, float* value, float min, float max, const Style& style = {});
bool vslider_int(const char* label, float width, float height, int* value, int min, int max, const Style& style = {});
bool slider_angle(const char* label, float* value, float min = -360.0f, float max = 360.0f, const Style& style = {});
bool drag_float(const char* label, float* value, float speed = 1.0f, const Style& style = {});
bool drag_int(const char* label, int* value, float speed = 1.0f, const Style& style = {});

bool input_float_n(const char* label, float* values, int count, const Style& style = {});
bool input_int_n(const char* label, int* values, int count, const Style& style = {});
bool drag_float_n(const char* label, float* values, int count, float speed = 1.0f, const Style& style = {});
bool drag_int_n(const char* label, int* values, int count, float speed = 1.0f, const Style& style = {});
bool slider_float_n(const char* label, float* values, int count, float min, float max, const Style& style = {});
bool slider_int_n(const char* label, int* values, int count, int min, int max, const Style& style = {});

bool combo(const char* label, int* current_item, const char* const items[], int items_count, const Style& style = {});
bool begin_combo(const char* label, const char* preview, int flags = 0, const Style& style = {});
void end_combo();

bool input_int(const char* label, int* value, const Style& style = {});
bool input_float(const char* label, float* value, const Style& style = {});
bool color_edit(const char* label, float color[4], const Style& style = {});
bool color_edit3(const char* label, float color[3], const Style& style = {});
bool list_box(const char* label, int* current_item, const char* const items[], int items_count, const Style& style = {});
void progress_bar(float fraction, const char* overlay = nullptr, const Style& style = {});
void tooltip(const char* text);
void request_keyboard_focus();
bool item_hovered();
bool item_active();
bool item_focused();
bool item_clicked();
bool item_double_clicked();
void item_scroll_to_here();
void item_cursor(const char* cursor);
bool shortcut_pressed(const char* keys);

void bullet_text(const char* fmt, ...) IM_FMTARGS(1);
void label_text(const char* label, const char* text);
bool selectable(const char* label, bool selected = false, const Style& style = {});
bool radio(const char* label, int* value, int v_button, const Style& style = {});
bool text_input_multiline(const char* label, TextBuffer& buffer, const Style& style = {});
bool color_picker(const char* label, float color[4], const Style& style = {});
bool color_picker3(const char* label, float color[3], const Style& style = {});
void plot_lines(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});
void plot_histogram(const char* label, const float* values, int count, const char* overlay = nullptr, const Style& style = {});

bool begin_modal(const char* title, bool open, bool* p_open, int flags = 0, const Style& style = {});
void end_modal();

void image(const char* path, float width = 0, float height = 0);
void image_embedded(const char* key, const unsigned char* data, unsigned int size, float width = 0, float height = 0);

void begin_theme(const char* preset, const ThemeConfig& config = {});
void end_theme();

void begin_style_color(const StyleColorOverrides& overrides);
void end_style_color();

void begin_style_var(const StyleVarOverrides& overrides);
void end_style_var();

void begin_canvas(float width, float height, const Style& style = {});
void end_canvas();
ImVec2 canvas_origin();

ImVec2 get_main_viewport_pos();
ImVec2 get_main_viewport_size();
ImVec2 get_main_viewport_work_pos();
ImVec2 get_main_viewport_work_size();

void draw_line(float x1, float y1, float x2, float y2, ImVec4 color, float thickness = 1.0f);
void draw_rect(float x1, float y1, float x2, float y2, ImVec4 color, bool filled = false, float thickness = 1.0f, float rounding = 0.0f);
void draw_circle(float cx, float cy, float radius, ImVec4 color, bool filled = false, float thickness = 1.0f);
void draw_text(float x, float y, ImVec4 color, const char* text);

void draw_bezier_cubic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, float p4x, float p4y, ImVec4 color, float thickness = 1.0f, int segments = 0);
void draw_bezier_quadratic(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, float thickness = 1.0f, int segments = 0);
void draw_polyline(const float* points, int point_count, ImVec4 color, float thickness = 1.0f, bool closed = false);
void draw_convex_poly_filled(const float* points, int point_count, ImVec4 color);
void draw_ngon(float cx, float cy, float radius, ImVec4 color, int num_segments, float thickness = 1.0f);
void draw_ngon_filled(float cx, float cy, float radius, ImVec4 color, int num_segments);
void draw_triangle(float p1x, float p1y, float p2x, float p2y, float p3x, float p3y, ImVec4 color, bool filled = false, float thickness = 1.0f);

void begin_font(const char* name);
void end_font();

} // namespace renderer
} // namespace imx
