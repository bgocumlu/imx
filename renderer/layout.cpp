#include <imx/renderer.h>
#include <vector>

namespace imx::renderer {

struct LayoutState {
    enum class Direction { Vertical, Horizontal, TableRow };
    Direction direction = Direction::Vertical;
    float gap = 0.0f;
    int child_count = 0;
    bool skip_next_placement = false;
};

static std::vector<LayoutState> g_layout_stack;

void before_child() {
    if (g_layout_stack.empty()) return;
    auto& ls = g_layout_stack.back();
    if (ls.skip_next_placement) {
        ls.skip_next_placement = false;
        ls.child_count++;
        return;
    }
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
                ImGui::SetCursorPosY(ImGui::GetCursorPosY() + extra);
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

void begin_indent(float width) {
    ImGui::Indent(width);
}

void end_indent(float width) {
    ImGui::Unindent(width);
}

void begin_text_wrap(float width) {
    float wrap_pos = width > 0.0f ? ImGui::GetCursorPosX() + width : 0.0f;
    ImGui::PushTextWrapPos(wrap_pos);
}

void end_text_wrap() {
    ImGui::PopTextWrapPos();
}

void spacing() {
    before_child();
    ImGui::Dummy(ImVec2(0.0f, ImGui::GetStyle().ItemSpacing.y));
}

void dummy(float width, float height) {
    before_child();
    ImGui::Dummy(ImVec2(width, height));
}

void same_line(float offset, float spacing_value) {
    ImGui::SameLine(offset, spacing_value);
    if (!g_layout_stack.empty()) {
        g_layout_stack.back().skip_next_placement = true;
    }
}

void new_line() {
    ImGui::NewLine();
    if (!g_layout_stack.empty()) {
        g_layout_stack.back().skip_next_placement = true;
    }
}

void set_cursor_pos(float x, float y) {
    ImGui::SetCursorPos(ImVec2(x, y));
    if (!g_layout_stack.empty()) {
        g_layout_stack.back().skip_next_placement = true;
    }
}

void end_table_row() {
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

void begin_table_row(std::optional<ImVec4> bg_color) {
    ImGui::TableNextRow();
    if (bg_color.has_value()) {
        ImGui::TableSetBgColor(ImGuiTableBgTarget_RowBg0, ImGui::GetColorU32(*bg_color));
    }
    LayoutState ls;
    ls.direction = LayoutState::Direction::TableRow;
    ls.gap = 0.0f;
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
}

void begin_table_cell(int column_index, std::optional<ImVec4> bg_color) {
    if (!g_layout_stack.empty() && g_layout_stack.back().direction == LayoutState::Direction::TableRow) {
        auto& row = g_layout_stack.back();
        if (column_index >= 0) {
            ImGui::TableSetColumnIndex(column_index);
        } else {
            ImGui::TableNextColumn();
        }
        row.child_count++;
    } else if (column_index >= 0) {
        ImGui::TableSetColumnIndex(column_index);
    } else {
        ImGui::TableNextColumn();
    }

    if (bg_color.has_value()) {
        ImGui::TableSetBgColor(ImGuiTableBgTarget_CellBg, ImGui::GetColorU32(*bg_color));
    }

    LayoutState ls;
    ls.direction = LayoutState::Direction::Vertical;
    ls.gap = 0.0f;
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
    ImGui::BeginGroup();
}

void end_table_cell() {
    ImGui::EndGroup();
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

} // namespace imx::renderer
