#include <reimgui/renderer.h>

namespace reimgui::renderer {

struct StyleGuard {
    int var_count = 0;
    int color_count = 0;

    void push_padding(const Style& style) {
        if (style.padding) {
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(*style.padding, *style.padding));
            ++var_count;
        } else if (style.padding_horizontal || style.padding_vertical) {
            float px = style.padding_horizontal.value_or(ImGui::GetStyle().WindowPadding.x);
            float py = style.padding_vertical.value_or(ImGui::GetStyle().WindowPadding.y);
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(px, py));
            ++var_count;
        }
    }

    void push_colors(const Style& style) {
        if (style.background_color) {
            ImGui::PushStyleColor(ImGuiCol_ChildBg, *style.background_color);
            ++color_count;
        }
        if (style.text_color) {
            ImGui::PushStyleColor(ImGuiCol_Text, *style.text_color);
            ++color_count;
        }
    }

    void pop() {
        if (var_count > 0) ImGui::PopStyleVar(var_count);
        if (color_count > 0) ImGui::PopStyleColor(color_count);
    }
};

} // namespace reimgui::renderer
