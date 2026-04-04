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

// Identity key for component instances — either positional (int) or explicit string key.
using InstanceKey = std::variant<int, std::string>;

// A live instance of a component. Owns state slots, text buffers, and child instances.
class ComponentInstance {
public:
    ComponentInstance(int state_count, int buffer_count);
    std::any& state_at(int index);
    bool is_initialized(int index) const;
    void mark_initialized(int index);
    TextBuffer& buffer_at(int index);
    ComponentInstance* find_child(const std::string& type, const InstanceKey& key);
    ComponentInstance& ensure_child(const std::string& type, const InstanceKey& key,
                                    int state_count, int buffer_count, bool& created);
    void pre_frame();
    int sweep_children();
    void mark_visited(const std::string& type, const InstanceKey& key);
    int child_count() const;

private:
    std::vector<std::any> state_slots_;
    std::vector<bool> state_initialized_;
    std::vector<TextBuffer> buffers_;
    struct ChildKey {
        std::string type;
        InstanceKey key;
        bool operator==(const ChildKey& other) const = default;
    };
    struct ChildKeyHash {
        size_t operator()(const ChildKey& k) const;
    };
    std::unordered_map<ChildKey, std::unique_ptr<ComponentInstance>, ChildKeyHash> children_;
    std::unordered_map<ChildKey, bool, ChildKeyHash> visited_;
};

} // namespace reimgui
