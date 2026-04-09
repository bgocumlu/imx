#pragma once
#include <array>
#include <functional>

struct TransformSettings {
    float speed = 5.0f;
    int count = 3;
    float posX = 0.0f;
    int dragVal = 50;
};

struct InputSettings {
    int level = 1;
    float weight = 9.8f;
};

struct SelectionSettings {
    int mode = 0;
    int listChoice = 0;
    int size = 0;
};

struct AppearanceSettings {
    std::array<float, 4> color = {1.0f, 0.5f, 0.0f, 1.0f};
    std::array<float, 4> pickerColor = {0.2f, 0.8f, 0.4f, 1.0f};
};

struct ToggleSettings {
    bool enabled = true;
    bool darkMode = false;
};

struct SettingsState {
    TransformSettings transform = {};
    InputSettings input = {};
    SelectionSettings selection = {};
    AppearanceSettings appearance = {};
    ToggleSettings toggles = {};

    // Actions
    std::function<void()> onReset;
};
