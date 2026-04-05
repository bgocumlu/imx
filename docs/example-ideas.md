# Example App Ideas

Example apps for `examples/` that stress-test different compiler paths and catch bugs.

## Done

- **Todo App** (`examples/todo/`) — C++ struct binding, custom components, native widgets, mixed UI/C++ state, .map() iteration, conditional rendering. Caught: arrow-function onChange IIFE bug in Checkbox and all value+onChange components.

## Planned

### Settings Panel
Tests **every input widget with struct binding**: SliderFloat, SliderInt, DragFloat, DragInt, InputInt, InputFloat, Combo, ListBox, ColorEdit, ColorPicker all bound to C++ struct fields with onChange callbacks. Broadest stress test of the onChange IIFE bug across all widgets.

### Calculator
Tests **expression complexity**: nested arithmetic in Text children (`{a + b * c}`), ternary in props (`title={result === 0 ? "Zero" : "Result"}`), chained property access. Uses TabBar for history/main views.

### Kanban Board
Tests **nested .map() + DragDrop**: multiple columns each with `.map()` over items, DragDropSource/DragDropTarget with typed payloads between lists. Stresses instance ID scoping, nested iterators, and payload type annotations in callbacks.

### Dashboard
Tests **DockLayout complexity**: multiple windows with DockSplit nesting, PlotLines/PlotHistogram with dynamic data, Table with many rows, ProgressBar. Tests dock persistence and per-frame ID counters.

### Theme Showcase
Tests **style overrides stacking**: nested StyleColor + StyleVar, Theme with all 5 color props, conditional styling (`{dark && <StyleColor ...>}`), multiple themes switching via Combo. Tests push/pop stack correctness.

### File Browser
Tests **deep TreeNode nesting + conditional rendering**: recursive-like tree structure, Selectable for file selection, Modal for delete confirmation, context menus via Popup. Tests deeply nested instance scoping.

### Notepad
Tests **TextInput/InputTextMultiline with state**: large text editing, MenuBar with shortcuts, Modal save dialog. Tests TextInput buffer sync paths.
