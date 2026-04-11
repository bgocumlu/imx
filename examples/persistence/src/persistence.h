#pragma once
#include <fstream>
#include <string>
#include <imx/json.hpp>

namespace imx {

// Save state as formatted JSON. Returns true on success.
// Saves next to the executable by default — change path for platform app data dirs.
template<typename T>
bool save_json(const std::string& path, const T& state) {
    std::ofstream f(path);
    if (!f) return false;
    f << nlohmann::json(state).dump(2);
    return true;
}

// Load state from JSON file. Returns true on success, leaves state unchanged on failure.
template<typename T>
bool load_json(const std::string& path, T& state) {
    std::ifstream f(path);
    if (!f) return false;
    nlohmann::json j = nlohmann::json::parse(f, nullptr, false);
    if (j.is_discarded()) return false;
    nlohmann::from_json(j, state);
    return true;
}

} // namespace imx
