# Example App Ideas

Example apps for `examples/` that stress-test different compiler paths and catch bugs.

## Done

- **Todo App** (`examples/todo/`) — C++ struct binding, custom components, native widgets, mixed UI/C++ state, .map() iteration, conditional rendering. Caught: arrow-function onChange IIFE bug in Checkbox and all value+onChange components.

- **Settings Panel** (`examples/settings/`) — every input widget with struct binding (SliderFloat, SliderInt, DragFloat, DragInt, InputInt, InputFloat, Combo, ListBox, Radio, Checkbox, ColorEdit, ColorPicker). Caught: ColorEdit onChange was required (should be optional), ColorEdit/ColorPicker silently skipped with struct binding (no lowering/emitting for non-state values).

- **Kanban Board** (`examples/kanban/`) — nested .map() (columns containing cards), DragDropSource with payloads, custom components inside map loops. Caught: .map() hardcoded loop variable as `i`, causing shadowing in nested maps and breaking user-specified index variables.

- **Dashboard** (`examples/dashboard/`) — Table with .map() rows, PlotLines/PlotHistogram with struct-bound vector data, multi-window DockLayout with nested DockSplit, ProgressBar, live-updating metrics. Caught: PlotLines/PlotHistogram can't use struct vector values (emitted C array init from vector), string concat with numbers in props generates pointer arithmetic instead of string concat.

## Planned

### Calculator
Tests **expression complexity**: nested arithmetic in Text children (`{a + b * c}`), ternary in props (`title={result === 0 ? "Zero" : "Result"}`), chained property access. Uses TabBar for history/main views.

### Theme Showcase
Tests **style overrides stacking**: nested StyleColor + StyleVar, Theme with all 5 color props, conditional styling (`{dark && <StyleColor ...>}`), multiple themes switching via Combo. Tests push/pop stack correctness.

### File Browser
Tests **deep TreeNode nesting + conditional rendering**: recursive-like tree structure, Selectable for file selection, Modal for delete confirmation, context menus via Popup. Tests deeply nested instance scoping.

### Notepad
Tests **TextInput/InputTextMultiline with state**: large text editing, MenuBar with shortcuts, Modal save dialog. Tests TextInput buffer sync paths.
