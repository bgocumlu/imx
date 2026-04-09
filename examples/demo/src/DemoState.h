#pragma once
#include <imgui.h>
#include <imx/renderer.h>

struct DemoState {
    // MultiSelect demo state (AdvancedDemo)
    static constexpr int MS_COUNT = 6;
    bool ms_selected[MS_COUNT] = {};
    int ms_selection_count = 0;

    void apply_selection(ImGuiMultiSelectIO* io) {
        imx::renderer::apply_multi_select_requests(io, ms_selected, MS_COUNT);
        ms_selection_count = 0;
        for (int i = 0; i < MS_COUNT; i++)
            if (ms_selected[i]) ms_selection_count++;
    }
};
