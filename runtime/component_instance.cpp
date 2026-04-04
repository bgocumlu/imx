#include <reimgui/runtime.h>
#include <cassert>
#include <functional>

namespace reimgui {

ComponentInstance::ComponentInstance(int state_count, int buffer_count)
    : state_slots_(state_count), state_initialized_(state_count, false), buffers_(buffer_count) {}

std::any& ComponentInstance::state_at(int index) {
    assert(index >= 0 && index < static_cast<int>(state_slots_.size()));
    return state_slots_[index];
}
bool ComponentInstance::is_initialized(int index) const {
    assert(index >= 0 && index < static_cast<int>(state_initialized_.size()));
    return state_initialized_[index];
}
void ComponentInstance::mark_initialized(int index) {
    assert(index >= 0 && index < static_cast<int>(state_initialized_.size()));
    state_initialized_[index] = true;
}
TextBuffer& ComponentInstance::buffer_at(int index) {
    assert(index >= 0 && index < static_cast<int>(buffers_.size()));
    return buffers_[index];
}

size_t ComponentInstance::ChildKeyHash::operator()(const ChildKey& k) const {
    size_t h1 = std::hash<std::string>{}(k.type);
    size_t h2 = std::visit([](const auto& v) -> size_t {
        return std::hash<std::remove_cvref_t<decltype(v)>>{}(v);
    }, k.key);
    return h1 ^ (h2 << 1);
}

ComponentInstance* ComponentInstance::find_child(const std::string& type, const InstanceKey& key) {
    ChildKey ck{type, key};
    auto it = children_.find(ck);
    return (it != children_.end()) ? it->second.get() : nullptr;
}

ComponentInstance& ComponentInstance::ensure_child(
    const std::string& type, const InstanceKey& key,
    int state_count, int buffer_count, bool& created) {
    ChildKey ck{type, key};
    auto it = children_.find(ck);
    if (it != children_.end()) {
        created = false;
        visited_[ck] = true;
        return *it->second;
    }
    created = true;
    auto inst = std::make_unique<ComponentInstance>(state_count, buffer_count);
    auto* ptr = inst.get();
    children_[ck] = std::move(inst);
    visited_[ck] = true;
    return *ptr;
}

void ComponentInstance::mark_visited(const std::string& type, const InstanceKey& key) {
    visited_[ChildKey{type, key}] = true;
}

void ComponentInstance::pre_frame() {
    for (auto& [ck, v] : visited_) v = false;
}

int ComponentInstance::sweep_children() {
    int removed = 0;
    for (auto it = visited_.begin(); it != visited_.end(); ) {
        if (!it->second) {
            children_.erase(it->first);
            it = visited_.erase(it);
            ++removed;
        } else {
            ++it;
        }
    }
    return removed;
}

int ComponentInstance::child_count() const { return static_cast<int>(children_.size()); }

} // namespace reimgui
