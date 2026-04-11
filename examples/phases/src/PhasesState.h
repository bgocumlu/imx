#pragma once
#include <imgui.h>
#include <imx/renderer.h>
#include <string>
#include <vector>
#include <functional>

// Phase 11: item type for vector iteration demo
struct Phase11Task {
    std::string name;
    float progress = 0.0f;
};

// Phase 11: sub-struct for struct binding demo
struct Phase11Data {
    float speed = 5.0f;
    int count = 3;
    float volume = 50.0f;
    std::vector<Phase11Task> tasks;
    std::function<void()> add_task;
    std::function<void()> reset;
    int total_tasks = 0;
};

struct PhasesState {
    // Phase 11: Struct Binding demo
    Phase11Data phase11;

    // Phase 17: MultiSelect demo
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
