# Adaptive Frame Loop Design

## Problem

The current frame loop uses `glfwWaitEventsTimeout(wait)` where `wait` is always ~16ms (targeting 60fps). This means:
- The app always renders at ~60fps regardless of whether anything changed
- Mouse movement wakes the loop early, creating inconsistent frame pacing
- No power savings — the WaitEventsTimeout is essentially a `sleep(remaining_ms)`
- Every example copy-pastes the same 10-line loop logic

Real frameworks (Qt, Chrome, Electron) use adaptive rendering: sleep when idle, render at full speed when active.

## Design

### Runtime API additions

Add three methods to `imx::Runtime`:

```cpp
void request_frame();                    // request at least 1 more active frame
bool needs_frame() const;                // true if active rendering needed
void frame_rendered(bool imgui_active);  // call after each rendered frame
```

Internal state: `int frames_needed_` counter, initialized to 3 (renders initial frames on startup).

### `frame_rendered(bool imgui_active)` logic

```
1. If dirty_ is set → frames_needed_ = max(frames_needed_, 3), clear dirty_
2. If imgui_active → frames_needed_ = max(frames_needed_, 1)
3. If frames_needed_ > 0 → decrement
```

- `dirty_` is set by `StateSlot::set()` — covers use_state-based state changes
- `imgui_active` comes from `ImGui::IsAnyItemActive()` — covers dragging, typing, clicking
- `request_frame()` — covers continuous rendering (live data, animations)

### Main loop pattern (all examples + init template)

```cpp
while (glfwWindowShouldClose(window) == 0) {
    if (app.runtime.needs_frame()) {
        glfwPollEvents();
    } else {
        glfwWaitEventsTimeout(0.1);  // 10fps heartbeat
    }
    render_frame(app);
    app.runtime.frame_rendered(ImGui::IsAnyItemActive());
}
```

4 lines. Replaces the current 10-line loop with `target_frame_time`, `last_frame_time`, wait computation, and conditional render.

### Behavior by scenario

| Scenario | Mechanism | Frame rate |
|----------|-----------|------------|
| App startup | `frames_needed_` initialized to 3 | 60fps for first 3 frames |
| User clicking/dragging | `IsAnyItemActive()` → stay active | 60fps during interaction |
| State change via callback | `dirty_` → boost to 3 frames | 60fps burst, then idle |
| Text cursor blink | 10fps heartbeat | 10fps (sufficient for blink) |
| Mouse hover (first after idle) | `WaitEventsTimeout` returns instantly on input | 1 frame at idle rate, then if clicked → 60fps |
| Live data (dashboard) | `request_frame()` each tick | 60fps continuous |
| Completely idle | `WaitEventsTimeout(0.1)` sleeps | 10fps, near-zero CPU |

### Key detail: WaitEventsTimeout returns instantly on input

`glfwWaitEventsTimeout(0.1)` does NOT add 100ms latency to input. It returns **immediately** when any GLFW event arrives (mouse, keyboard, window). The 0.1s timeout only applies when NO events arrive. So idle→active transition has zero latency.

### Dashboard-specific change

`simulate_data()` calls `app.runtime.request_frame()` to keep continuous rendering active. Without this, the dashboard would idle between data updates.

### Files to change

1. `include/imx/runtime.h` — add `request_frame()`, `needs_frame()`, `frame_rendered()`, `frames_needed_` member
2. `runtime/runtime.cpp` — implement the three methods
3. `examples/hello/main.cpp` — new loop pattern, remove `target_frame_time`/`last_frame_time`
4. `examples/todo/src/main.cpp` — same
5. `examples/settings/src/main.cpp` — same
6. `examples/kanban/src/main.cpp` — same
7. `examples/dashboard/src/main.cpp` — same + `request_frame()` in simulate_data
8. `compiler/src/init.ts` — update main.cpp template
9. `compiler/dist/` — rebuild

### What does NOT change

- `render_frame()` — unchanged in all examples
- `window_size_callback` — still needed for resize-during-drag on Windows
- `glfwSwapInterval(1)` — vsync stays on, caps active mode at 60fps
- Runtime's existing `dirty()`, `mark_dirty()`, `clear_dirty()` — kept for backward compat, `frame_rendered()` handles clearing internally
