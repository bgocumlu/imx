# IMX MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full IMX MVP — `.tsx` TSX-like source compiles to native C++ Dear ImGui applications via a TypeScript compiler and C++ runtime.

**Architecture:** Four layers: TypeScript compiler (dev-time, parses .tsx, emits .gen.cpp), C++ runtime (state, instances, lifecycle), C++ renderer (host components mapped to ImGui calls), and app shell (existing GLFW/OpenGL loop). The compiler assigns state slot indices and instance identity at compile time. The runtime tracks component instances in a tree with mount/unmount lifecycle. The renderer maps React-Native-like components to ImGui calls with a layout stack for Row/Column spacing.

**Tech Stack:** C++20, Dear ImGui (v1.92.7-docking), GLFW 3.4, OpenGL 3, TypeScript 5, Catch2 v3 (C++ tests), Vitest (TS tests), CMake 3.25+

**Spec:** `docs/superpowers/specs/2026-04-04-imx-mvp-implementation-design.md`

---

## File Structure

### C++ Runtime (`imx_runtime`)
- `include/imx/runtime.h` — public header: StateSlot, TextBuffer, ComponentInstance, RenderContext, Runtime
- `runtime/component_instance.cpp` — ComponentInstance implementation
- `runtime/render_context.cpp` — RenderContext implementation
- `runtime/runtime.cpp` — Runtime frame lifecycle
- `runtime/text_buffer.cpp` — TextBuffer sync logic

### C++ Renderer (`imx_renderer`)
- `include/imx/renderer.h` — public header: Style struct, all host component function declarations
- `renderer/style.cpp` — Style push/pop helpers
- `renderer/layout.cpp` — Layout stack, before_child(), Row/Column/View begin/end
- `renderer/components.cpp` — Window, Text, Button, TextInput, Checkbox, Separator, Popup

### TypeScript Compiler (`imx_codegen`)
- `compiler/package.json` — Node project config
- `compiler/tsconfig.json` — TypeScript config
- `compiler/src/index.ts` — CLI entry point
- `compiler/src/parser.ts` — .tsx -> TS AST
- `compiler/src/ir.ts` — IR type definitions
- `compiler/src/validator.ts` — validate components, props, hooks
- `compiler/src/lowering.ts` — AST -> IR
- `compiler/src/emitter.ts` — IR -> .gen.cpp
- `compiler/src/components.ts` — host component registry (known tags, required props, prop types)

### Tests
- `tests/runtime/test_state.cpp` — StateSlot unit tests
- `tests/runtime/test_instance.cpp` — ComponentInstance unit tests
- `tests/runtime/test_lifecycle.cpp` — Runtime frame lifecycle + unmount tests
- `compiler/tests/parser.test.ts` — parser tests
- `compiler/tests/validator.test.ts` — validator tests
- `compiler/tests/emitter.test.ts` — end-to-end emitter tests

### Example App
- `examples/hello/App.tsx` — example .tsx source
- `examples/hello/main.cpp` — app shell (modified from current main.cpp)

### Build
- `CMakeLists.txt` — updated with all targets + codegen custom command

---

## Phase 2: Runtime Skeleton

### Task 1: Project Scaffolding

**Files:**
- Create: `include/imx/runtime.h`
- Create: `runtime/runtime.cpp`
- Create: `tests/runtime/test_state.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Create directory structure**

Run:
```bash
mkdir -p include/imx runtime renderer tests/runtime examples/hello compiler/src compiler/tests
```

- [ ] **Step 2: Write the runtime.h header with StateSlot only**

```cpp
// include/imx/runtime.h
#pragma once

#include <any>
#include <cstdint>
#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace imx {

// State slot — templated accessor for a single piece of component state.
// Created by RenderContext::use_state(). Holds a reference to the underlying
// std::any storage and a pointer to the Runtime dirty flag.
template <typename T>
class StateSlot {
public:
    StateSlot(std::any& storage, bool& dirty)
        : storage_(storage), dirty_(dirty) {}

    T get() const { return std::any_cast<T>(storage_); }

    void set(const T& value) {
        storage_ = value;
        dirty_ = true;
    }

private:
    std::any& storage_;
    bool& dirty_;
};

} // namespace imx
```

- [ ] **Step 3: Write a minimal runtime.cpp**

```cpp
// runtime/runtime.cpp
#include <imx/runtime.h>

// Non-template implementations are added in Task 4 when Runtime is defined.
// This file exists initially so the imx_runtime library target has a source.
namespace imx {} // namespace imx
```

- [ ] **Step 4: Write the first failing test**

```cpp
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
```

- [ ] **Step 5: Update CMakeLists.txt with runtime target and Catch2**

```cmake
# CMakeLists.txt
cmake_minimum_required(VERSION 3.25)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)
project(imx LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include(FetchContent)

FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG        v1.92.7-docking
)

FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG        3.4
)

FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG        v3.7.1
)

set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
find_package(OpenGL REQUIRED)

FetchContent_MakeAvailable(imgui glfw Catch2)

add_library(imgui_lib STATIC
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_demo.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_glfw.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
)
target_include_directories(imgui_lib PUBLIC
    ${imgui_SOURCE_DIR}
    ${imgui_SOURCE_DIR}/backends
)
target_link_libraries(imgui_lib PUBLIC glfw OpenGL::GL)

# --- imx_runtime ---
add_library(imx_runtime STATIC
    runtime/runtime.cpp
)
target_include_directories(imx_runtime PUBLIC include/)

# --- Tests ---
add_executable(runtime_tests
    tests/runtime/test_state.cpp
)
target_link_libraries(runtime_tests PRIVATE imx_runtime Catch2::Catch2WithMain)

# --- Legacy app (kept until example replaces it) ---
add_executable(app main.cpp)
target_link_libraries(app PRIVATE imgui_lib)
```

- [ ] **Step 6: Build and run tests**

Run:
```bash
cmake -B build -G Ninja && cmake --build build --target runtime_tests && ./build/runtime_tests
```
Expected: 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add include/ runtime/ tests/ CMakeLists.txt
git commit -m "feat: project scaffolding with StateSlot and Catch2 tests"
```

---

### Task 2: TextBuffer

**Files:**
- Modify: `include/imx/runtime.h`
- Create: `runtime/text_buffer.cpp`
- Create: `tests/runtime/test_text_buffer.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Add TextBuffer declaration to runtime.h**

Append before the closing `} // namespace imx`:

```cpp
// Persistent text buffer for TextInput components.
// Syncs from state each frame, provides mutable char* for ImGui::InputText,
// and reports whether the user modified the buffer.
class TextBuffer {
public:
    TextBuffer() : buf_(256, '\0') {}

    // Copy the state value into the buffer at the start of each frame.
    // Resets the modified flag.
    void sync_from(const std::string& value);

    // Returns the current string value of the buffer.
    std::string value() const;

    // Returns a mutable pointer to the internal char array (for ImGui::InputText).
    char* data();

    // Returns the current capacity of the buffer.
    int capacity() const;

    // Returns true if ImGui modified the buffer since the last sync_from().
    bool modified() const;

    // Mark the buffer as modified (called after ImGui::InputText returns true).
    void mark_modified();

private:
    std::vector<char> buf_;
    bool modified_ = false;
};
```

- [ ] **Step 2: Write TextBuffer implementation**

```cpp
// runtime/text_buffer.cpp
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

std::string TextBuffer::value() const {
    return std::string(buf_.data());
}

char* TextBuffer::data() {
    return buf_.data();
}

int TextBuffer::capacity() const {
    return static_cast<int>(buf_.size());
}

bool TextBuffer::modified() const {
    return modified_;
}

void TextBuffer::mark_modified() {
    modified_ = true;
}

} // namespace imx
```

- [ ] **Step 3: Write TextBuffer tests**

```cpp
// tests/runtime/test_text_buffer.cpp
#include <catch2/catch_test_macros.hpp>
#include <imx/runtime.h>

TEST_CASE("TextBuffer sync_from copies string", "[textbuffer]") {
    imx::TextBuffer buf;
    buf.sync_from("hello");
    REQUIRE(buf.value() == "hello");
}

TEST_CASE("TextBuffer sync_from resets modified flag", "[textbuffer]") {
    imx::TextBuffer buf;
    buf.sync_from("first");
    buf.mark_modified();
    REQUIRE(buf.modified());

    buf.sync_from("second");
    REQUIRE_FALSE(buf.modified());
    REQUIRE(buf.value() == "second");
}

TEST_CASE("TextBuffer grows for long strings", "[textbuffer]") {
    imx::TextBuffer buf;
    std::string long_str(500, 'x');
    buf.sync_from(long_str);
    REQUIRE(buf.value() == long_str);
    REQUIRE(buf.capacity() > 500);
}

TEST_CASE("TextBuffer data provides mutable char*", "[textbuffer]") {
    imx::TextBuffer buf;
    buf.sync_from("edit me");
    char* ptr = buf.data();
    ptr[0] = 'E';
    REQUIRE(buf.value() == "Edit me");
}

TEST_CASE("TextBuffer mark_modified tracks changes", "[textbuffer]") {
    imx::TextBuffer buf;
    buf.sync_from("original");
    REQUIRE_FALSE(buf.modified());
    buf.mark_modified();
    REQUIRE(buf.modified());
}
```

- [ ] **Step 4: Update CMakeLists.txt**

Add `runtime/text_buffer.cpp` to imx_runtime sources and `tests/runtime/test_text_buffer.cpp` to runtime_tests:

In the `imx_runtime` target:
```cmake
add_library(imx_runtime STATIC
    runtime/runtime.cpp
    runtime/text_buffer.cpp
)
```

In the `runtime_tests` target:
```cmake
add_executable(runtime_tests
    tests/runtime/test_state.cpp
    tests/runtime/test_text_buffer.cpp
)
```

- [ ] **Step 5: Build and run tests**

Run:
```bash
cmake --build build --target runtime_tests && ./build/runtime_tests
```
Expected: 9 tests pass (4 state + 5 text buffer).

- [ ] **Step 6: Commit**

```bash
git add runtime/text_buffer.cpp tests/runtime/test_text_buffer.cpp include/imx/runtime.h CMakeLists.txt
git commit -m "feat: add TextBuffer for persistent TextInput storage"
```

---

### Task 3: ComponentInstance

**Files:**
- Modify: `include/imx/runtime.h`
- Create: `runtime/component_instance.cpp`
- Create: `tests/runtime/test_instance.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Add ComponentInstance declaration to runtime.h**

Append before the closing `} // namespace imx`:

```cpp
// Identity key for component instances — either positional (int) or explicit string key.
using InstanceKey = std::variant<int, std::string>;

// A live instance of a component. Owns state slots, text buffers, and child instances.
// Children are tracked by (type_name, key) and support mount/unmount lifecycle.
class ComponentInstance {
public:
    ComponentInstance(int state_count, int buffer_count);

    // --- State ---
    std::any& state_at(int index);
    bool is_initialized(int index) const;
    void mark_initialized(int index);

    // --- Buffers ---
    TextBuffer& buffer_at(int index);

    // --- Children ---
    // Find an existing child by type and key. Returns nullptr if not found.
    ComponentInstance* find_child(const std::string& type, const InstanceKey& key);
    // Find or create a child. Returns the child and sets created=true if new.
    ComponentInstance& ensure_child(const std::string& type, const InstanceKey& key,
                                    int state_count, int buffer_count, bool& created);
    // Mark all children as unvisited. Call at start of frame.
    void pre_frame();
    // Remove children not visited since last pre_frame(). Returns count removed.
    int sweep_children();
    // Mark a child as visited.
    void mark_visited(const std::string& type, const InstanceKey& key);

    int child_count() const;

private:
    std::vector<std::any> state_slots_;
    std::vector<bool> state_initialized_;
    std::vector<TextBuffer> buffers_;

    struct ChildKey {
        std::string type;
        InstanceKey key;
        bool operator==(const ChildKey& other) const = default;
    };
    struct ChildKeyHash {
        size_t operator()(const ChildKey& k) const;
    };
    std::unordered_map<ChildKey, std::unique_ptr<ComponentInstance>, ChildKeyHash> children_;
    std::unordered_map<ChildKey, bool, ChildKeyHash> visited_;
};
```

- [ ] **Step 2: Write ComponentInstance implementation**

```cpp
// runtime/component_instance.cpp
#include <imx/runtime.h>
#include <cassert>
#include <functional>

namespace imx {

ComponentInstance::ComponentInstance(int state_count, int buffer_count)
    : state_slots_(state_count)
    , state_initialized_(state_count, false)
    , buffers_(buffer_count) {}

std::any& ComponentInstance::state_at(int index) {
    assert(index >= 0 && index < static_cast<int>(state_slots_.size()));
    return state_slots_[index];
}

bool ComponentInstance::is_initialized(int index) const {
    assert(index >= 0 && index < static_cast<int>(state_initialized_.size()));
    return state_initialized_[index];
}

void ComponentInstance::mark_initialized(int index) {
    assert(index >= 0 && index < static_cast<int>(state_initialized_.size()));
    state_initialized_[index] = true;
}

TextBuffer& ComponentInstance::buffer_at(int index) {
    assert(index >= 0 && index < static_cast<int>(buffers_.size()));
    return buffers_[index];
}

size_t ComponentInstance::ChildKeyHash::operator()(const ChildKey& k) const {
    size_t h1 = std::hash<std::string>{}(k.type);
    size_t h2 = std::visit([](const auto& v) -> size_t {
        return std::hash<std::remove_cvref_t<decltype(v)>>{}(v);
    }, k.key);
    return h1 ^ (h2 << 1);
}

ComponentInstance* ComponentInstance::find_child(const std::string& type, const InstanceKey& key) {
    ChildKey ck{type, key};
    auto it = children_.find(ck);
    if (it != children_.end()) {
        return it->second.get();
    }
    return nullptr;
}

ComponentInstance& ComponentInstance::ensure_child(
    const std::string& type, const InstanceKey& key,
    int state_count, int buffer_count, bool& created)
{
    ChildKey ck{type, key};
    auto it = children_.find(ck);
    if (it != children_.end()) {
        created = false;
        visited_[ck] = true;
        return *it->second;
    }
    created = true;
    auto inst = std::make_unique<ComponentInstance>(state_count, buffer_count);
    auto* ptr = inst.get();
    children_[ck] = std::move(inst);
    visited_[ck] = true;
    return *ptr;
}

void ComponentInstance::mark_visited(const std::string& type, const InstanceKey& key) {
    ChildKey ck{type, key};
    visited_[ck] = true;
}

void ComponentInstance::pre_frame() {
    for (auto& [ck, v] : visited_) {
        v = false;
    }
}

int ComponentInstance::sweep_children() {
    int removed = 0;
    for (auto it = visited_.begin(); it != visited_.end(); ) {
        if (!it->second) {
            children_.erase(it->first);
            it = visited_.erase(it);
            ++removed;
        } else {
            ++it;
        }
    }
    return removed;
}

int ComponentInstance::child_count() const {
    return static_cast<int>(children_.size());
}

} // namespace imx
```

- [ ] **Step 3: Write ComponentInstance tests**

```cpp
// tests/runtime/test_instance.cpp
#include <catch2/catch_test_macros.hpp>
#include <imx/runtime.h>

TEST_CASE("ComponentInstance state slots initialize correctly", "[instance]") {
    imx::ComponentInstance inst(3, 0);

    REQUIRE_FALSE(inst.is_initialized(0));
    REQUIRE_FALSE(inst.is_initialized(1));
    REQUIRE_FALSE(inst.is_initialized(2));

    inst.state_at(0) = 42;
    inst.mark_initialized(0);
    REQUIRE(inst.is_initialized(0));
    REQUIRE(std::any_cast<int>(inst.state_at(0)) == 42);
}

TEST_CASE("ComponentInstance buffer access", "[instance]") {
    imx::ComponentInstance inst(0, 2);
    inst.buffer_at(0).sync_from("hello");
    inst.buffer_at(1).sync_from("world");
    REQUIRE(inst.buffer_at(0).value() == "hello");
    REQUIRE(inst.buffer_at(1).value() == "world");
}

TEST_CASE("ComponentInstance child lifecycle", "[instance]") {
    imx::ComponentInstance parent(0, 0);

    // Create two children
    bool created = false;
    auto& child_a = parent.ensure_child("Button", 0, 0, 0, created);
    REQUIRE(created);
    auto& child_b = parent.ensure_child("Button", 1, 0, 0, created);
    REQUIRE(created);
    REQUIRE(parent.child_count() == 2);

    // Re-access existing child
    auto& child_a2 = parent.ensure_child("Button", 0, 0, 0, created);
    REQUIRE_FALSE(created);
    REQUIRE(&child_a == &child_a2);
}

TEST_CASE("ComponentInstance sweep removes unvisited children", "[instance]") {
    imx::ComponentInstance parent(0, 0);
    bool created = false;

    parent.ensure_child("A", 0, 0, 0, created);
    parent.ensure_child("B", 0, 0, 0, created);
    parent.ensure_child("C", 0, 0, 0, created);
    REQUIRE(parent.child_count() == 3);

    // Simulate next frame: only visit A and C
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
    imx::ComponentInstance parent(0, 0);
    bool created = false;

    auto& child = parent.ensure_child("TodoItem", std::string("item-1"), 1, 0, created);
    REQUIRE(created);
    child.state_at(0) = true;
    child.mark_initialized(0);

    // Access with same key returns same instance with preserved state
    auto& child2 = parent.ensure_child("TodoItem", std::string("item-1"), 1, 0, created);
    REQUIRE_FALSE(created);
    REQUIRE(std::any_cast<bool>(child2.state_at(0)) == true);
}
```

- [ ] **Step 4: Update CMakeLists.txt**

Add `runtime/component_instance.cpp` to imx_runtime and `tests/runtime/test_instance.cpp` to runtime_tests:

```cmake
add_library(imx_runtime STATIC
    runtime/runtime.cpp
    runtime/text_buffer.cpp
    runtime/component_instance.cpp
)
```

```cmake
add_executable(runtime_tests
    tests/runtime/test_state.cpp
    tests/runtime/test_text_buffer.cpp
    tests/runtime/test_instance.cpp
)
```

- [ ] **Step 5: Build and run tests**

Run:
```bash
cmake --build build --target runtime_tests && ./build/runtime_tests
```
Expected: 14 tests pass.

- [ ] **Step 6: Commit**

```bash
git add runtime/component_instance.cpp tests/runtime/test_instance.cpp include/imx/runtime.h CMakeLists.txt
git commit -m "feat: add ComponentInstance with state slots, buffers, and child lifecycle"
```

---

### Task 4: RenderContext and Runtime

**Files:**
- Modify: `include/imx/runtime.h`
- Create: `runtime/render_context.cpp`
- Modify: `runtime/runtime.cpp`
- Create: `tests/runtime/test_lifecycle.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Add RenderContext and Runtime declarations to runtime.h**

Append before the closing `} // namespace imx`:

```cpp
class Runtime; // forward declaration

// Render context — passed to every generated render function.
// Manages an instance stack that mirrors the component tree during rendering.
class RenderContext {
public:
    explicit RenderContext(Runtime& runtime);

    // Access a state slot on the current instance. Initializes with `initial`
    // on first call (mount). slot_index is assigned by the compiler.
    template <typename T>
    StateSlot<T> use_state(const T& initial, int slot_index);

    // Access a persistent text buffer on the current instance.
    TextBuffer& get_buffer(int index);

    // Push a child component instance onto the stack. Creates the instance on mount.
    void begin_instance(const std::string& type, const InstanceKey& key,
                        int state_count, int buffer_count);
    // Pop the current instance from the stack.
    void end_instance();

    // Returns the current (topmost) ComponentInstance.
    ComponentInstance* current();

private:
    Runtime& runtime_;
    std::vector<ComponentInstance*> stack_;
};

// Top-level runtime orchestrator.
// Owns the root ComponentInstance and manages the frame lifecycle.
class Runtime {
public:
    Runtime();

    // Begin a new frame. Returns the RenderContext for generated code to use.
    // Marks all children as unvisited for unmount detection.
    RenderContext& begin_frame();

    // End the frame. Sweeps unvisited children (unmount).
    void end_frame();

    // Returns true if any state was modified since the last frame.
    bool dirty() const;
    void mark_dirty();
    void clear_dirty();

    ComponentInstance& root();

private:
    friend class RenderContext;
    std::unique_ptr<ComponentInstance> root_;
    RenderContext ctx_;
    bool dirty_ = true;
};

// --- Template implementations (must be in header) ---

template <typename T>
StateSlot<T> RenderContext::use_state(const T& initial, int slot_index) {
    auto* inst = current();
    if (!inst->is_initialized(slot_index)) {
        inst->state_at(slot_index) = initial;
        inst->mark_initialized(slot_index);
    }
    return StateSlot<T>(inst->state_at(slot_index), runtime_.dirty_);
}
```

- [ ] **Step 2: Make dirty_ accessible to StateSlot via friend**

The Runtime class has `bool dirty_` which StateSlot needs to write. The `RenderContext::use_state` template passes `runtime_.dirty_` to the StateSlot constructor. Since `RenderContext` is already a friend of `Runtime`, this compiles. However, `dirty_` needs to be accessible. Add `friend class RenderContext;` to Runtime (already in the declaration above) and ensure `dirty_` is the member used.

No code change needed — the declaration above already handles this.

- [ ] **Step 3: Write RenderContext implementation**

```cpp
// runtime/render_context.cpp
#include <imx/runtime.h>
#include <cassert>

namespace imx {

RenderContext::RenderContext(Runtime& runtime)
    : runtime_(runtime) {}

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
}

void RenderContext::end_instance() {
    assert(!stack_.empty());
    auto* inst = stack_.back();
    inst->sweep_children();
    stack_.pop_back();
}

ComponentInstance* RenderContext::current() {
    assert(!stack_.empty());
    return stack_.back();
}

} // namespace imx
```

- [ ] **Step 4: Write Runtime implementation**

```cpp
// runtime/runtime.cpp
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

bool Runtime::dirty() const {
    return dirty_;
}

void Runtime::mark_dirty() {
    dirty_ = true;
}

void Runtime::clear_dirty() {
    dirty_ = false;
}

ComponentInstance& Runtime::root() {
    return *root_;
}

} // namespace imx
```

- [ ] **Step 5: Write lifecycle tests**

```cpp
// tests/runtime/test_lifecycle.cpp
#include <catch2/catch_test_macros.hpp>
#include <imx/runtime.h>

TEST_CASE("Runtime begin/end frame provides context", "[lifecycle]") {
    imx::Runtime runtime;
    auto& ctx = runtime.begin_frame();

    ctx.begin_instance("App", 0, 1, 0);
    auto count = ctx.use_state<int>(42, 0);
    REQUIRE(count.get() == 42);
    ctx.end_instance();

    runtime.end_frame();
}

TEST_CASE("State persists across frames", "[lifecycle]") {
    imx::Runtime runtime;

    // Frame 1: initialize state
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 1, 0);
        auto count = ctx.use_state<int>(0, 0);
        count.set(5);
        ctx.end_instance();
        runtime.end_frame();
    }

    // Frame 2: state persists
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
    imx::Runtime runtime;

    // Frame 1: render two children
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

    // Frame 2: only render ChildA — ChildB should be unmounted
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

    // Frame 3: ChildB re-created gets fresh state
    {
        auto& ctx = runtime.begin_frame();
        ctx.begin_instance("App", 0, 0, 0);
        ctx.begin_instance("ChildB", 0, 1, 0);
        auto val = ctx.use_state<int>(99, 0);
        REQUIRE(val.get() == 99); // fresh, not 20
        ctx.end_instance();
        ctx.end_instance();
        runtime.end_frame();
    }
}

TEST_CASE("Key-based identity preserves state across reorder", "[lifecycle]") {
    imx::Runtime runtime;
    using Key = std::string;

    // Frame 1: items A, B
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

    // Frame 2: items B, A (reordered) — state follows keys
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
    imx::Runtime runtime;

    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 1, 0);

    REQUIRE(runtime.dirty()); // dirty initially
    runtime.clear_dirty();
    REQUIRE_FALSE(runtime.dirty());

    auto count = ctx.use_state<int>(0, 0);
    count.set(1);
    REQUIRE(runtime.dirty());

    ctx.end_instance();
    runtime.end_frame();
}

TEST_CASE("TextBuffer accessible via RenderContext", "[lifecycle]") {
    imx::Runtime runtime;

    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 0, 1);

    auto& buf = ctx.get_buffer(0);
    buf.sync_from("test");
    REQUIRE(buf.value() == "test");

    ctx.end_instance();
    runtime.end_frame();
}
```

- [ ] **Step 6: Update CMakeLists.txt**

```cmake
add_library(imx_runtime STATIC
    runtime/runtime.cpp
    runtime/text_buffer.cpp
    runtime/component_instance.cpp
    runtime/render_context.cpp
)
```

```cmake
add_executable(runtime_tests
    tests/runtime/test_state.cpp
    tests/runtime/test_text_buffer.cpp
    tests/runtime/test_instance.cpp
    tests/runtime/test_lifecycle.cpp
)
```

- [ ] **Step 7: Build and run tests**

Run:
```bash
cmake --build build --target runtime_tests && ./build/runtime_tests
```
Expected: 20 tests pass.

- [ ] **Step 8: Commit**

```bash
git add runtime/render_context.cpp runtime/runtime.cpp tests/runtime/test_lifecycle.cpp include/imx/runtime.h CMakeLists.txt
git commit -m "feat: add RenderContext and Runtime with frame lifecycle and unmount detection"
```

---

## Phase 3: Host Components

### Task 5: Style Struct and Renderer Foundation

**Files:**
- Create: `include/imx/renderer.h`
- Create: `renderer/style.cpp`
- Create: `renderer/layout.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Write renderer.h**

```cpp
// include/imx/renderer.h
#pragma once

#include <imgui.h>
#include <imx/runtime.h>
#include <optional>

namespace imx {

// Style properties for host components.
// All fields are optional — unset means "use ImGui default."
struct Style {
    std::optional<float> padding;
    std::optional<float> padding_horizontal;
    std::optional<float> padding_vertical;
    std::optional<float> gap;
    std::optional<float> width;
    std::optional<float> height;
    std::optional<float> min_width;
    std::optional<float> min_height;
    std::optional<ImVec4> background_color;
    std::optional<ImVec4> text_color;
    std::optional<float> font_size;
};

namespace renderer {

// --- Layout stack (internal) ---
// Components call before_child() at the start of rendering to handle
// Row spacing (SameLine) and Column gap.
void before_child();

// --- Layout containers ---
void begin_window(const char* title, const Style& style = {});
void end_window();

void begin_view(const Style& style = {});
void end_view();

void begin_row(const Style& style = {});
void end_row();

void begin_column(const Style& style = {});
void end_column();

// --- Simple components ---
void text(const char* fmt, ...) IM_FMTARGS(1);

bool button(const char* title, const Style& style = {});

bool text_input(const char* label, TextBuffer& buffer, const Style& style = {});

bool checkbox(const char* label, bool* value, const Style& style = {});

void separator();

// --- Popup ---
bool begin_popup(const char* id, const Style& style = {});
void end_popup();
void open_popup(const char* id);

} // namespace renderer
} // namespace imx
```

- [ ] **Step 2: Write style.cpp with push/pop helpers**

```cpp
// renderer/style.cpp
#include <imx/renderer.h>

namespace imx::renderer {

// Track how many style vars/colors were pushed so we can pop them.
struct StyleGuard {
    int var_count = 0;
    int color_count = 0;

    void push_padding(const Style& style) {
        if (style.padding) {
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(*style.padding, *style.padding));
            ++var_count;
        } else if (style.padding_horizontal || style.padding_vertical) {
            float px = style.padding_horizontal.value_or(ImGui::GetStyle().WindowPadding.x);
            float py = style.padding_vertical.value_or(ImGui::GetStyle().WindowPadding.y);
            ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(px, py));
            ++var_count;
        }
    }

    void push_colors(const Style& style) {
        if (style.background_color) {
            ImGui::PushStyleColor(ImGuiCol_ChildBg, *style.background_color);
            ++color_count;
        }
        if (style.text_color) {
            ImGui::PushStyleColor(ImGuiCol_Text, *style.text_color);
            ++color_count;
        }
    }

    void pop() {
        if (var_count > 0) ImGui::PopStyleVar(var_count);
        if (color_count > 0) ImGui::PopStyleColor(color_count);
    }
};

} // namespace imx::renderer
```

- [ ] **Step 3: Write layout.cpp with layout stack**

```cpp
// renderer/layout.cpp
#include <imx/renderer.h>
#include <vector>

namespace imx::renderer {

struct LayoutState {
    enum class Direction { Vertical, Horizontal };
    Direction direction = Direction::Vertical;
    float gap = 0.0f;
    int child_count = 0;
};

static std::vector<LayoutState> g_layout_stack;

void before_child() {
    if (g_layout_stack.empty()) return;
    auto& ls = g_layout_stack.back();
    if (ls.child_count > 0) {
        if (ls.direction == LayoutState::Direction::Horizontal) {
            ImGui::SameLine(0.0f, ls.gap);
        } else if (ls.gap > 0.0f) {
            // For vertical layout, add extra spacing beyond ImGui's default ItemSpacing.y
            float default_spacing = ImGui::GetStyle().ItemSpacing.y;
            float extra = ls.gap - default_spacing;
            if (extra > 0.0f) {
                ImGui::Dummy(ImVec2(0.0f, extra));
            }
        }
    }
    ls.child_count++;
}

static int g_layout_id_counter = 0;

void begin_row(const Style& style) {
    before_child(); // a Row is itself a child of its parent layout
    LayoutState ls;
    ls.direction = LayoutState::Direction::Horizontal;
    ls.gap = style.gap.value_or(0.0f);
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
    ImGui::BeginGroup();
}

void end_row() {
    ImGui::EndGroup();
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

void begin_column(const Style& style) {
    before_child();
    LayoutState ls;
    ls.direction = LayoutState::Direction::Vertical;
    ls.gap = style.gap.value_or(0.0f);
    ls.child_count = 0;
    g_layout_stack.push_back(ls);
    ImGui::BeginGroup();
}

void end_column() {
    ImGui::EndGroup();
    if (!g_layout_stack.empty()) g_layout_stack.pop_back();
}

void begin_view(const Style& style) {
    // View behaves like Column (vertical default)
    begin_column(style);
}

void end_view() {
    end_column();
}

} // namespace imx::renderer
```

- [ ] **Step 4: Update CMakeLists.txt with renderer target**

```cmake
# --- imx_renderer ---
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
)
target_include_directories(imx_renderer PUBLIC include/)
target_link_libraries(imx_renderer PUBLIC imx_runtime imgui_lib)
```

- [ ] **Step 5: Build to verify compilation**

Run:
```bash
cmake --build build --target imx_renderer
```
Expected: compiles with no errors.

- [ ] **Step 6: Commit**

```bash
git add include/imx/renderer.h renderer/style.cpp renderer/layout.cpp CMakeLists.txt
git commit -m "feat: add renderer foundation with Style struct and layout stack"
```

---

### Task 6: Simple Components (Window, Text, Button, Separator)

**Files:**
- Create: `renderer/components.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Write components.cpp**

```cpp
// renderer/components.cpp
#include <imx/renderer.h>
#include <cstdarg>

namespace imx::renderer {

// --- Window ---

void begin_window(const char* title, const Style& style) {
    before_child();
    ImGui::Begin(title);
    // Apply font scale if specified
    if (style.font_size) {
        float scale = *style.font_size / ImGui::GetFontSize();
        ImGui::SetWindowFontScale(scale);
    }
}

void end_window() {
    ImGui::End();
}

// --- Text ---

void text(const char* fmt, ...) {
    before_child();
    va_list args;
    va_start(args, fmt);
    ImGui::TextV(fmt, args);
    va_end(args);
}

// --- Button ---

bool button(const char* title, const Style& style) {
    before_child();
    ImVec2 size(0, 0);
    if (style.width) size.x = *style.width;
    if (style.height) size.y = *style.height;
    return ImGui::Button(title, size);
}

// --- Separator ---

void separator() {
    before_child();
    ImGui::Separator();
}

// --- TextInput ---

bool text_input(const char* label, TextBuffer& buffer, const Style& style) {
    before_child();
    float width = style.width.value_or(0.0f);
    if (width > 0.0f) ImGui::SetNextItemWidth(width);
    bool changed = ImGui::InputText(label, buffer.data(), buffer.capacity());
    if (changed) buffer.mark_modified();
    return changed;
}

// --- Checkbox ---

bool checkbox(const char* label, bool* value, const Style& style) {
    before_child();
    return ImGui::Checkbox(label, value);
}

// --- Popup ---

bool begin_popup(const char* id, const Style& style) {
    // Don't call before_child() here — popups don't participate in layout
    return ImGui::BeginPopup(id);
}

void end_popup() {
    ImGui::EndPopup();
}

void open_popup(const char* id) {
    ImGui::OpenPopup(id);
}

} // namespace imx::renderer
```

- [ ] **Step 2: Update CMakeLists.txt**

```cmake
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
)
```

- [ ] **Step 3: Build to verify compilation**

Run:
```bash
cmake --build build --target imx_renderer
```
Expected: compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add renderer/components.cpp CMakeLists.txt
git commit -m "feat: add host components — Window, Text, Button, TextInput, Checkbox, Separator, Popup"
```

---

### Task 7: Hand-Written Integration Test App

This validates the entire C++ stack (runtime + renderer) works end-to-end without the compiler. It replaces the hardcoded ImGui calls in the existing `main.cpp` with runtime-driven rendering.

**Files:**
- Create: `examples/hello/main.cpp`
- Create: `examples/hello/hand_written_app.cpp`
- Create: `examples/hello/hand_written_app.h`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Write the hand-written app render function**

This is what the compiler would generate — written by hand to prove the runtime works.

```cpp
// examples/hello/hand_written_app.h
#pragma once
#include <imx/runtime.h>

void hand_written_app_render(imx::RenderContext& ctx);

void hand_written_render_root(imx::Runtime& runtime);
```

```cpp
// examples/hello/hand_written_app.cpp
#include "hand_written_app.h"
#include <imx/renderer.h>

// This is what the compiler would generate from:
//
//   function App() {
//     const [name, setName] = useState("Berkay");
//     const [enabled, setEnabled] = useState(true);
//     const [count, setCount] = useState(0);
//
//     return (
//       <Window title="Hello">
//         <Column gap={8}>
//           <Text>Hello {name}</Text>
//           <TextInput value={name} onChange={setName} />
//           <Checkbox label="Enabled" value={enabled} onChange={setEnabled} />
//           <Row gap={8}>
//             <Button title="Increment" onPress={() => setCount(count + 1)} />
//             <Text>Count: {count}</Text>
//           </Row>
//           {enabled && <Text>Status: active</Text>}
//         </Column>
//       </Window>
//     );
//   }

void hand_written_app_render(imx::RenderContext& ctx) {
    auto name = ctx.use_state<std::string>("Berkay", 0);
    auto enabled = ctx.use_state<bool>(true, 1);
    auto count = ctx.use_state<int>(0, 2);

    imx::renderer::begin_window("Hello");
    imx::renderer::begin_column({.gap = 8});

    imx::renderer::text("Hello %s", name.get().c_str());

    auto& name_buf = ctx.get_buffer(0);
    name_buf.sync_from(name.get());
    if (imx::renderer::text_input("##name", name_buf)) {
        name.set(name_buf.value());
    }

    {
        bool enabled_val = enabled.get();
        if (imx::renderer::checkbox("Enabled", &enabled_val)) {
            enabled.set(enabled_val);
        }
    }

    imx::renderer::begin_row({.gap = 8});
    if (imx::renderer::button("Increment")) {
        count.set(count.get() + 1);
    }
    imx::renderer::text("Count: %d", count.get());
    imx::renderer::end_row();

    if (enabled.get()) {
        imx::renderer::text("Status: active");
    }

    imx::renderer::end_column();
    imx::renderer::end_window();
}

void hand_written_render_root(imx::Runtime& runtime) {
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 3, 1); // 3 state slots, 1 text buffer
    hand_written_app_render(ctx);
    ctx.end_instance();
    runtime.end_frame();
}
```

- [ ] **Step 2: Write the example app shell**

Copy from the existing `main.cpp` and replace the hardcoded UI:

```cpp
// examples/hello/main.cpp
#include "hand_written_app.h"
#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

struct App {
    GLFWwindow* window = nullptr;
    ImGuiIO*    io     = nullptr;
    imx::Runtime runtime;
};

static void draw_dockspace() {
    ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(viewport->WorkPos);
    ImGui::SetNextWindowSize(viewport->WorkSize);
    ImGui::SetNextWindowViewport(viewport->ID);

    ImGuiWindowFlags host_flags = ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoTitleBar |
                                  ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize |
                                  ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus |
                                  ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoBackground;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0F, 0.0F));
    ImGui::Begin("DockSpaceHost", nullptr, host_flags);
    ImGui::PopStyleVar(3);
    ImGui::DockSpace(ImGui::GetID("MainDockSpace"), ImVec2(0.0F, 0.0F), ImGuiDockNodeFlags_None);
    ImGui::End();
}

static void render_frame(App& app) {
    glfwMakeContextCurrent(app.window);
    if (glfwGetWindowAttrib(app.window, GLFW_ICONIFIED) != 0) return;

    int fb_w = 0, fb_h = 0;
    glfwGetFramebufferSize(app.window, &fb_w, &fb_h);
    if (fb_w <= 0 || fb_h <= 0) return;

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    draw_dockspace();

    // --- IMX runtime-driven rendering replaces hardcoded UI ---
    hand_written_render_root(app.runtime);

    ImGui::Render();
    glViewport(0, 0, fb_w, fb_h);
    glClearColor(0.12F, 0.12F, 0.15F, 1.0F);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    if ((app.io->ConfigFlags & ImGuiConfigFlags_ViewportsEnable) != 0) {
        ImGui::UpdatePlatformWindows();
        ImGui::RenderPlatformWindowsDefault();
    }

    glfwMakeContextCurrent(app.window);
    glfwSwapBuffers(app.window);
}

static void window_size_callback(GLFWwindow* window, int, int) {
    auto* app = static_cast<App*>(glfwGetWindowUserPointer(window));
    if (app) render_frame(*app);
}

int main() {
    if (glfwInit() == 0) return 1;

    const char* glsl_version = "#version 150";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(600, 400, "imx - hand-written test", nullptr, nullptr);
    if (!window) { glfwTerminate(); return 1; }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;

    ImGui::StyleColorsDark();
    ImGuiStyle& style = ImGui::GetStyle();
    if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable) {
        style.WindowRounding = 0.0F;
        style.Colors[ImGuiCol_WindowBg].w = 1.0F;
    }

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    App app;
    app.window = window;
    app.io = &io;
    glfwSetWindowUserPointer(window, &app);
    glfwSetWindowSizeCallback(window, window_size_callback);

    while (glfwWindowShouldClose(window) == 0) {
        glfwPollEvents();
        render_frame(app);
    }

    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
```

- [ ] **Step 3: Update CMakeLists.txt with example target**

```cmake
# --- Hand-written example app (Phase 3 validation) ---
add_executable(hello_hand
    examples/hello/main.cpp
    examples/hello/hand_written_app.cpp
)
target_link_libraries(hello_hand PRIVATE imx_renderer)
```

- [ ] **Step 4: Build and run the hand-written example**

Run:
```bash
cmake --build build --target hello_hand && ./build/hello_hand
```
Expected: a window titled "imx - hand-written test" opens with:
- "Hello Berkay" text
- A text input field (editable, updates the greeting)
- An "Enabled" checkbox
- An "Increment" button next to "Count: 0" on the same row
- "Status: active" text that disappears when checkbox is unchecked

Verify manually that:
1. Typing in the text input updates the "Hello ..." text
2. Clicking "Increment" increases the count
3. Unchecking "Enabled" hides "Status: active"

- [ ] **Step 5: Commit**

```bash
git add examples/ CMakeLists.txt
git commit -m "feat: hand-written integration test validating runtime + renderer end-to-end"
```

---

## Phase 4: TSX Frontend (Compiler)

### Task 8: Compiler Project Scaffolding

**Files:**
- Create: `compiler/package.json`
- Create: `compiler/tsconfig.json`
- Create: `compiler/src/index.ts`
- Create: `compiler/src/components.ts`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "imx-compiler",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "typescript": "^5.8.0"
  },
  "devDependencies": {
    "vitest": "^3.1.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "declaration": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write the host component registry**

```typescript
// compiler/src/components.ts

// Prop type as understood by the compiler for codegen purposes.
export type PropType = 'string' | 'number' | 'boolean' | 'callback' | 'style';

export interface PropDef {
    type: PropType;
    required: boolean;
}

export interface HostComponentDef {
    props: Record<string, PropDef>;
    hasChildren: boolean;
    // Components that need begin/end pairs
    isContainer: boolean;
}

export const HOST_COMPONENTS: Record<string, HostComponentDef> = {
    Window: {
        props: {
            title: { type: 'string', required: true },
        },
        hasChildren: true,
        isContainer: true,
    },
    View: {
        props: {
            style: { type: 'style', required: false },
        },
        hasChildren: true,
        isContainer: true,
    },
    Row: {
        props: {
            gap: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true,
        isContainer: true,
    },
    Column: {
        props: {
            gap: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true,
        isContainer: true,
    },
    Text: {
        props: {
            style: { type: 'style', required: false },
        },
        hasChildren: true, // children are text content
        isContainer: false,
    },
    Button: {
        props: {
            title: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
            disabled: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false,
        isContainer: false,
    },
    TextInput: {
        props: {
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: true },
            label: { type: 'string', required: false },
            placeholder: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false,
        isContainer: false,
    },
    Checkbox: {
        props: {
            value: { type: 'boolean', required: true },
            onChange: { type: 'callback', required: true },
            label: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false,
        isContainer: false,
    },
    Separator: {
        props: {},
        hasChildren: false,
        isContainer: false,
    },
    Popup: {
        props: {
            id: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: true,
        isContainer: true,
    },
};

export function isHostComponent(name: string): boolean {
    return name in HOST_COMPONENTS;
}
```

- [ ] **Step 4: Write minimal CLI entry point**

```typescript
// compiler/src/index.ts
import { parseArgs } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        output: { type: 'string', short: 'o' },
    },
});

if (positionals.length === 0) {
    console.error('Usage: imx-compiler <input.tsx ...> -o <output-dir>');
    process.exit(1);
}

const outputDir = values.output ?? '.';
const inputFiles = positionals;

for (const file of inputFiles) {
    if (!fs.existsSync(file)) {
        console.error(`Error: file not found: ${file}`);
        process.exit(1);
    }
}

console.log(`imx-compiler: ${inputFiles.length} file(s) -> ${outputDir}/`);
// Pipeline stages will be wired here in later tasks.
```

- [ ] **Step 5: Install dependencies and build**

Run:
```bash
cd compiler && npm install && npm run build
```
Expected: compiles to `compiler/dist/`, no errors.

- [ ] **Step 6: Test CLI**

Run:
```bash
node compiler/dist/index.js --help 2>&1 || true
node compiler/dist/index.js nonexistent.tsx 2>&1; echo "exit: $?"
```
Expected: error message for nonexistent file, exit code 1.

- [ ] **Step 7: Add compiler/ to .gitignore**

Append to `.gitignore`:
```
compiler/node_modules/
compiler/dist/
```

- [ ] **Step 8: Commit**

```bash
git add compiler/package.json compiler/tsconfig.json compiler/src/ .gitignore
git commit -m "feat: compiler project scaffolding with host component registry"
```

---

### Task 9: Parser

**Files:**
- Create: `compiler/src/parser.ts`
- Create: `compiler/tests/parser.test.ts`

- [ ] **Step 1: Write parser.ts**

```typescript
// compiler/src/parser.ts
import ts from 'typescript';
import * as path from 'node:path';

export interface ParsedFile {
    sourceFile: ts.SourceFile;
    filePath: string;
    // The top-level function declaration (the component)
    component: ts.FunctionDeclaration | null;
    errors: ParseError[];
}

export interface ParseError {
    file: string;
    line: number;
    col: number;
    message: string;
}

function formatError(sourceFile: ts.SourceFile, node: ts.Node, message: string): ParseError {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return {
        file: sourceFile.fileName,
        line: line + 1,
        col: character + 1,
        message,
    };
}

/**
 * Parse an .tsx file as TSX and extract the component function declaration.
 * Returns a ParsedFile with the TS SourceFile AST and the component function.
 */
export function parseIgxFile(filePath: string, source: string): ParsedFile {
    const fileName = path.basename(filePath);
    const sourceFile = ts.createSourceFile(
        fileName,
        source,
        ts.ScriptTarget.Latest,
        /* setParentNodes */ true,
        ts.ScriptKind.TSX,
    );

    const errors: ParseError[] = [];

    // Check for syntax errors
    // ts.createSourceFile doesn't report diagnostics directly,
    // but we can check for any syntax issues by trying to parse.
    // For now, we look for the function declaration.

    let component: ts.FunctionDeclaration | null = null;

    for (const stmt of sourceFile.statements) {
        if (ts.isFunctionDeclaration(stmt) && stmt.name) {
            if (component !== null) {
                errors.push(formatError(sourceFile, stmt,
                    'Only one component function per .tsx file is supported'));
            } else {
                component = stmt;
            }
        } else if (ts.isImportDeclaration(stmt)) {
            // Imports are allowed — handled during validation
        } else {
            errors.push(formatError(sourceFile, stmt,
                `Unsupported top-level statement: ${ts.SyntaxKind[stmt.kind]}`));
        }
    }

    if (!component && errors.length === 0) {
        errors.push({
            file: fileName,
            line: 1,
            col: 1,
            message: 'No component function found in file',
        });
    }

    return { sourceFile, filePath, component, errors };
}

/**
 * Extract import specifiers from the parsed file.
 * Returns a map: imported name -> module specifier (relative path).
 */
export function extractImports(sourceFile: ts.SourceFile): Map<string, string> {
    const imports = new Map<string, string>();
    for (const stmt of sourceFile.statements) {
        if (ts.isImportDeclaration(stmt) && stmt.importClause) {
            const moduleSpecifier = (stmt.moduleSpecifier as ts.StringLiteral).text;
            const bindings = stmt.importClause.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) {
                for (const spec of bindings.elements) {
                    imports.set(spec.name.text, moduleSpecifier);
                }
            }
        }
    }
    return imports;
}
```

- [ ] **Step 2: Write parser tests**

```typescript
// compiler/tests/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseIgxFile, extractImports } from '../src/parser.js';

describe('parseIgxFile', () => {
    it('parses a simple component', () => {
        const source = `
function App() {
  return <Window title="Hello"><Text>Hi</Text></Window>;
}`;
        const result = parseIgxFile('App.tsx', source);
        expect(result.errors).toHaveLength(0);
        expect(result.component).not.toBeNull();
        expect(result.component!.name!.text).toBe('App');
    });

    it('parses component with props parameter', () => {
        const source = `
function Greeting(props: { name: string }) {
  return <Text>Hello {props.name}</Text>;
}`;
        const result = parseIgxFile('Greeting.tsx', source);
        expect(result.errors).toHaveLength(0);
        expect(result.component!.name!.text).toBe('Greeting');
    });

    it('errors on no function declaration', () => {
        const source = `const x = 42;`;
        const result = parseIgxFile('Bad.tsx', source);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Unsupported top-level statement');
    });

    it('errors on multiple function declarations', () => {
        const source = `
function A() { return <Text>A</Text>; }
function B() { return <Text>B</Text>; }`;
        const result = parseIgxFile('Multi.tsx', source);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('Only one component');
    });

    it('allows import declarations', () => {
        const source = `
import { TodoItem } from './TodoItem';
function App() { return <TodoItem />; }`;
        const result = parseIgxFile('App.tsx', source);
        expect(result.errors).toHaveLength(0);
    });
});

describe('extractImports', () => {
    it('extracts named imports', () => {
        const source = `
import { TodoItem } from './TodoItem';
import { Header, Footer } from './Layout';
function App() { return <Text>Hi</Text>; }`;
        const result = parseIgxFile('App.tsx', source);
        const imports = extractImports(result.sourceFile);
        expect(imports.get('TodoItem')).toBe('./TodoItem');
        expect(imports.get('Header')).toBe('./Layout');
        expect(imports.get('Footer')).toBe('./Layout');
    });
});
```

- [ ] **Step 3: Create vitest config**

```typescript
// compiler/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
    },
});
```

- [ ] **Step 4: Run tests**

Run:
```bash
cd compiler && npx vitest run
```
Expected: all parser tests pass.

- [ ] **Step 5: Commit**

```bash
git add compiler/src/parser.ts compiler/tests/parser.test.ts compiler/vitest.config.ts
git commit -m "feat: .tsx parser using TypeScript compiler API"
```

---

### Task 10: IR Types and Validator

**Files:**
- Create: `compiler/src/ir.ts`
- Create: `compiler/src/validator.ts`
- Create: `compiler/tests/validator.test.ts`

- [ ] **Step 1: Write IR type definitions**

```typescript
// compiler/src/ir.ts

/** The intermediate representation produced by lowering and consumed by the emitter. */

export type IRType = 'int' | 'float' | 'bool' | 'string';

/** A C++ expression string with its inferred type. */
export interface IRExpr {
    code: string;   // C++ expression text
    type: IRType;
}

/** Top-level component definition. */
export interface IRComponent {
    name: string;
    stateSlots: IRStateSlot[];
    bufferCount: number;
    params: IRPropParam[];     // empty for root components
    body: IRNode[];
}

export interface IRStateSlot {
    name: string;       // variable name (e.g., "count")
    setter: string;     // setter name (e.g., "setCount")
    type: IRType;
    initialValue: string;  // C++ expression for initial value
    index: number;
}

export interface IRPropParam {
    name: string;
    type: IRType | 'callback';
}

/** IR nodes represent render operations. */
export type IRNode =
    | IRBeginContainer
    | IREndContainer
    | IRText
    | IRButton
    | IRTextInput
    | IRCheckbox
    | IRSeparator
    | IRBeginPopup
    | IREndPopup
    | IROpenPopup
    | IRConditional
    | IRListMap
    | IRCustomComponent;

export interface IRBeginContainer {
    kind: 'begin_container';
    tag: 'Window' | 'View' | 'Row' | 'Column';
    props: Record<string, string>;  // prop name -> C++ expression
    style?: string;                  // C++ Style initializer
}

export interface IREndContainer {
    kind: 'end_container';
    tag: 'Window' | 'View' | 'Row' | 'Column';
}

export interface IRText {
    kind: 'text';
    format: string;     // printf format string
    args: string[];     // C++ expressions for format args
}

export interface IRButton {
    kind: 'button';
    title: string;       // C++ expression
    action: string[];    // C++ statements to execute on click
    style?: string;
}

export interface IRTextInput {
    kind: 'text_input';
    label: string;
    bufferIndex: number;
    stateVar: string;    // name of the state variable to sync
    style?: string;
}

export interface IRCheckbox {
    kind: 'checkbox';
    label: string;
    stateVar: string;
    style?: string;
}

export interface IRSeparator {
    kind: 'separator';
}

export interface IRBeginPopup {
    kind: 'begin_popup';
    id: string;
    style?: string;
}

export interface IREndPopup {
    kind: 'end_popup';
}

export interface IROpenPopup {
    kind: 'open_popup';
    id: string;
}

export interface IRConditional {
    kind: 'conditional';
    condition: string;   // C++ expression
    body: IRNode[];
    elseBody?: IRNode[];
}

export interface IRListMap {
    kind: 'list_map';
    array: string;        // C++ expression for the array
    itemVar: string;      // loop variable name
    key: string;          // C++ expression for the key
    componentName: string;
    stateCount: number;
    bufferCount: number;
    body: IRNode[];
}

export interface IRCustomComponent {
    kind: 'custom_component';
    name: string;
    props: Record<string, string>;  // prop name -> C++ expression
    key?: string;                    // C++ expression for instance key
    stateCount: number;
    bufferCount: number;
}
```

- [ ] **Step 2: Write validator**

```typescript
// compiler/src/validator.ts
import ts from 'typescript';
import { HOST_COMPONENTS, isHostComponent } from './components.js';
import type { ParsedFile, ParseError } from './parser.js';
import { extractImports } from './parser.js';

export interface ValidationResult {
    errors: ParseError[];
    // Maps of discovered custom components (imported names -> module paths)
    customComponents: Map<string, string>;
    // useState calls found in the component
    useStateCalls: UseStateInfo[];
}

export interface UseStateInfo {
    name: string;       // variable name
    setter: string;     // setter name
    initializer: ts.Expression;  // AST node for the initial value
    index: number;      // assigned slot index
}

function err(sf: ts.SourceFile, node: ts.Node, msg: string): ParseError {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
    return { file: sf.fileName, line: line + 1, col: character + 1, message: msg };
}

export function validate(parsed: ParsedFile): ValidationResult {
    const errors: ParseError[] = [];
    const sf = parsed.sourceFile;
    const func = parsed.component;
    const customComponents = extractImports(sf);
    const useStateCalls: UseStateInfo[] = [];

    if (!func || !func.body) {
        return { errors, customComponents, useStateCalls };
    }

    // Find useState calls in the function body (must be at top level of function)
    let slotIndex = 0;
    for (const stmt of func.body.statements) {
        if (ts.isVariableStatement(stmt)) {
            for (const decl of stmt.declarationList.declarations) {
                if (isUseStateCall(decl)) {
                    const info = extractUseState(decl, slotIndex, sf, errors);
                    if (info) {
                        useStateCalls.push(info);
                        slotIndex++;
                    }
                }
            }
        }
    }

    // Validate JSX elements in the return statement
    const returnStmt = func.body.statements.find(ts.isReturnStatement);
    if (returnStmt && returnStmt.expression) {
        validateExpression(returnStmt.expression, sf, customComponents, errors);
    }

    return { errors, customComponents, useStateCalls };
}

function isUseStateCall(decl: ts.VariableDeclaration): boolean {
    if (!decl.initializer || !ts.isCallExpression(decl.initializer)) return false;
    const callee = decl.initializer.expression;
    return ts.isIdentifier(callee) && callee.text === 'useState';
}

function extractUseState(
    decl: ts.VariableDeclaration,
    index: number,
    sf: ts.SourceFile,
    errors: ParseError[],
): UseStateInfo | null {
    const call = decl.initializer as ts.CallExpression;

    if (!ts.isArrayBindingPattern(decl.name)) {
        errors.push(err(sf, decl, 'useState must use array destructuring: const [x, setX] = useState(...)'));
        return null;
    }

    const elements = decl.name.elements;
    if (elements.length !== 2) {
        errors.push(err(sf, decl, 'useState destructuring must have exactly 2 elements: [value, setter]'));
        return null;
    }

    const nameEl = elements[0];
    const setterEl = elements[1];

    if (!ts.isBindingElement(nameEl) || !ts.isIdentifier(nameEl.name)) {
        errors.push(err(sf, nameEl, 'First useState element must be an identifier'));
        return null;
    }
    if (!ts.isBindingElement(setterEl) || !ts.isIdentifier(setterEl.name)) {
        errors.push(err(sf, setterEl, 'Second useState element must be an identifier'));
        return null;
    }

    if (call.arguments.length !== 1) {
        errors.push(err(sf, call, 'useState requires exactly 1 argument (initial value)'));
        return null;
    }

    return {
        name: nameEl.name.text,
        setter: setterEl.name.text,
        initializer: call.arguments[0],
        index,
    };
}

function validateExpression(
    node: ts.Node,
    sf: ts.SourceFile,
    customComponents: Map<string, string>,
    errors: ParseError[],
): void {
    if (ts.isJsxElement(node)) {
        validateJsxElement(node, sf, customComponents, errors);
    } else if (ts.isJsxSelfClosingElement(node)) {
        validateJsxTag(node.tagName, node, sf, customComponents, errors);
        validateJsxAttributes(node.attributes, node.tagName, sf, errors);
    } else if (ts.isJsxFragment(node)) {
        for (const child of node.children) {
            validateExpression(child, sf, customComponents, errors);
        }
    } else if (ts.isParenthesizedExpression(node)) {
        validateExpression(node.expression, sf, customComponents, errors);
    } else if (ts.isConditionalExpression(node)) {
        validateExpression(node.whenTrue, sf, customComponents, errors);
        validateExpression(node.whenFalse, sf, customComponents, errors);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        validateExpression(node.right, sf, customComponents, errors);
    } else if (ts.isJsxExpression(node) && node.expression) {
        validateExpression(node.expression, sf, customComponents, errors);
    } else if (ts.isCallExpression(node)) {
        // e.g., items.map(...) — validate the callback body
        if (ts.isPropertyAccessExpression(node.expression) &&
            node.expression.name.text === 'map') {
            const callback = node.arguments[0];
            if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
                if (callback.body && ts.isBlock(callback.body)) {
                    const ret = callback.body.statements.find(ts.isReturnStatement);
                    if (ret?.expression) validateExpression(ret.expression, sf, customComponents, errors);
                } else if (callback.body) {
                    validateExpression(callback.body as ts.Expression, sf, customComponents, errors);
                }
            }
        }
    }
    // Other expression types (literals, identifiers) are allowed.
}

function validateJsxElement(
    node: ts.JsxElement,
    sf: ts.SourceFile,
    customComponents: Map<string, string>,
    errors: ParseError[],
): void {
    validateJsxTag(node.openingElement.tagName, node, sf, customComponents, errors);
    validateJsxAttributes(node.openingElement.attributes, node.openingElement.tagName, sf, errors);
    for (const child of node.children) {
        validateExpression(child, sf, customComponents, errors);
    }
}

function validateJsxTag(
    tagName: ts.JsxTagNameExpression,
    node: ts.Node,
    sf: ts.SourceFile,
    customComponents: Map<string, string>,
    errors: ParseError[],
): void {
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;
    if (!isHostComponent(name) && !customComponents.has(name)) {
        errors.push(err(sf, node, `Unknown component: <${name}>. Not a host component or imported custom component.`));
    }
}

function validateJsxAttributes(
    attrs: ts.JsxAttributes,
    tagName: ts.JsxTagNameExpression,
    sf: ts.SourceFile,
    errors: ParseError[],
): void {
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;
    const def = HOST_COMPONENTS[name];
    if (!def) return; // custom component — skip prop validation for now

    // Check required props are present
    const presentProps = new Set<string>();
    for (const attr of attrs.properties) {
        if (ts.isJsxAttribute(attr) && attr.name) {
            presentProps.add(attr.name.text);
        }
    }

    for (const [propName, propDef] of Object.entries(def.props)) {
        if (propDef.required && !presentProps.has(propName)) {
            errors.push(err(sf, attrs, `<${name}> requires prop '${propName}'`));
        }
    }
}
```

- [ ] **Step 3: Write validator tests**

```typescript
// compiler/tests/validator.test.ts
import { describe, it, expect } from 'vitest';
import { parseIgxFile } from '../src/parser.js';
import { validate } from '../src/validator.js';

describe('validate', () => {
    it('validates a correct simple component', () => {
        const source = `
function App() {
  const [count, setCount] = useState(0);
  return <Window title="Hello"><Text>Hi</Text></Window>;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.useStateCalls).toHaveLength(1);
        expect(result.useStateCalls[0].name).toBe('count');
        expect(result.useStateCalls[0].setter).toBe('setCount');
        expect(result.useStateCalls[0].index).toBe(0);
    });

    it('errors on unknown component', () => {
        const source = `
function App() {
  return <Slider value={0} />;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].message).toContain('Unknown component');
        expect(result.errors[0].message).toContain('Slider');
    });

    it('errors on missing required prop', () => {
        const source = `
function App() {
  return <Button />;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.message.includes("requires prop 'title'"))).toBe(true);
    });

    it('assigns sequential slot indices to useState calls', () => {
        const source = `
function App() {
  const [a, setA] = useState(0);
  const [b, setB] = useState("hello");
  const [c, setC] = useState(true);
  return <Text>Hi</Text>;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.useStateCalls[0]).toMatchObject({ name: 'a', index: 0 });
        expect(result.useStateCalls[1]).toMatchObject({ name: 'b', index: 1 });
        expect(result.useStateCalls[2]).toMatchObject({ name: 'c', index: 2 });
    });

    it('accepts imported custom components', () => {
        const source = `
import { TodoItem } from './TodoItem';
function App() {
  return <TodoItem />;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
        expect(result.customComponents.get('TodoItem')).toBe('./TodoItem');
    });

    it('validates conditional rendering', () => {
        const source = `
function App() {
  const [show, setShow] = useState(true);
  return <Window title="Test">{show && <Text>Visible</Text>}</Window>;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const result = validate(parsed);
        expect(result.errors).toHaveLength(0);
    });
});
```

- [ ] **Step 4: Run tests**

Run:
```bash
cd compiler && npx vitest run
```
Expected: all parser and validator tests pass.

- [ ] **Step 5: Commit**

```bash
git add compiler/src/ir.ts compiler/src/validator.ts compiler/tests/validator.test.ts
git commit -m "feat: IR types and validator for .tsx components, props, and useState"
```

---

## Phase 5: C++ Codegen

### Task 11: Lowering (AST to IR)

**Files:**
- Create: `compiler/src/lowering.ts`
- Create: `compiler/tests/lowering.test.ts`

- [ ] **Step 1: Write lowering.ts**

```typescript
// compiler/src/lowering.ts
import ts from 'typescript';
import type { ParsedFile } from './parser.js';
import type { ValidationResult, UseStateInfo } from './validator.js';
import type { IRComponent, IRNode, IRStateSlot, IRPropParam, IRType } from './ir.js';
import { isHostComponent } from './components.js';

export function lowerComponent(parsed: ParsedFile, validation: ValidationResult): IRComponent {
    const func = parsed.component!;
    const name = func.name!.text;

    const stateSlots: IRStateSlot[] = validation.useStateCalls.map(s => ({
        name: s.name,
        setter: s.setter,
        type: inferTypeFromInitializer(s.initializer),
        initialValue: exprToCpp(s.initializer, validation.useStateCalls, []),
        index: s.index,
    }));

    // Count TextInput components to determine buffer count
    const bufferCount = countTextInputs(func);

    // Extract props parameter
    const params = extractPropParams(func);

    // Lower the return statement body
    const returnStmt = func.body!.statements.find(ts.isReturnStatement)!;
    const body = lowerExpression(returnStmt.expression!, validation.useStateCalls, params, { bufferIndex: 0 });

    return { name, stateSlots, bufferCount, params, body };
}

interface LowerCtx {
    bufferIndex: number;
}

function lowerExpression(
    node: ts.Node,
    states: UseStateInfo[],
    props: IRPropParam[],
    ctx: LowerCtx,
): IRNode[] {
    if (ts.isParenthesizedExpression(node)) {
        return lowerExpression(node.expression, states, props, ctx);
    }
    if (ts.isJsxElement(node)) {
        return lowerJsxElement(node, states, props, ctx);
    }
    if (ts.isJsxSelfClosingElement(node)) {
        return lowerJsxSelfClosing(node, states, props, ctx);
    }
    if (ts.isJsxFragment(node)) {
        return node.children.flatMap(c => lowerExpression(c, states, props, ctx));
    }
    if (ts.isJsxExpression(node) && node.expression) {
        return lowerJsxExpression(node.expression, states, props, ctx);
    }
    if (ts.isJsxText(node)) {
        const trimmed = node.text.trim();
        if (!trimmed) return [];
        return [{ kind: 'text', format: '%s', args: [`"${escapeCppString(trimmed)}"`] }];
    }
    return [];
}

function lowerJsxElement(
    node: ts.JsxElement,
    states: UseStateInfo[],
    props: IRPropParam[],
    ctx: LowerCtx,
): IRNode[] {
    const tagName = (node.openingElement.tagName as ts.Identifier).text;
    const attrs = node.openingElement.attributes;
    const children = node.children.flatMap(c => lowerExpression(c, states, props, ctx));

    return lowerTag(tagName, attrs, children, states, props, ctx);
}

function lowerJsxSelfClosing(
    node: ts.JsxSelfClosingElement,
    states: UseStateInfo[],
    props: IRPropParam[],
    ctx: LowerCtx,
): IRNode[] {
    const tagName = (node.tagName as ts.Identifier).text;
    return lowerTag(tagName, node.attributes, [], states, props, ctx);
}

function lowerTag(
    tagName: string,
    attrs: ts.JsxAttributes,
    children: IRNode[],
    states: UseStateInfo[],
    props: IRPropParam[],
    ctx: LowerCtx,
): IRNode[] {
    const propMap = extractJsxProps(attrs, states, props);

    if (!isHostComponent(tagName)) {
        // Custom component
        return [{
            kind: 'custom_component',
            name: tagName,
            props: propMap,
            key: propMap['key'],
            stateCount: 0,  // will be resolved during multi-file compilation
            bufferCount: 0,
        }];
    }

    switch (tagName) {
        case 'Window':
        case 'View':
        case 'Row':
        case 'Column': {
            const style = buildStyleString(propMap);
            const beginProps: Record<string, string> = {};
            if (propMap['title']) beginProps['title'] = propMap['title'];
            if (propMap['gap']) {
                // gap goes into the style initializer
            }
            return [
                { kind: 'begin_container', tag: tagName as any, props: beginProps, style },
                ...children,
                { kind: 'end_container', tag: tagName as any },
            ];
        }
        case 'Text': {
            const textContent = extractTextContent(children, attrs, states, props);
            return [textContent];
        }
        case 'Button': {
            const title = propMap['title'] || '""';
            const action = extractCallbackBody(attrs, 'onPress', states, props);
            return [{ kind: 'button', title, action, style: buildStyleString(propMap) }];
        }
        case 'TextInput': {
            const label = propMap['label'] || `"##textinput_${ctx.bufferIndex}"`;
            const stateVar = findBoundStateVar(attrs, 'value', states);
            const bi = ctx.bufferIndex++;
            return [{
                kind: 'text_input',
                label,
                bufferIndex: bi,
                stateVar: stateVar || 'unknown',
                style: buildStyleString(propMap),
            }];
        }
        case 'Checkbox': {
            const label = propMap['label'] || '"##checkbox"';
            const stateVar = findBoundStateVar(attrs, 'value', states);
            return [{
                kind: 'checkbox',
                label,
                stateVar: stateVar || 'unknown',
                style: buildStyleString(propMap),
            }];
        }
        case 'Separator':
            return [{ kind: 'separator' }];
        case 'Popup': {
            const id = propMap['id'] || '"popup"';
            return [
                { kind: 'begin_popup', id, style: buildStyleString(propMap) },
                ...children,
                { kind: 'end_popup' },
            ];
        }
        default:
            return [];
    }
}

function lowerJsxExpression(
    expr: ts.Expression,
    states: UseStateInfo[],
    props: IRPropParam[],
    ctx: LowerCtx,
): IRNode[] {
    // condition && <Element />
    if (ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const condition = exprToCpp(expr.left, states, props);
        const body = lowerExpression(expr.right, states, props, ctx);
        return [{ kind: 'conditional', condition, body }];
    }
    // condition ? <A /> : <B />
    if (ts.isConditionalExpression(expr)) {
        const condition = exprToCpp(expr.condition, states, props);
        const body = lowerExpression(expr.whenTrue, states, props, ctx);
        const elseBody = lowerExpression(expr.whenFalse, states, props, ctx);
        return [{ kind: 'conditional', condition, body, elseBody }];
    }
    // items.map(item => <Component />)
    if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression) &&
        expr.expression.name.text === 'map') {
        return lowerMapExpression(expr, states, props, ctx);
    }
    return [];
}

function lowerMapExpression(
    call: ts.CallExpression,
    states: UseStateInfo[],
    props: IRPropParam[],
    ctx: LowerCtx,
): IRNode[] {
    const arrayExpr = exprToCpp((call.expression as ts.PropertyAccessExpression).expression, states, props);
    const callback = call.arguments[0];
    if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) return [];

    const params = callback.parameters;
    const itemVar = params[0] ? (params[0].name as ts.Identifier).text : 'item';

    let bodyNodes: IRNode[];
    if (ts.isBlock(callback.body)) {
        const ret = callback.body.statements.find(ts.isReturnStatement);
        bodyNodes = ret?.expression ? lowerExpression(ret.expression, states, props, ctx) : [];
    } else {
        bodyNodes = lowerExpression(callback.body as ts.Expression, states, props, ctx);
    }

    return [{
        kind: 'list_map',
        array: arrayExpr,
        itemVar,
        key: `${itemVar}.id`,  // simplified — real impl would extract from key prop
        componentName: '',
        stateCount: 0,
        bufferCount: 0,
        body: bodyNodes,
    }];
}

// --- Helpers ---

function extractJsxProps(
    attrs: ts.JsxAttributes,
    states: UseStateInfo[],
    props: IRPropParam[],
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const attr of attrs.properties) {
        if (!ts.isJsxAttribute(attr) || !attr.name) continue;
        const name = attr.name.text;
        if (attr.initializer) {
            if (ts.isStringLiteral(attr.initializer)) {
                result[name] = `"${attr.initializer.text}"`;
            } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                result[name] = exprToCpp(attr.initializer.expression, states, props);
            }
        } else {
            result[name] = 'true'; // bare attribute like `disabled`
        }
    }
    return result;
}

function extractCallbackBody(
    attrs: ts.JsxAttributes,
    propName: string,
    states: UseStateInfo[],
    props: IRPropParam[],
): string[] {
    for (const attr of attrs.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.text !== propName) continue;
        if (!attr.initializer || !ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) continue;
        const expr = attr.initializer.expression;
        if (ts.isArrowFunction(expr)) {
            return lowerCallbackBody(expr, states, props);
        }
    }
    return [];
}

function lowerCallbackBody(arrow: ts.ArrowFunction, states: UseStateInfo[], props: IRPropParam[]): string[] {
    if (ts.isBlock(arrow.body)) {
        return arrow.body.statements.map(s => stmtToCpp(s, states, props));
    }
    // Expression body
    const expr = arrow.body as ts.Expression;
    return [exprToCpp(expr, states, props) + ';'];
}

function stmtToCpp(stmt: ts.Statement, states: UseStateInfo[], props: IRPropParam[]): string {
    if (ts.isExpressionStatement(stmt)) {
        return exprToCpp(stmt.expression, states, props) + ';';
    }
    return '/* unsupported statement */';
}

export function exprToCpp(node: ts.Expression, states: UseStateInfo[], props: IRPropParam[]): string {
    if (ts.isNumericLiteral(node)) return node.text;
    if (ts.isStringLiteral(node)) return `std::string("${node.text}")`;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
    if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';

    if (ts.isIdentifier(node)) {
        const name = node.text;
        const state = states.find(s => s.name === name);
        if (state) return `${name}.get()`;
        return name;
    }

    if (ts.isPropertyAccessExpression(node)) {
        const obj = exprToCpp(node.expression, states, props);
        return `${obj}.${node.name.text}`;
    }

    if (ts.isBinaryExpression(node)) {
        const left = exprToCpp(node.left, states, props);
        const right = exprToCpp(node.right, states, props);
        const op = node.operatorToken.getText();
        return `${left} ${op} ${right}`;
    }

    if (ts.isCallExpression(node)) {
        const callee = node.expression;
        // Check if it's a state setter: setCount(expr)
        if (ts.isIdentifier(callee)) {
            const state = states.find(s => s.setter === callee.text);
            if (state) {
                const arg = node.arguments[0] ? exprToCpp(node.arguments[0], states, props) : '';
                return `${state.name}.set(${arg})`;
            }
        }
        const func = exprToCpp(callee as ts.Expression, states, props);
        const args = node.arguments.map(a => exprToCpp(a, states, props)).join(', ');
        return `${func}(${args})`;
    }

    if (ts.isParenthesizedExpression(node)) {
        return `(${exprToCpp(node.expression, states, props)})`;
    }

    if (ts.isPrefixUnaryExpression(node)) {
        const operand = exprToCpp(node.operand, states, props);
        const op = node.operator === ts.SyntaxKind.ExclamationToken ? '!' : ts.tokenToString(node.operator) || '';
        return `${op}${operand}`;
    }

    if (ts.isTemplateExpression(node)) {
        // Template literals — convert to string concatenation for now
        let result = `std::string("${node.head.text}")`;
        for (const span of node.templateSpans) {
            const expr = exprToCpp(span.expression, states, props);
            result += ` + std::to_string(${expr})`;
            if (span.literal.text) {
                result += ` + "${span.literal.text}"`;
            }
        }
        return result;
    }

    if (ts.isNoSubstitutionTemplateLiteral(node)) {
        return `std::string("${node.text}")`;
    }

    // Fallback: use the source text
    return node.getText();
}

function findBoundStateVar(
    attrs: ts.JsxAttributes,
    propName: string,
    states: UseStateInfo[],
): string | null {
    for (const attr of attrs.properties) {
        if (!ts.isJsxAttribute(attr) || attr.name.text !== propName) continue;
        if (!attr.initializer || !ts.isJsxExpression(attr.initializer) || !attr.initializer.expression) continue;
        if (ts.isIdentifier(attr.initializer.expression)) {
            const name = attr.initializer.expression.text;
            const state = states.find(s => s.name === name);
            if (state) return state.name;
        }
    }
    return null;
}

function extractTextContent(
    children: IRNode[],
    attrs: ts.JsxAttributes,
    states: UseStateInfo[],
    props: IRPropParam[],
): IRNode {
    // If children were already lowered, return the first text node or merge them.
    if (children.length === 1 && children[0].kind === 'text') {
        return children[0];
    }
    // Multiple text children: merge format strings and args
    if (children.length > 0 && children.every(c => c.kind === 'text')) {
        const format = children.map(c => (c as { format: string }).format).join('');
        const args = children.flatMap(c => (c as { args: string[] }).args);
        return { kind: 'text', format, args };
    }
    // Fallback for empty <Text></Text>
    return { kind: 'text', format: '', args: [] };
}

function buildStyleString(propMap: Record<string, string>): string | undefined {
    const fields: string[] = [];
    if (propMap['gap']) fields.push(`.gap = ${propMap['gap']}`);
    if (propMap['style']) {
        // style is an object expression — will be expanded
        // For MVP, pass through
        return propMap['style'];
    }
    if (fields.length === 0) return undefined;
    return `{${fields.join(', ')}}`;
}

function inferTypeFromInitializer(expr: ts.Expression): IRType {
    if (ts.isNumericLiteral(expr)) return 'int';
    if (ts.isStringLiteral(expr)) return 'string';
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) return 'bool';
    if (ts.isNoSubstitutionTemplateLiteral(expr)) return 'string';
    return 'int'; // default fallback
}

function countTextInputs(func: ts.FunctionDeclaration): number {
    let count = 0;
    function walk(node: ts.Node) {
        if ((ts.isJsxElement(node) && ts.isIdentifier(node.openingElement.tagName) &&
             node.openingElement.tagName.text === 'TextInput') ||
            (ts.isJsxSelfClosingElement(node) && ts.isIdentifier(node.tagName) &&
             node.tagName.text === 'TextInput')) {
            count++;
        }
        ts.forEachChild(node, walk);
    }
    ts.forEachChild(func, walk);
    return count;
}

function escapeCppString(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function extractPropParams(func: ts.FunctionDeclaration): IRPropParam[] {
    if (!func.parameters.length) return [];
    const param = func.parameters[0];
    if (!param.type || !ts.isTypeLiteralNode(param.type)) return [];

    const params: IRPropParam[] = [];
    for (const member of param.type.members) {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
            const name = member.name.text;
            let type: IRType | 'callback' = 'string';
            if (member.type) {
                if (ts.isFunctionTypeNode(member.type)) {
                    type = 'callback';
                } else if (member.type.kind === ts.SyntaxKind.StringKeyword) {
                    type = 'string';
                } else if (member.type.kind === ts.SyntaxKind.NumberKeyword) {
                    type = 'int';
                } else if (member.type.kind === ts.SyntaxKind.BooleanKeyword) {
                    type = 'bool';
                }
            }
            params.push({ name, type });
        }
    }
    return params;
}
```

- [ ] **Step 2: Write lowering tests**

```typescript
// compiler/tests/lowering.test.ts
import { describe, it, expect } from 'vitest';
import { parseIgxFile } from '../src/parser.js';
import { validate } from '../src/validator.js';
import { lowerComponent } from '../src/lowering.js';

describe('lowerComponent', () => {
    it('lowers a simple component with useState', () => {
        const source = `
function App() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Hello">
      <Button title="Inc" onPress={() => setCount(count + 1)} />
    </Window>
  );
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);

        expect(ir.name).toBe('App');
        expect(ir.stateSlots).toHaveLength(1);
        expect(ir.stateSlots[0]).toMatchObject({ name: 'count', setter: 'setCount', index: 0 });

        // Should produce: begin_container(Window), button, end_container(Window)
        expect(ir.body[0]).toMatchObject({ kind: 'begin_container', tag: 'Window' });
        expect(ir.body[1]).toMatchObject({ kind: 'button' });
        expect(ir.body[2]).toMatchObject({ kind: 'end_container', tag: 'Window' });
    });

    it('lowers conditional rendering', () => {
        const source = `
function App() {
  const [show, setShow] = useState(true);
  return (
    <Window title="Test">
      {show && <Text>Visible</Text>}
    </Window>
  );
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);

        // begin_container, conditional, end_container
        const conditional = ir.body.find(n => n.kind === 'conditional');
        expect(conditional).toBeDefined();
        expect(conditional!).toMatchObject({ kind: 'conditional', condition: 'show.get()' });
    });

    it('lowers TextInput with buffer index', () => {
        const source = `
function App() {
  const [name, setName] = useState("hello");
  return <TextInput value={name} onChange={setName} />;
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);

        expect(ir.bufferCount).toBe(1);
        const input = ir.body.find(n => n.kind === 'text_input');
        expect(input).toMatchObject({ kind: 'text_input', bufferIndex: 0, stateVar: 'name' });
    });

    it('extracts prop parameters from typed function', () => {
        const source = `
function Greeting(props: { name: string, count: number, onClose: () => void }) {
  return <Text>Hi</Text>;
}`;
        const parsed = parseIgxFile('Greeting.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);

        expect(ir.params).toEqual([
            { name: 'name', type: 'string' },
            { name: 'count', type: 'int' },
            { name: 'onClose', type: 'callback' },
        ]);
    });
});
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd compiler && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/lowering.ts compiler/tests/lowering.test.ts
git commit -m "feat: AST-to-IR lowering for components, state, and JSX elements"
```

---

### Task 12: Emitter (IR to C++)

**Files:**
- Create: `compiler/src/emitter.ts`
- Create: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Write emitter.ts**

```typescript
// compiler/src/emitter.ts
import type { IRComponent, IRNode, IRStateSlot, IRPropParam } from './ir.js';

const TYPE_MAP: Record<string, string> = {
    int: 'int',
    float: 'float',
    bool: 'bool',
    string: 'std::string',
};

const INITIAL_VALUE_MAP: Record<string, (v: string) => string> = {
    int: (v) => v,
    float: (v) => v,
    bool: (v) => v,
    string: (v) => v.startsWith('std::string') ? v : `std::string(${v})`,
};

/**
 * Emit a .gen.cpp file for a single component.
 */
export function emitComponent(comp: IRComponent): string {
    const lines: string[] = [];
    lines.push('#include <imx/runtime.h>');
    lines.push('#include <imx/renderer.h>');
    lines.push('');

    // If the component accepts props, emit a props struct
    if (comp.params.length > 0) {
        lines.push(`struct ${comp.name}_Props {`);
        for (const p of comp.params) {
            if (p.type === 'callback') {
                lines.push(`    std::function<void()> ${p.name};`);
            } else {
                lines.push(`    ${TYPE_MAP[p.type] || 'int'} ${p.name};`);
            }
        }
        lines.push('};');
        lines.push('');
    }

    // Function signature
    if (comp.params.length > 0) {
        lines.push(`void ${comp.name}_render(imx::RenderContext& ctx, const ${comp.name}_Props& props) {`);
    } else {
        lines.push(`void ${comp.name}_render(imx::RenderContext& ctx) {`);
    }

    // State declarations
    for (const s of comp.stateSlots) {
        const cppType = TYPE_MAP[s.type] || 'int';
        const initial = INITIAL_VALUE_MAP[s.type]?.(s.initialValue) ?? s.initialValue;
        lines.push(`    auto ${s.name} = ctx.use_state<${cppType}>(${initial}, ${s.index});`);
    }
    if (comp.stateSlots.length > 0) lines.push('');

    // Body
    emitNodes(comp.body, lines, 1, comp);

    lines.push('}');
    return lines.join('\n') + '\n';
}

/**
 * Emit the app_root.gen.cpp entry point.
 */
export function emitRoot(rootComponentName: string, stateCount: number, bufferCount: number): string {
    const lines: string[] = [];
    lines.push('#include <imx/runtime.h>');
    lines.push('');
    lines.push(`void ${rootComponentName}_render(imx::RenderContext& ctx);`);
    lines.push('');
    lines.push('namespace imx {');
    lines.push('');
    lines.push('void render_root(Runtime& runtime) {');
    lines.push('    auto& ctx = runtime.begin_frame();');
    lines.push(`    ctx.begin_instance("${rootComponentName}", 0, ${stateCount}, ${bufferCount});`);
    lines.push(`    ${rootComponentName}_render(ctx);`);
    lines.push('    ctx.end_instance();');
    lines.push('    runtime.end_frame();');
    lines.push('}');
    lines.push('');
    lines.push('} // namespace imx');
    return lines.join('\n') + '\n';
}

function emitNodes(nodes: IRNode[], lines: string[], indent: number, comp: IRComponent): void {
    const pad = '    '.repeat(indent);
    for (const node of nodes) {
        switch (node.kind) {
            case 'begin_container': {
                const tag = node.tag;
                if (tag === 'Window') {
                    const title = node.props['title'] || '"Untitled"';
                    lines.push(`${pad}imx::renderer::begin_window(${title});`);
                } else {
                    const style = node.style ? `imx::Style${node.style}` : '{}';
                    lines.push(`${pad}imx::renderer::begin_${tag.toLowerCase()}(${style});`);
                }
                break;
            }
            case 'end_container': {
                const tag = node.tag;
                if (tag === 'Window') {
                    lines.push(`${pad}imx::renderer::end_window();`);
                } else {
                    lines.push(`${pad}imx::renderer::end_${tag.toLowerCase()}();`);
                }
                break;
            }
            case 'text': {
                if (node.args.length === 0) {
                    lines.push(`${pad}imx::renderer::text("${node.format}");`);
                } else {
                    lines.push(`${pad}imx::renderer::text("${node.format}", ${node.args.join(', ')});`);
                }
                break;
            }
            case 'button': {
                lines.push(`${pad}if (imx::renderer::button(${node.title})) {`);
                for (const stmt of node.action) {
                    lines.push(`${pad}    ${stmt}`);
                }
                lines.push(`${pad}}`);
                break;
            }
            case 'text_input': {
                lines.push(`${pad}{`);
                lines.push(`${pad}    auto& buf = ctx.get_buffer(${node.bufferIndex});`);
                lines.push(`${pad}    buf.sync_from(${node.stateVar}.get());`);
                lines.push(`${pad}    if (imx::renderer::text_input(${node.label}, buf)) {`);
                lines.push(`${pad}        ${node.stateVar}.set(buf.value());`);
                lines.push(`${pad}    }`);
                lines.push(`${pad}}`);
                break;
            }
            case 'checkbox': {
                lines.push(`${pad}{`);
                lines.push(`${pad}    bool val = ${node.stateVar}.get();`);
                lines.push(`${pad}    if (imx::renderer::checkbox(${node.label}, &val)) {`);
                lines.push(`${pad}        ${node.stateVar}.set(val);`);
                lines.push(`${pad}    }`);
                lines.push(`${pad}}`);
                break;
            }
            case 'separator': {
                lines.push(`${pad}imx::renderer::separator();`);
                break;
            }
            case 'begin_popup': {
                lines.push(`${pad}if (imx::renderer::begin_popup(${node.id})) {`);
                break;
            }
            case 'end_popup': {
                lines.push(`${pad}imx::renderer::end_popup();`);
                lines.push(`${pad}}`);
                break;
            }
            case 'open_popup': {
                lines.push(`${pad}imx::renderer::open_popup(${node.id});`);
                break;
            }
            case 'conditional': {
                lines.push(`${pad}if (${node.condition}) {`);
                emitNodes(node.body, lines, indent + 1, comp);
                if (node.elseBody) {
                    lines.push(`${pad}} else {`);
                    emitNodes(node.elseBody, lines, indent + 1, comp);
                }
                lines.push(`${pad}}`);
                break;
            }
            case 'list_map': {
                lines.push(`${pad}for (size_t i = 0; i < ${node.array}.size(); ++i) {`);
                lines.push(`${pad}    auto& ${node.itemVar} = ${node.array}[i];`);
                if (node.key) {
                    lines.push(`${pad}    ctx.begin_instance("${node.componentName || 'ListItem'}", ${node.key}, ${node.stateCount}, ${node.bufferCount});`);
                }
                emitNodes(node.body, lines, indent + 1, comp);
                if (node.key) {
                    lines.push(`${pad}    ctx.end_instance();`);
                }
                lines.push(`${pad}}`);
                break;
            }
            case 'custom_component': {
                if (node.key) {
                    lines.push(`${pad}ctx.begin_instance("${node.name}", ${node.key}, ${node.stateCount}, ${node.bufferCount});`);
                } else {
                    lines.push(`${pad}ctx.begin_instance("${node.name}", ${0}, ${node.stateCount}, ${node.bufferCount});`);
                }
                const propsEntries = Object.entries(node.props).filter(([k]) => k !== 'key');
                if (propsEntries.length > 0) {
                    const propsStr = propsEntries.map(([k, v]) => `.${k} = ${v}`).join(', ');
                    lines.push(`${pad}${node.name}_render(ctx, {${propsStr}});`);
                } else {
                    lines.push(`${pad}${node.name}_render(ctx, {});`);
                }
                lines.push(`${pad}ctx.end_instance();`);
                break;
            }
        }
    }
}
```

- [ ] **Step 2: Write emitter tests**

```typescript
// compiler/tests/emitter.test.ts
import { describe, it, expect } from 'vitest';
import { parseIgxFile } from '../src/parser.js';
import { validate } from '../src/validator.js';
import { lowerComponent } from '../src/lowering.js';
import { emitComponent, emitRoot } from '../src/emitter.js';

describe('emitComponent', () => {
    it('emits a simple component with state and button', () => {
        const source = `
function App() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Hello">
      <Button title="Inc" onPress={() => setCount(count + 1)} />
    </Window>
  );
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);
        const output = emitComponent(ir);

        expect(output).toContain('#include <imx/runtime.h>');
        expect(output).toContain('void App_render(imx::RenderContext& ctx)');
        expect(output).toContain('ctx.use_state<int>(0, 0)');
        expect(output).toContain('imx::renderer::begin_window("Hello")');
        expect(output).toContain('imx::renderer::button("Inc")');
        expect(output).toContain('count.set(count.get() + 1)');
        expect(output).toContain('imx::renderer::end_window()');
    });

    it('emits conditional rendering', () => {
        const source = `
function App() {
  const [show, setShow] = useState(true);
  return (
    <Window title="Test">
      {show && <Text>Visible</Text>}
    </Window>
  );
}`;
        const parsed = parseIgxFile('App.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);
        const output = emitComponent(ir);

        expect(output).toContain('if (show.get())');
    });

    it('emits a component with props struct', () => {
        const source = `
function Greeting(props: { name: string, onClose: () => void }) {
  return <Text>Hello</Text>;
}`;
        const parsed = parseIgxFile('Greeting.tsx', source);
        const validation = validate(parsed);
        const ir = lowerComponent(parsed, validation);
        const output = emitComponent(ir);

        expect(output).toContain('struct Greeting_Props');
        expect(output).toContain('std::string name');
        expect(output).toContain('std::function<void()> onClose');
        expect(output).toContain('void Greeting_render(imx::RenderContext& ctx, const Greeting_Props& props)');
    });
});

describe('emitRoot', () => {
    it('emits root entry point', () => {
        const output = emitRoot('App', 3, 1);
        expect(output).toContain('void App_render(imx::RenderContext& ctx)');
        expect(output).toContain('void render_root(Runtime& runtime)');
        expect(output).toContain('ctx.begin_instance("App", 0, 3, 1)');
        expect(output).toContain('App_render(ctx)');
        expect(output).toContain('runtime.end_frame()');
    });
});
```

- [ ] **Step 3: Run tests**

Run:
```bash
cd compiler && npx vitest run
```
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/emitter.ts compiler/tests/emitter.test.ts
git commit -m "feat: C++ code emitter — generates .gen.cpp from IR"
```

---

### Task 13: Compiler CLI (Wiring It Together)

**Files:**
- Modify: `compiler/src/index.ts`

- [ ] **Step 1: Wire the full pipeline into the CLI**

```typescript
// compiler/src/index.ts
import { parseArgs } from 'node:util';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseIgxFile } from './parser.js';
import { validate } from './validator.js';
import { lowerComponent } from './lowering.js';
import { emitComponent, emitRoot } from './emitter.js';

const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
        output: { type: 'string', short: 'o' },
    },
});

if (positionals.length === 0) {
    console.error('Usage: imx-compiler <input.tsx ...> -o <output-dir>');
    process.exit(1);
}

const outputDir = values.output ?? '.';
const inputFiles = positionals;

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

let hasErrors = false;

interface CompiledComponent {
    name: string;
    stateCount: number;
    bufferCount: number;
    output: string;
}

const compiled: CompiledComponent[] = [];

for (const file of inputFiles) {
    if (!fs.existsSync(file)) {
        console.error(`${file}:1:1 - error: file not found`);
        hasErrors = true;
        continue;
    }

    const source = fs.readFileSync(file, 'utf-8');
    const parsed = parseIgxFile(file, source);

    if (parsed.errors.length > 0) {
        for (const e of parsed.errors) {
            console.error(`${e.file}:${e.line}:${e.col} - error: ${e.message}`);
        }
        hasErrors = true;
        continue;
    }

    const validation = validate(parsed);
    if (validation.errors.length > 0) {
        for (const e of validation.errors) {
            console.error(`${e.file}:${e.line}:${e.col} - error: ${e.message}`);
        }
        hasErrors = true;
        continue;
    }

    const ir = lowerComponent(parsed, validation);
    const cppOutput = emitComponent(ir);

    const baseName = path.basename(file, path.extname(file));
    const outPath = path.join(outputDir, `${baseName}.gen.cpp`);
    fs.writeFileSync(outPath, cppOutput);
    console.log(`  ${file} -> ${outPath}`);

    compiled.push({
        name: ir.name,
        stateCount: ir.stateSlots.length,
        bufferCount: ir.bufferCount,
        output: outPath,
    });
}

if (hasErrors) {
    process.exit(1);
}

// Emit root entry point for the first (or only) component
if (compiled.length > 0) {
    const root = compiled[0];
    const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount);
    const rootPath = path.join(outputDir, 'app_root.gen.cpp');
    fs.writeFileSync(rootPath, rootOutput);
    console.log(`  -> ${rootPath} (root entry point)`);
}

console.log(`imx-compiler: ${compiled.length} component(s) compiled successfully.`);
```

- [ ] **Step 2: Rebuild compiler**

Run:
```bash
cd compiler && npm run build
```

- [ ] **Step 3: Create a test .tsx file and run the compiler**

Create a temporary test file:
```bash
cat > /tmp/Test.tsx << 'EOF'
function Test() {
  const [count, setCount] = useState(0);
  return (
    <Window title="Test">
      <Button title="Click" onPress={() => setCount(count + 1)} />
    </Window>
  );
}
EOF
node compiler/dist/index.js /tmp/Test.tsx -o /tmp/imx-out/
cat /tmp/imx-out/Test.gen.cpp
cat /tmp/imx-out/app_root.gen.cpp
```

Expected: two generated files with valid C++ code matching the design spec patterns.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/index.ts
git commit -m "feat: compiler CLI — end-to-end .tsx to .gen.cpp pipeline"
```

---

## Phase 6: Build Integration

### Task 14: render_root Declaration in Runtime Header

**Files:**
- Modify: `include/imx/runtime.h`

- [ ] **Step 1: Add render_root declaration**

Append before the closing `} // namespace imx`:

```cpp
// Entry point generated by the compiler. Declared here so app shells can call it.
void render_root(Runtime& runtime);
```

- [ ] **Step 2: Build to verify**

Run:
```bash
cmake --build build --target imx_runtime
```
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add include/imx/runtime.h
git commit -m "feat: add render_root declaration to runtime header"
```

---

### Task 15: Example App (.tsx Source + CMake Integration)

**Files:**
- Create: `examples/hello/App.tsx`
- Modify: `examples/hello/main.cpp`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Write the example App.tsx**

```tsx
// examples/hello/App.tsx
function App() {
  const [name, setName] = useState("Berkay");
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(0);

  return (
    <Window title="Hello">
      <Column gap={8}>
        <Text>Hello {name}</Text>
        <TextInput value={name} onChange={setName} />
        <Checkbox label="Enabled" value={enabled} onChange={setEnabled} />
        <Row gap={8}>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <Text>Count: {count}</Text>
        </Row>
        {enabled && <Text>Status: active</Text>}
      </Column>
    </Window>
  );
}
```

- [ ] **Step 2: Update examples/hello/main.cpp to use generated code**

Replace the hand-written includes with the generated root:

```cpp
// examples/hello/main.cpp
#include <imx/runtime.h>
#include <imx/renderer.h>

#include <imgui.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
#include <GLFW/glfw3.h>

struct App {
    GLFWwindow* window = nullptr;
    ImGuiIO*    io     = nullptr;
    imx::Runtime runtime;
};

static void draw_dockspace() {
    ImGuiViewport* viewport = ImGui::GetMainViewport();
    ImGui::SetNextWindowPos(viewport->WorkPos);
    ImGui::SetNextWindowSize(viewport->WorkSize);
    ImGui::SetNextWindowViewport(viewport->ID);

    ImGuiWindowFlags host_flags = ImGuiWindowFlags_NoDocking | ImGuiWindowFlags_NoTitleBar |
                                  ImGuiWindowFlags_NoCollapse | ImGuiWindowFlags_NoResize |
                                  ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoBringToFrontOnFocus |
                                  ImGuiWindowFlags_NoNavFocus | ImGuiWindowFlags_NoBackground;

    ImGui::PushStyleVar(ImGuiStyleVar_WindowRounding, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowBorderSize, 0.0F);
    ImGui::PushStyleVar(ImGuiStyleVar_WindowPadding, ImVec2(0.0F, 0.0F));
    ImGui::Begin("DockSpaceHost", nullptr, host_flags);
    ImGui::PopStyleVar(3);
    ImGui::DockSpace(ImGui::GetID("MainDockSpace"), ImVec2(0.0F, 0.0F), ImGuiDockNodeFlags_None);
    ImGui::End();
}

static void render_frame(App& app) {
    glfwMakeContextCurrent(app.window);
    if (glfwGetWindowAttrib(app.window, GLFW_ICONIFIED) != 0) return;

    int fb_w = 0, fb_h = 0;
    glfwGetFramebufferSize(app.window, &fb_w, &fb_h);
    if (fb_w <= 0 || fb_h <= 0) return;

    ImGui_ImplOpenGL3_NewFrame();
    ImGui_ImplGlfw_NewFrame();
    ImGui::NewFrame();

    draw_dockspace();

    // --- Generated code drives the UI ---
    imx::render_root(app.runtime);

    ImGui::Render();
    glViewport(0, 0, fb_w, fb_h);
    glClearColor(0.12F, 0.12F, 0.15F, 1.0F);
    glClear(GL_COLOR_BUFFER_BIT);
    ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

    if ((app.io->ConfigFlags & ImGuiConfigFlags_ViewportsEnable) != 0) {
        ImGui::UpdatePlatformWindows();
        ImGui::RenderPlatformWindowsDefault();
    }

    glfwMakeContextCurrent(app.window);
    glfwSwapBuffers(app.window);
}

static void window_size_callback(GLFWwindow* window, int, int) {
    auto* app = static_cast<App*>(glfwGetWindowUserPointer(window));
    if (app) render_frame(*app);
}

int main() {
    if (glfwInit() == 0) return 1;

    const char* glsl_version = "#version 150";
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 2);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
#ifdef __APPLE__
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
#endif

    GLFWwindow* window = glfwCreateWindow(600, 400, "imx", nullptr, nullptr);
    if (!window) { glfwTerminate(); return 1; }
    glfwMakeContextCurrent(window);
    glfwSwapInterval(1);

    IMGUI_CHECKVERSION();
    ImGui::CreateContext();
    ImGuiIO& io = ImGui::GetIO();
    io.ConfigFlags |= ImGuiConfigFlags_DockingEnable;
    io.ConfigFlags |= ImGuiConfigFlags_ViewportsEnable;

    ImGui::StyleColorsDark();
    ImGuiStyle& style = ImGui::GetStyle();
    if (io.ConfigFlags & ImGuiConfigFlags_ViewportsEnable) {
        style.WindowRounding = 0.0F;
        style.Colors[ImGuiCol_WindowBg].w = 1.0F;
    }

    ImGui_ImplGlfw_InitForOpenGL(window, true);
    ImGui_ImplOpenGL3_Init(glsl_version);

    App app;
    app.window = window;
    app.io = &io;
    glfwSetWindowUserPointer(window, &app);
    glfwSetWindowSizeCallback(window, window_size_callback);

    while (glfwWindowShouldClose(window) == 0) {
        glfwPollEvents();
        render_frame(app);
    }

    ImGui_ImplOpenGL3_Shutdown();
    ImGui_ImplGlfw_Shutdown();
    ImGui::DestroyContext();
    glfwDestroyWindow(window);
    glfwTerminate();
    return 0;
}
```

- [ ] **Step 3: Update CMakeLists.txt with codegen custom command and hello_app target**

Add after the existing targets:

```cmake
# --- Code generation: .tsx -> .gen.cpp ---
set(IMX_GENERATED_DIR ${CMAKE_BINARY_DIR}/generated)
file(MAKE_DIRECTORY ${IMX_GENERATED_DIR})

add_custom_command(
    OUTPUT
        ${IMX_GENERATED_DIR}/App.gen.cpp
        ${IMX_GENERATED_DIR}/app_root.gen.cpp
    COMMAND node ${CMAKE_SOURCE_DIR}/compiler/dist/index.js
        ${CMAKE_SOURCE_DIR}/examples/hello/App.tsx
        -o ${IMX_GENERATED_DIR}
    DEPENDS
        ${CMAKE_SOURCE_DIR}/examples/hello/App.tsx
    COMMENT "Compiling App.tsx -> C++"
)

# --- hello_app: end-to-end .tsx -> native binary ---
add_executable(hello_app
    examples/hello/main.cpp
    ${IMX_GENERATED_DIR}/App.gen.cpp
    ${IMX_GENERATED_DIR}/app_root.gen.cpp
)
target_link_libraries(hello_app PRIVATE imx_renderer)
target_include_directories(hello_app PRIVATE ${IMX_GENERATED_DIR})
```

- [ ] **Step 4: Build the compiler (prerequisite)**

Run:
```bash
cd compiler && npm run build
```

- [ ] **Step 5: Build and run the end-to-end example**

Run:
```bash
cmake -B build -G Ninja && cmake --build build --target hello_app && ./build/hello_app
```

Expected: a window titled "imx" opens with the same UI as the hand-written test:
- "Hello Berkay" text
- Editable text input
- "Enabled" checkbox
- "Increment" button + count on same row
- "Status: active" that toggles with checkbox

- [ ] **Step 6: Commit**

```bash
git add examples/hello/App.tsx examples/hello/main.cpp CMakeLists.txt
git commit -m "feat: end-to-end .tsx -> native app via CMake custom command"
```

---

### Task 16: Final Cleanup and Verification

**Files:**
- Modify: `CMakeLists.txt` (minor cleanup)

- [ ] **Step 1: Run all C++ tests**

Run:
```bash
cmake --build build --target runtime_tests && ./build/runtime_tests
```
Expected: all runtime tests pass.

- [ ] **Step 2: Run all compiler tests**

Run:
```bash
cd compiler && npx vitest run
```
Expected: all compiler tests pass.

- [ ] **Step 3: Build all targets**

Run:
```bash
cmake --build build
```
Expected: `imx_runtime`, `imx_renderer`, `runtime_tests`, `hello_hand`, `hello_app` all build successfully.

- [ ] **Step 4: Run the end-to-end app and verify interactivity**

Run:
```bash
./build/hello_app
```
Verify:
1. Text input changes update "Hello ..." text in real-time
2. Clicking "Increment" increases count
3. Unchecking "Enabled" hides "Status: active"
4. Re-checking "Enabled" shows it again
5. Window is dockable (can drag tabs)

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: IMX MVP complete — .tsx source compiles to native ImGui app"
```

