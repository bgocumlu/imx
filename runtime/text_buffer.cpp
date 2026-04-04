#include <imx/runtime.h>
#include <algorithm>
#include <cstring>

namespace imx {

void TextBuffer::sync_from(const std::string& value) {
    modified_ = false;
    if (static_cast<int>(value.size()) + 1 > capacity()) {
        buf_.resize(value.size() * 2 + 1, '\0');
    }
    std::memcpy(buf_.data(), value.c_str(), value.size() + 1);
}

std::string TextBuffer::value() const { return std::string(buf_.data()); }
char* TextBuffer::data() { return buf_.data(); }
int TextBuffer::capacity() const { return static_cast<int>(buf_.size()); }
bool TextBuffer::modified() const { return modified_; }
void TextBuffer::mark_modified() { modified_ = true; }

} // namespace imx
