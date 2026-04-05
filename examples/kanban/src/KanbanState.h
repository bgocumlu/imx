#pragma once
#include <functional>
#include <string>
#include <vector>

struct KanbanCard {
    std::string title;
    int id = 0;
};

struct KanbanColumn {
    std::string name;
    std::vector<KanbanCard> cards;
    std::function<void()> onAdd;
};

struct KanbanState {
    std::vector<KanbanColumn> columns;
    std::function<void()> onClearAll;
};
