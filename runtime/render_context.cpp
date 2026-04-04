#include <imx/runtime.h>
#include <imgui.h>
#include <cassert>

namespace imx {

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

    // Push ImGui ID scope so widgets inside this instance don't collide
    // with the same widgets in sibling instances of the same component.
    if (ImGui::GetCurrentContext() != nullptr) {
        std::visit([](const auto& k) {
            using T = std::decay_t<decltype(k)>;
            if constexpr (std::is_same_v<T, int>) {
                ImGui::PushID(k);
            } else {
                ImGui::PushID(k.c_str());
            }
        }, key);
    }
}

void RenderContext::end_instance() {
    assert(!stack_.empty());
    if (ImGui::GetCurrentContext() != nullptr) {
        ImGui::PopID();
    }
    auto* inst = stack_.back();
    inst->sweep_children();
    stack_.pop_back();
}

ComponentInstance* RenderContext::current() {
    assert(!stack_.empty());
    return stack_.back();
}

} // namespace imx
