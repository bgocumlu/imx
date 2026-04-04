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
ComponentInstance& Runtime::root() { return *root_; }

} // namespace imx
