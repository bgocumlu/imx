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

// Phase 12: deep propagation target struct (grandchild binds to these)
struct Phase12Inner {
    float brightness = 0.5f;
    int priority = 1;
};

// Phase 12: DragDrop item
struct Phase12DragItem {
    std::string label;
    int id = 0;
};

// Phase 12: sub-struct for struct binding fixes demo
struct Phase12Data {
    std::string username;
    std::string notes;
    Phase12Inner inner;
    std::vector<Phase12DragItem> pool_a;
    std::vector<Phase12DragItem> pool_b;
    std::function<void(int)> move_to_b;
    std::function<void(int)> move_to_a;
};

// Phase 15: sortable table row
struct Phase15Row {
    std::string name;
    std::string score;
    std::string status;
};

// Phase 15: sub-struct for sortable table demo
struct Phase15Data {
    std::vector<Phase15Row> rows;
    std::function<void(int, int)> sort_rows;  // (columnIndex, sortDirection)
};

// Phase 17: MultiSelect sub-struct
struct Phase17Data {
    static constexpr int MS_COUNT = 6;
    bool ms_selected[MS_COUNT] = {};
    int ms_selection_count = 0;
    std::function<void(ImGuiMultiSelectIO*)> apply_selection;
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

    // Phase 12: Struct Binding Fixes demo
    Phase12Data phase12;

    // Phase 15: Table & Tree demo
    Phase15Data phase15;

    // Phase 17: MultiSelect demo
    Phase17Data phase17;
};
