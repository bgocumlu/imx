#include <imx/runtime.h>

namespace imx {

Runtime::Runtime()
    : root_(std::make_unique<ComponentInstance>(0, 0))
    , ctx_(*this) {}

RenderContext& Runtime::begin_frame() {
    root_->pre_frame();
    ctx_.stack_.clear();
    ctx_.stack_.push_back(root_.get());
    return ctx_;
}

void Runtime::end_frame() {
    root_->sweep_children();
    ctx_.stack_.clear();
}

bool Runtime::dirty() const { return dirty_; }
void Runtime::mark_dirty() { dirty_ = true; }
void Runtime::clear_dirty() { dirty_ = false; }

void Runtime::request_frame() {
    if (frames_needed_ < 1) frames_needed_ = 1;
}

bool Runtime::needs_frame() const {
    return frames_needed_ > 0;
}

void Runtime::frame_rendered(bool imgui_active) {
    if (dirty_) {
        if (frames_needed_ < 3) frames_needed_ = 3;
        dirty_ = false;
    }
    if (frames_needed_ > 0) {
        frames_needed_--;
    }
    if (imgui_active) {
        if (frames_needed_ < 1) frames_needed_ = 1;
    }
}

ComponentInstance& Runtime::root() { return *root_; }

} // namespace imx
