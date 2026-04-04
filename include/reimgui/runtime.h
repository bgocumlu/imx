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

// Persistent text buffer for TextInput components.
// Syncs from state each frame, provides mutable char* for ImGui::InputText,
// and reports whether the user modified the buffer.
class TextBuffer {
public:
    TextBuffer() : buf_(256, '\0') {}

    void sync_from(const std::string& value);
    std::string value() const;
    char* data();
    int capacity() const;
    bool modified() const;
    void mark_modified();

private:
    std::vector<char> buf_;
    bool modified_ = false;
};

} // namespace reimgui
