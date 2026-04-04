#include <reimgui/renderer.h>
#include <vector>

namespace reimgui::renderer {

struct LayoutState {
    enum class Direction { Vertical, Horizontal, TableRow };
    Direction direction = Direction::Vertical;
    float gap = 0.0f;
    int child_count = 0;
};

static std::vector<LayoutState> g_layout_stack;

void before_child() {
    if (g_layout_stack.empty()) return;
    auto& ls = g_layout_stack.back();
    if (ls.direction == LayoutState::Direction::TableRow) {
        ImGui::TableNextColumn();
        ls.child_count++;
        return;
    }
    if (ls.child_count > 0) {
        if (ls.direction == LayoutState::Direction::Horizontal) {
            ImGui::SameLine(0.0f, ls.gap);
        } else if (ls.gap > 0.0f) {
            float default_spacing = ImGui::GetStyle().ItemSpacing.y;
            float extra = ls.gap - default_spacing;
            if (extra > 0.0f) {
                ImGui::Dummy(ImVec2(0.0f, extra));
            }
        }
    }
    ls.child_count++;
}

void begin_row(const Style& style) {
    before_child();
    LayoutState ls;
    ls.direction = LayoutState::Direction::Horizontal;
    ls.gap = style.gap.value_or(0.0f);
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
    ImGui::BeginGroup();
}

void end_row() {
    ImGui::EndGroup();
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

void begin_column(const Style& style) {
    before_child();
    LayoutState ls;
    ls.direction = LayoutState::Direction::Vertical;
    ls.gap = style.gap.value_or(0.0f);
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
    ImGui::BeginGroup();
}

void end_column() {
    ImGui::EndGroup();
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

void begin_view(const Style& style) {
    begin_column(style);
}

void end_view() {
    end_column();
}

void begin_table_row() {
    ImGui::TableNextRow();
    LayoutState ls;
    ls.direction = LayoutState::Direction::TableRow;
    ls.gap = 0.0f;
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
}

void end_table_row() {
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

} // namespace reimgui::renderer
