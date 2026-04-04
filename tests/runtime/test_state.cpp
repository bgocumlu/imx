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
