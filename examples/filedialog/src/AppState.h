#pragma once
#include <string>
#include <functional>

struct AppState {
    std::string filePath = "";
    std::string message = "";
    std::function<void()> onOpen;
    std::function<void()> onSave;
};
