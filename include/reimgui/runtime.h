// include/reimgui/runtime.h
#pragma once

#include <any>
#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace reimgui {

// State slot — templated accessor for a single piece of component state.
// Created by RenderContext::use_state(). Holds a reference to the underlying
// std::any storage and a pointer to the Runtime dirty flag.
template <typename T>
class StateSlot {
public:
    StateSlot(std::any& storage, bool& dirty)
        : storage_(storage), dirty_(dirty) {}

    T get() const { return std::any_cast<T>(storage_); }

    void set(const T& value) {
        storage_ = value;
        dirty_ = true;
    }

private:
    std::any& storage_;
    bool& dirty_;
};

} // namespace reimgui
