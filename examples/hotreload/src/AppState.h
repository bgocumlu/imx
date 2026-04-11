#pragma once
#include <functional>

struct AppState {
    int count = 0;
    float speed = 5.0F;
    std::function<void()> onIncrement;
};
