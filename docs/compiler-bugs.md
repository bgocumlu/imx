# Compiler Bugs

Active open regressions are tracked in [compiler-flaws.md](compiler-flaws.md). Fixed issues remain below for reference.

## Fixed (kept for reference)

### 1. `<ID scope={stringExpr}>` now emits string `PushID` correctly (fixed)
String scopes such as `<ID scope={props.playerId}>` now lower to the string `ImGui::PushID` overload instead of being forced through `static_cast<int>(...)`. Mixed string/number ternaries used as scopes are normalized to a string form, so loop IDs like `project.id.length > 0 ? project.id : index` compile correctly and preserve stable entity IDs.

### 2. String concatenation inside `<Text>{...}</Text>` (fixed)
String-producing expressions such as `<Text>{"Latest turn " + props.count}</Text>` now generate valid C++ with a single `.c_str()` applied to the full `std::string` expression. Previously the compiler could emit `(...).c_str().c_str()` or bind `.c_str()` to only the right-hand operand, producing invalid code on MSVC.

### 3. Numeric text interpolation in child components (fixed)
`<Text>Count: {props.data.count}</Text>` in child components now correctly uses `%g` format with `(double)` cast for numeric types, matching root component behavior. `inferExprType` resolves nested struct field types through external interfaces.

### 4. Individual scalar props preserve C++ type info (fixed)
`<MyComponent speed={props.speed} />` where `speed` is `float` in C++ now correctly generates `float* speed` in the child's Props struct. The compiler resolves actual C++ types from the parent's external interface definition.

### 5. MultiSelect bound prop detection (fixed)
`detectBoundProps` now scans all expression strings (callbacks, conditions, selections) for `props.X.Y` / `props.X[N]` patterns, not just `directBind` widgets. MultiSelect with struct binding generates correct pointer types.

### 6. Left-click context menus on interactive items (fixed)
`<Button /><ContextMenu mouseButton="left">` now works. The renderer manually detects left-click via `IsItemHovered` + `IsMouseReleased` and calls `OpenPopup` before `BeginPopupContextItem`, bypassing the click consumption issue with interactive items.

### 7. Non-root component imports (fixed)
Components with inline props that import other components now correctly include `#include` directives for imported component headers. Previously only the named-interface and no-props code paths included imports.
