#pragma once
#include <functional>
#include <vector>

struct SettingsState {
    // Transform
    float speed = 5.0f;
    int count = 3;
    float posX = 0.0f;
    int dragVal = 50;

    // Input
    int level = 1;
    float weight = 9.8f;

    // Selection
    int mode = 0;
    int listChoice = 0;
    int size = 0;

    // Colors
    std::vector<float> color = {1.0f, 0.5f, 0.0f, 1.0f};
    std::vector<float> pickerColor = {0.2f, 0.8f, 0.4f, 1.0f};

    // Toggles
    bool enabled = true;
    bool darkMode = false;

    // Actions
    std::function<void()> onReset;
};
