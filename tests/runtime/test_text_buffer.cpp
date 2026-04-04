#include <catch2/catch_test_macros.hpp>
#include <reimgui/runtime.h>

TEST_CASE("TextBuffer sync_from copies string", "[textbuffer]") {
    reimgui::TextBuffer buf;
    buf.sync_from("hello");
    REQUIRE(buf.value() == "hello");
}

TEST_CASE("TextBuffer sync_from resets modified flag", "[textbuffer]") {
    reimgui::TextBuffer buf;
    buf.sync_from("first");
    buf.mark_modified();
    REQUIRE(buf.modified());
    buf.sync_from("second");
    REQUIRE_FALSE(buf.modified());
    REQUIRE(buf.value() == "second");
}

TEST_CASE("TextBuffer grows for long strings", "[textbuffer]") {
    reimgui::TextBuffer buf;
    std::string long_str(500, 'x');
    buf.sync_from(long_str);
    REQUIRE(buf.value() == long_str);
    REQUIRE(buf.capacity() > 500);
}

TEST_CASE("TextBuffer data provides mutable char*", "[textbuffer]") {
    reimgui::TextBuffer buf;
    buf.sync_from("edit me");
    char* ptr = buf.data();
    ptr[0] = 'E';
    REQUIRE(buf.value() == "Edit me");
}

TEST_CASE("TextBuffer mark_modified tracks changes", "[textbuffer]") {
    reimgui::TextBuffer buf;
    buf.sync_from("original");
    REQUIRE_FALSE(buf.modified());
    buf.mark_modified();
    REQUIRE(buf.modified());
}
