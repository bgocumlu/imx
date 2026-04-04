#include <catch2/catch_test_macros.hpp>
#include <reimgui/runtime.h>

TEST_CASE("ComponentInstance state slots initialize correctly", "[instance]") {
    reimgui::ComponentInstance inst(3, 0);
    REQUIRE_FALSE(inst.is_initialized(0));
    REQUIRE_FALSE(inst.is_initialized(1));
    REQUIRE_FALSE(inst.is_initialized(2));
    inst.state_at(0) = 42;
    inst.mark_initialized(0);
    REQUIRE(inst.is_initialized(0));
    REQUIRE(std::any_cast<int>(inst.state_at(0)) == 42);
}

TEST_CASE("ComponentInstance buffer access", "[instance]") {
    reimgui::ComponentInstance inst(0, 2);
    inst.buffer_at(0).sync_from("hello");
    inst.buffer_at(1).sync_from("world");
    REQUIRE(inst.buffer_at(0).value() == "hello");
    REQUIRE(inst.buffer_at(1).value() == "world");
}

TEST_CASE("ComponentInstance child lifecycle", "[instance]") {
    reimgui::ComponentInstance parent(0, 0);
    bool created = false;
    auto& child_a = parent.ensure_child("Button", 0, 0, 0, created);
    REQUIRE(created);
    auto& child_b = parent.ensure_child("Button", 1, 0, 0, created);
    REQUIRE(created);
    REQUIRE(parent.child_count() == 2);
    auto& child_a2 = parent.ensure_child("Button", 0, 0, 0, created);
    REQUIRE_FALSE(created);
    REQUIRE(&child_a == &child_a2);
}

TEST_CASE("ComponentInstance sweep removes unvisited children", "[instance]") {
    reimgui::ComponentInstance parent(0, 0);
    bool created = false;
    parent.ensure_child("A", 0, 0, 0, created);
    parent.ensure_child("B", 0, 0, 0, created);
    parent.ensure_child("C", 0, 0, 0, created);
    REQUIRE(parent.child_count() == 3);
    parent.pre_frame();
    parent.ensure_child("A", 0, 0, 0, created);
    parent.ensure_child("C", 0, 0, 0, created);
    int removed = parent.sweep_children();
    REQUIRE(removed == 1);
    REQUIRE(parent.child_count() == 2);
    REQUIRE(parent.find_child("A", 0) != nullptr);
    REQUIRE(parent.find_child("B", 0) == nullptr);
    REQUIRE(parent.find_child("C", 0) != nullptr);
}

TEST_CASE("ComponentInstance string keys for stable identity", "[instance]") {
    reimgui::ComponentInstance parent(0, 0);
    bool created = false;
    auto& child = parent.ensure_child("TodoItem", std::string("item-1"), 1, 0, created);
    REQUIRE(created);
    child.state_at(0) = true;
    child.mark_initialized(0);
    auto& child2 = parent.ensure_child("TodoItem", std::string("item-1"), 1, 0, created);
    REQUIRE_FALSE(created);
    REQUIRE(std::any_cast<bool>(child2.state_at(0)) == true);
}
