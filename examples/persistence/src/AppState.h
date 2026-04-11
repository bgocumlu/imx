#pragma once
#include <string>
#include <functional>
#include <imx/json.hpp>

struct AppState {
    std::string name = "World";
    float volume = 50.0F;
    bool darkMode = true;
    std::function<void()> onSave;
    std::function<void()> onLoad;
};

// Only serialize data fields — callbacks are not persisted
NLOHMANN_DEFINE_TYPE_NON_INTRUSIVE(AppState, name, volume, darkMode)
