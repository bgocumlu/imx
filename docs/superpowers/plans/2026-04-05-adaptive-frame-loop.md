# Adaptive Frame Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the copy-pasted WaitEventsTimeout frame loop with a runtime-driven adaptive loop that idles at 10fps when nothing changes and snaps to 60fps on interaction or `request_frame()`.

**Architecture:** Add `frames_needed_` counter to `imx::Runtime` with three public methods: `request_frame()`, `needs_frame()`, `frame_rendered(bool)`. Main loops in all examples and the init template switch to a 4-line pattern that delegates active/idle decisions to the runtime.

**Tech Stack:** C++20, Catch2 (tests), GLFW, ImGui, TypeScript (init template)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `include/imx/runtime.h` | Modify | Add `request_frame()`, `needs_frame()`, `frame_rendered()` declarations + `frames_needed_` member |
| `runtime/runtime.cpp` | Modify | Implement the three new methods |
| `tests/runtime/test_state.cpp` | Modify | Add frame scheduling tests (co-located with existing state/dirty tests) |
| `examples/hello/main.cpp` | Modify | Replace frame loop |
| `examples/todo/src/main.cpp` | Modify | Replace frame loop |
| `examples/settings/src/main.cpp` | Modify | Replace frame loop |
| `examples/kanban/src/main.cpp` | Modify | Replace frame loop |
| `examples/dashboard/src/main.cpp` | Modify | Replace frame loop + add `request_frame()` |
| `compiler/src/init.ts` | Modify | Update MAIN_CPP template |
| `compiler/dist/init.js` | Rebuild | `cd compiler && npm run build` |

---

### Task 1: Add frame scheduling API to Runtime (test + implement)

**Files:**
- Modify: `include/imx/runtime.h:113-128` (Runtime class)
- Modify: `runtime/runtime.cpp`
- Modify: `tests/runtime/test_state.cpp`

- [ ] **Step 1: Write failing tests for frame scheduling**

Add to the bottom of `tests/runtime/test_state.cpp`:

```cpp
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmake --build build --target runtime_tests 2>&1 | tail -5`
Expected: Compile error — `needs_frame`, `request_frame`, `frame_rendered` not declared.

- [ ] **Step 3: Add declarations to runtime.h**

In `include/imx/runtime.h`, add to the `Runtime` class public section (after `clear_dirty()`):

```cpp
    void request_frame();
    bool needs_frame() const;
    void frame_rendered(bool imgui_active);
```

Add to the private section (after `bool dirty_ = true;`):

```cpp
    int frames_needed_ = 3;
```

- [ ] **Step 4: Implement in runtime.cpp**

Add to `runtime/runtime.cpp` inside the `imx` namespace:

```cpp
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
    if (imgui_active) {
        if (frames_needed_ < 1) frames_needed_ = 1;
    }
    if (frames_needed_ > 0) {
        frames_needed_--;
    }
}
```

- [ ] **Step 5: Build and run tests**

Run: `cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe --reporter compact "[frame_loop]"`
Expected: All 6 new tests pass.

- [ ] **Step 6: Commit**

```bash
git add include/imx/runtime.h runtime/runtime.cpp tests/runtime/test_state.cpp
git commit -m "feat: add adaptive frame scheduling API to Runtime"
```

---

### Task 2: Update hello example main loop

**Files:**
- Modify: `examples/hello/main.cpp:125-142`

- [ ] **Step 1: Replace the frame loop**

In `examples/hello/main.cpp`, replace lines 125-142:

```cpp
    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
    }
```

With:

```cpp
    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }
```

- [ ] **Step 2: Build and smoke test**

Run: `cmake --build build --target hello_app`
Expected: Builds. Launch `build/Debug/hello_app.exe`, verify UI is responsive, CPU drops when idle.

- [ ] **Step 3: Commit**

```bash
git add examples/hello/main.cpp
git commit -m "refactor: hello example uses adaptive frame loop"
```

---

### Task 3: Update todo example main loop

**Files:**
- Modify: `examples/todo/src/main.cpp:139-156`

- [ ] **Step 1: Replace the frame loop**

In `examples/todo/src/main.cpp`, replace lines 139-156:

```cpp
    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
    }
```

With:

```cpp
    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }
```

- [ ] **Step 2: Build**

Run: `cmake --build build --target todo_app`
Expected: Builds successfully.

- [ ] **Step 3: Commit**

```bash
git add examples/todo/src/main.cpp
git commit -m "refactor: todo example uses adaptive frame loop"
```

---

### Task 4: Update settings example main loop

**Files:**
- Modify: `examples/settings/src/main.cpp:106-123`

- [ ] **Step 1: Replace the frame loop**

In `examples/settings/src/main.cpp`, replace lines 106-123:

```cpp
    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
    }
```

With:

```cpp
    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }
```

- [ ] **Step 2: Build**

Run: `cmake --build build --target settings_app`
Expected: Builds successfully.

- [ ] **Step 3: Commit**

```bash
git add examples/settings/src/main.cpp
git commit -m "refactor: settings example uses adaptive frame loop"
```

---

### Task 5: Update kanban example main loop

**Files:**
- Modify: `examples/kanban/src/main.cpp:140-157`

- [ ] **Step 1: Replace the frame loop**

In `examples/kanban/src/main.cpp`, replace lines 140-157:

```cpp
    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
    }
```

With:

```cpp
    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }
```

- [ ] **Step 2: Build**

Run: `cmake --build build --target kanban_app`
Expected: Builds successfully.

- [ ] **Step 3: Commit**

```bash
git add examples/kanban/src/main.cpp
git commit -m "refactor: kanban example uses adaptive frame loop"
```

---

### Task 6: Update dashboard example (loop + request_frame)

**Files:**
- Modify: `examples/dashboard/src/main.cpp:72-100` (render_frame — add request_frame)
- Modify: `examples/dashboard/src/main.cpp:157-174` (frame loop)

- [ ] **Step 1: Add request_frame in render_frame**

In `examples/dashboard/src/main.cpp`, inside `render_frame()`, add `app.runtime.request_frame()` right before `imx::render_root`. Change lines 84-85 from:

```cpp
    simulate_data(app);
    imx::render_root(app.runtime, app.state);
```

To:

```cpp
    simulate_data(app);
    app.runtime.request_frame();
    imx::render_root(app.runtime, app.state);
```

- [ ] **Step 2: Replace the frame loop**

In `examples/dashboard/src/main.cpp`, replace lines 157-174:

```cpp
    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
    }
```

With:

```cpp
    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }
```

- [ ] **Step 3: Build**

Run: `cmake --build build --target dashboard_app`
Expected: Builds successfully. Dashboard renders continuously at vsync because `request_frame()` is called every frame.

- [ ] **Step 4: Commit**

```bash
git add examples/dashboard/src/main.cpp
git commit -m "refactor: dashboard uses adaptive frame loop with request_frame"
```

---

### Task 7: Update init template + rebuild compiler

**Files:**
- Modify: `compiler/src/init.ts:104-121` (MAIN_CPP template)
- Rebuild: `compiler/dist/init.js`

- [ ] **Step 1: Update MAIN_CPP template in init.ts**

In `compiler/src/init.ts`, replace lines 104-121 in the MAIN_CPP template string:

```typescript
    constexpr double target_frame_time = 1.0 / 60.0;
    double last_frame_time = glfwGetTime();

    while (glfwWindowShouldClose(window) == 0) {
        double now = glfwGetTime();
        double wait = target_frame_time - (now - last_frame_time);
        if (wait > 0.001) {
            glfwWaitEventsTimeout(wait);
        } else {
            glfwPollEvents();
        }

        now = glfwGetTime();
        if (now - last_frame_time >= target_frame_time) {
            render_frame(app);
            last_frame_time = now;
        }
    }
```

With:

```typescript
    while (glfwWindowShouldClose(window) == 0) {
        if (app.runtime.needs_frame()) {
            glfwPollEvents();
        } else {
            glfwWaitEventsTimeout(0.1);
        }
        render_frame(app);
        app.runtime.frame_rendered(ImGui::IsAnyItemActive());
    }
```

- [ ] **Step 2: Rebuild compiler**

Run: `cd compiler && npm run build`
Expected: Builds successfully, `compiler/dist/init.js` updated.

- [ ] **Step 3: Verify the template**

Run: `grep -A 6 "glfwWindowShouldClose" compiler/dist/init.js`
Expected: Shows the new 4-line loop pattern, no `target_frame_time`.

- [ ] **Step 4: Commit**

```bash
git add compiler/src/init.ts compiler/dist/init.js
git commit -m "refactor: init template uses adaptive frame loop"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run runtime tests**

Run: `cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe`
Expected: All tests pass.

- [ ] **Step 2: Run compiler tests**

Run: `cd compiler && npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Build all examples**

Run: `cmake --build build`
Expected: All targets build successfully.

- [ ] **Step 4: Smoke test hello_app**

Launch `build/Debug/hello_app.exe`. Verify:
- UI responds to clicks immediately
- CPU usage drops when mouse is still and nothing is happening
- Dragging sliders/typing in text fields is smooth at 60fps

- [ ] **Step 5: Commit (if any fixups needed)**

Only if previous steps required changes. Otherwise skip.
