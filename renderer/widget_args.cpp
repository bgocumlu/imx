#include <imx/renderer.h>

namespace imx {

WidgetArgs::WidgetArgs(const char* label) : label_(label) {}

const char* WidgetArgs::label() const {
    return label_.c_str();
}

void WidgetArgs::set_callback(const char* name, std::function<void(std::any)> cb) {
    callbacks_[name] = std::move(cb);
}

bool WidgetArgs::has(const char* name) const {
    return values_.find(name) != values_.end();
}

void WidgetArgs::call(const char* name) const {
    auto it = callbacks_.find(name);
    if (it != callbacks_.end()) {
        it->second(std::any{});
    }
}

} // namespace imx
