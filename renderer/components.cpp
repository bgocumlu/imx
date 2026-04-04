#include <reimgui/renderer.h>
#include <cstdarg>

namespace reimgui::renderer {

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

} // namespace reimgui::renderer
