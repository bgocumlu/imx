#pragma once

#include <imgui.h>
#include <reimgui/runtime.h>
#include <optional>

namespace reimgui {

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

namespace renderer {

void before_child();

void begin_window(const char* title, const Style& style = {});
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

} // namespace renderer
} // namespace reimgui
