// tests/runtime/test_state.cpp
#include <catch2/catch_test_macros.hpp>
#include <imx/runtime.h>

TEST_CASE("StateSlot get returns initial value", "[state]") {
    bool dirty = false;
    std::any storage = 42;
    imx::StateSlot<int> slot(storage, dirty);

    REQUIRE(slot.get() == 42);
}

TEST_CASE("StateSlot set updates value and marks dirty", "[state]") {
    bool dirty = false;
    std::any storage = 0;
    imx::StateSlot<int> slot(storage, dirty);

    REQUIRE_FALSE(dirty);
    slot.set(7);
    REQUIRE(slot.get() == 7);
    REQUIRE(dirty);
}

TEST_CASE("StateSlot works with std::string", "[state]") {
    bool dirty = false;
    std::any storage = std::string("hello");
    imx::StateSlot<std::string> slot(storage, dirty);

    REQUIRE(slot.get() == "hello");
    slot.set(std::string("world"));
    REQUIRE(slot.get() == "world");
    REQUIRE(dirty);
}

TEST_CASE("StateSlot works with bool", "[state]") {
    bool dirty = false;
    std::any storage = false;
    imx::StateSlot<bool> slot(storage, dirty);

    REQUIRE(slot.get() == false);
    slot.set(true);
    REQUIRE(slot.get() == true);
    REQUIRE(dirty);
}

TEST_CASE("Runtime starts needing frames", "[frame_loop]") {
    imx::Runtime rt;
    REQUIRE(rt.needs_frame());
}

TEST_CASE("Runtime stops needing frames after rendered", "[frame_loop]") {
    imx::Runtime rt;
    // Drain the initial 3 frames
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());
}

TEST_CASE("request_frame makes runtime need a frame", "[frame_loop]") {
    imx::Runtime rt;
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());

    rt.request_frame();
    REQUIRE(rt.needs_frame());

    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());
}

TEST_CASE("dirty flag boosts frames_needed to 3", "[frame_loop]") {
    imx::Runtime rt;
    // Drain initial frames
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());

    rt.mark_dirty();
    // frame_rendered sees dirty, boosts to 3, then decrements to 2
    rt.frame_rendered(false);
    REQUIRE(rt.needs_frame());
    rt.frame_rendered(false);
    REQUIRE(rt.needs_frame());
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());
}

TEST_CASE("imgui_active keeps runtime needing frames", "[frame_loop]") {
    imx::Runtime rt;
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());

    // Simulate active widget — each frame_rendered(true) keeps it alive
    rt.frame_rendered(true);
    REQUIRE(rt.needs_frame());
    rt.frame_rendered(true);
    REQUIRE(rt.needs_frame());

    // Stop being active — one more frame then idle
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.needs_frame());
}

TEST_CASE("dirty flag clears after frame_rendered", "[frame_loop]") {
    imx::Runtime rt;
    rt.mark_dirty();
    REQUIRE(rt.dirty());
    rt.frame_rendered(false);
    REQUIRE_FALSE(rt.dirty());
}
