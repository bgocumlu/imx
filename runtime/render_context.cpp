#include <reimgui/runtime.h>
#include <cassert>

namespace reimgui {

RenderContext::RenderContext(Runtime& runtime) : runtime_(runtime) {}

TextBuffer& RenderContext::get_buffer(int index) {
    return current()->buffer_at(index);
}

void RenderContext::begin_instance(const std::string& type, const InstanceKey& key,
                                    int state_count, int buffer_count) {
    auto* parent = current();
    bool created = false;
    auto& child = parent->ensure_child(type, key, state_count, buffer_count, created);
    child.pre_frame();
    stack_.push_back(&child);
}

void RenderContext::end_instance() {
    assert(!stack_.empty());
    auto* inst = stack_.back();
    inst->sweep_children();
    stack_.pop_back();
}

ComponentInstance* RenderContext::current() {
    assert(!stack_.empty());
    return stack_.back();
}

} // namespace reimgui
