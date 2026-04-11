# Compiler Bugs

No known compiler bugs. All patterns below have been fixed and should generate valid C++.

## Fixed (kept for reference)

### 1. Numeric text interpolation in child components (fixed)
`<Text>Count: {props.data.count}</Text>` in child components now correctly uses `%g` format with `(double)` cast for numeric types, matching root component behavior. `inferExprType` resolves nested struct field types through external interfaces.

### 2. Individual scalar props preserve C++ type info (fixed)
`<MyComponent speed={props.speed} />` where `speed` is `float` in C++ now correctly generates `float* speed` in the child's Props struct. The compiler resolves actual C++ types from the parent's external interface definition.

### 3. MultiSelect bound prop detection (fixed)
`detectBoundProps` now scans all expression strings (callbacks, conditions, selections) for `props.X.Y` / `props.X[N]` patterns, not just `directBind` widgets. MultiSelect with struct binding generates correct pointer types.

### 4. Left-click context menus on interactive items (fixed)
`<Button /><ContextMenu mouseButton="left">` now works. The renderer manually detects left-click via `IsItemHovered` + `IsMouseReleased` and calls `OpenPopup` before `BeginPopupContextItem`, bypassing the click consumption issue with interactive items.

### 5. Non-root component imports (fixed)
Components with inline props that import other components now correctly include `#include` directives for imported component headers. Previously only the named-interface and no-props code paths included imports.
