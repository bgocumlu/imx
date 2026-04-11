#pragma once
#include <string>
#include <functional>

struct AppState {
    int count = 0;
    float speed = 5.0F;
    std::string watchCmd;
    std::function<void()> onIncrement;
    std::function<void()> onCopyCmd;
};
