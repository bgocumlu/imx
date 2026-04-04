#include <catch2/catch_test_macros.hpp>
#include <reimgui/runtime.h>

TEST_CASE("Runtime begin/end frame provides context", "[lifecycle]") {
    reimgui::Runtime runtime;
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 1, 0);
    auto count = ctx.use_state<int>(42, 0);
    REQUIRE(count.get() == 42);
    ctx.end_instance();
    runtime.end_frame();
}

TEST_CASE("State persists across frames", "[lifecycle]") {
    reimgui::Runtime runtime;
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 1, 0);
        auto count = ctx.use_state<int>(0, 0);
        count.set(5);
        ctx.end_instance();
        runtime.end_frame();
    }
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 1, 0);
        auto count = ctx.use_state<int>(0, 0);
        REQUIRE(count.get() == 5);
        ctx.end_instance();
        runtime.end_frame();
    }
}

TEST_CASE("Unmount removes unvisited instances", "[lifecycle]") {
    reimgui::Runtime runtime;
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 0, 0);
        ctx.begin_instance("ChildA", 0, 1, 0);
        ctx.use_state<int>(10, 0);
        ctx.end_instance();
        ctx.begin_instance("ChildB", 0, 1, 0);
        ctx.use_state<int>(20, 0);
        ctx.end_instance();
        ctx.end_instance();
        runtime.end_frame();
    }
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 0, 0);
        ctx.begin_instance("ChildA", 0, 1, 0);
        auto val = ctx.use_state<int>(10, 0);
        REQUIRE(val.get() == 10);
        ctx.end_instance();
        ctx.end_instance();
        runtime.end_frame();
    }
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 0, 0);
        ctx.begin_instance("ChildB", 0, 1, 0);
        auto val = ctx.use_state<int>(99, 0);
        REQUIRE(val.get() == 99);
        ctx.end_instance();
        ctx.end_instance();
        runtime.end_frame();
    }
}

TEST_CASE("Key-based identity preserves state across reorder", "[lifecycle]") {
    reimgui::Runtime runtime;
    using Key = std::string;
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 0, 0);
        ctx.begin_instance("Item", Key("a"), 1, 0);
        ctx.use_state<int>(0, 0).set(100);
        ctx.end_instance();
        ctx.begin_instance("Item", Key("b"), 1, 0);
        ctx.use_state<int>(0, 0).set(200);
        ctx.end_instance();
        ctx.end_instance();
        runtime.end_frame();
    }
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 0, 0);
        ctx.begin_instance("Item", Key("b"), 1, 0);
        REQUIRE(ctx.use_state<int>(0, 0).get() == 200);
        ctx.end_instance();
        ctx.begin_instance("Item", Key("a"), 1, 0);
        REQUIRE(ctx.use_state<int>(0, 0).get() == 100);
        ctx.end_instance();
        ctx.end_instance();
        runtime.end_frame();
    }
}

TEST_CASE("Dirty flag tracks state changes", "[lifecycle]") {
    reimgui::Runtime runtime;
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 1, 0);
    REQUIRE(runtime.dirty());
    runtime.clear_dirty();
    REQUIRE_FALSE(runtime.dirty());
    auto count = ctx.use_state<int>(0, 0);
    count.set(1);
    REQUIRE(runtime.dirty());
    ctx.end_instance();
    runtime.end_frame();
}

TEST_CASE("TextBuffer accessible via RenderContext", "[lifecycle]") {
    reimgui::Runtime runtime;
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 0, 1);
    auto& buf = ctx.get_buffer(0);
    buf.sync_from("test");
    REQUIRE(buf.value() == "test");
    ctx.end_instance();
    runtime.end_frame();
}
