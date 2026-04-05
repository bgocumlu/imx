# Todo App Example

## Overview

A full-featured todo app in `examples/todo/` that showcases C++ struct binding, multi-component architecture, and the state split between C++ backend and UI-only state. Mirrors the `imxc init` project structure (`src/` subfolder).

## File Structure

```
examples/todo/
  src/
    main.cpp        — GLFW/ImGui bootstrap, owns TodoState, wires callbacks
    TodoState.h     — C++ struct (items vector, callbacks)
    App.tsx         — root component, receives props: TodoState
    TodoItem.tsx    — single item row (checkbox + text + remove button)
    imx.d.ts        — from init template + TodoState/TodoItem interfaces
  tsconfig.json
```

CMake target `todo_app` added to root `CMakeLists.txt` under the examples block.

## State Design

### C++ State (`TodoState.h`)

```cpp
struct TodoItem {
    std::string text;
    bool done = false;
    std::function<void()> onRemove;
};

struct TodoState {
    std::vector<TodoItem> items;
    std::string newText;
    int itemCount = 0;
    int doneCount = 0;
    std::function<void()> onAdd;
    std::function<void()> onClearCompleted;
};
```

- `items` — vector of TodoItem structs, iterated via `.map()` in TSX
- `newText` — bound to TextInput via direct pointer (no onChange)
- `itemCount` / `doneCount` — computed each frame in main.cpp before render
- `onAdd` — reads `newText`, pushes new item, clears `newText`
- `onClearCompleted` — erases items where `done == true`
- Per-item `onRemove` — wired up each frame in main.cpp

### UI-only State (useState in App.tsx)

- `filter` (number: 0=All, 1=Active, 2=Completed) — Radio buttons

## Component Design

### App.tsx

Root component receiving `props: TodoState`:
- TextInput bound to `props.newText` + Add button calling `props.onAdd`
- Radio filter (All / Active / Completed)
- Items list via `props.items.map()` with conditional rendering based on filter
- Footer: item count display, clear-completed button
- Theme wrapper

### TodoItem.tsx

Custom component with props:
- `text: string` — item text
- `done: boolean` — checkbox state (direct pointer)
- `onRemove: () => void` — remove callback

Renders: Checkbox + Text + Remove button in a Row.

## main.cpp

Follows `imxc init` pattern:
- Owns `TodoState` instance
- Pre-populates with a few sample items
- Each frame: computes `itemCount`/`doneCount`, wires per-item `onRemove` lambdas
- Passes state to `imx::render_root(runtime, state)`
- Includes `WinMain` wrapper for Windows release builds

## imx.d.ts

Based on the `imxc init` template (canonical version from `compiler/src/init.ts`), with:
- `AppState` replaced by `TodoState` and `TodoItem` interfaces
- No custom widget declarations needed

## TSX Features Showcased

- C++ struct binding (`props: TodoState`, direct pointer binding)
- Vector iteration with `.map()`
- Custom component with props (`TodoItem.tsx`)
- Conditional rendering (filter logic with ternary/&&)
- Radio buttons for filter selection
- Theme styling
- Mixed state: C++ struct fields + UI-only useState

## Risks

- TextInput with direct pointer binding (`value={props.newText}` without onChange) — needs verification
- Per-item `std::function<void()> onRemove` inside `.map()` loop — needs verification
- If either fails, fallback: use onChange callbacks or simplify remove to clear-completed only
