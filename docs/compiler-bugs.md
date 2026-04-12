# Compiler Bugs

Active open regressions are tracked in [compiler-flaws.md](compiler-flaws.md). Fixed issues remain below for reference.

## Fixed (kept for reference)

### 1. Literal-only ternary string props no longer emit invalid `.c_str()` (fixed)
String-valued props such as `<Button title={props.showTerminalWindow ? "Hide Terminal" : "Show Terminal"} />` now preserve literal-only ternary expressions as `const char*` without appending `.c_str()` to one branch. Previously the emitter treated any non-literal-looking expression as `std::string` and could generate invalid C++ like `"Show Terminal".c_str()`.

### 2. Dynamic `disabled` expressions on `Button` (fixed)
Button codegen now preserves expression-based disabled state such as `disabled={!props.canSend}` and passes the lowered boolean through to `imx::renderer::button(...)`. Previously only the literal string `'true'` was recognized, so dynamic disabled expressions were silently dropped and buttons stayed interactive.

### 3. `<ID scope={stringExpr}>` now emits string `PushID` correctly (fixed)
String scopes such as `<ID scope={props.playerId}>` now lower to the string `ImGui::PushID` overload instead of being forced through `static_cast<int>(...)`. Mixed string/number ternaries used as scopes are normalized to a string form, so loop IDs like `project.id.length > 0 ? project.id : index` compile correctly and preserve stable entity IDs.

### 4. String concatenation inside `<Text>{...}</Text>` (fixed)
String-producing expressions such as `<Text>{"Latest turn " + props.count}</Text>` now generate valid C++ with a single `.c_str()` applied to the full `std::string` expression. Previously the compiler could emit `(...).c_str().c_str()` or bind `.c_str()` to only the right-hand operand, producing invalid code on MSVC.

### 5. Numeric text interpolation in child components (fixed)
`<Text>Count: {props.data.count}</Text>` in child components now correctly uses `%g` format with `(double)` cast for numeric types, matching root component behavior. `inferExprType` resolves nested struct field types through external interfaces.

### 6. Individual scalar props preserve C++ type info (fixed)
`<MyComponent speed={props.speed} />` where `speed` is `float` in C++ now correctly generates `float* speed` in the child's Props struct. The compiler resolves actual C++ types from the parent's external interface definition.

### 7. MultiSelect bound prop detection (fixed)
`detectBoundProps` now scans all expression strings (callbacks, conditions, selections) for `props.X.Y` / `props.X[N]` patterns, not just `directBind` widgets. MultiSelect with struct binding generates correct pointer types.

### 8. Left-click context menus on interactive items (fixed)
`<Button /><ContextMenu mouseButton="left">` now works. The renderer manually detects left-click via `IsItemHovered` + `IsMouseReleased` and calls `OpenPopup` before `BeginPopupContextItem`, bypassing the click consumption issue with interactive items.

### 9. Non-root component imports (fixed)
Components with inline props that import other components now correctly include `#include` directives for imported component headers. Previously only the named-interface and no-props code paths included imports.
