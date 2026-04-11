#pragma once
#include <string>
#include <functional>

struct AppState {
    bool loading = false;
    std::string result = "";
    std::function<void()> onFetchData;
};
