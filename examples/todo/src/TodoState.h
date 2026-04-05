#pragma once
#include <functional>
#include <string>
#include <vector>

struct TodoItem {
    std::string text;
    bool done = false;
    std::function<void()> onToggle;
    std::function<void()> onRemove;
};

struct TodoState {
    std::vector<TodoItem> items;
    int itemCount = 0;
    int doneCount = 0;
    std::function<void()> onClearCompleted;
};
