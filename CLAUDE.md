# IMX - Development Notes

## What this is
React-Native-like authoring model for Dear ImGui. Write .tsx, compile to native C++ ImGui app. No JS runtime in shipped binary.

## Pipeline
`.tsx` -> TypeScript compiler (`compiler/`) -> `.gen.cpp` + `.gen.h` -> links with `imx_runtime` + `imx_renderer` + ImGui -> native binary

## Build
- C++20, Visual Studio 17 2022 generator (not Ninja — Ninja not in PATH on this machine)
- `cmake -B build && cmake --build build --target hello_app`
- Compiler: `cd compiler && npm run build` (must do before C++ build if compiler changed)
- Tests: `cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe`
- Compiler tests: `cd compiler && npx vitest run`
- Delete `build/Debug/imgui.ini` if the app freezes on startup (stale IDs cause bloated ini)

## Key architecture decisions
- State identity: compiler-assigned slot indices (not call-order like React)
- Instance identity: hybrid positional + key-based
- Layout: BeginGroup + layout stack (not BeginChild) — before_child() handles SameLine for Row, gap for Column, TableNextColumn for TableRow
- Callbacks: stored std::function for future-proofing, but MVP inlines into if-blocks for immediate widgets
- TextInput: runtime-owned persistent buffers, sync each frame
- ImGui ID scoping: begin_instance/end_instance calls PushID/PopID (guarded by GetCurrentContext for tests)
- Per-frame counters (g_table_id, g_tabbar_id) reset in begin_dockspace()

## MSVC gotchas
- No designated initializers (`{.gap = 8}`) — use variable assignment
- Custom component props use variable-based assignment, not aggregate init
- Float literals need explicit suffix or `.0F` for Style struct members
- `std::string` state needs `std::string()` wrapper in use_state initial value

## Compiler gotchas
- `exprToCpp` must handle ConditionalExpression (ternary) — was missing, caused bugs
- String props passed to const char* renderer functions need `.c_str()` — `asCharPtr()` helper handles this
- String literal ternaries (`cond ? "A" : "B"`) are already const char* — skip .c_str()
- TypeScript 5.9 normalizes `5.0` to `"5"` in AST .text — use .getText() for float detection
- `export` keyword on component functions is needed for TS imports but ignored by compiler
- Array literal `[1.0, 0.5]` in exprToCpp joins elements with commas

## File structure
- `include/imx/` — public C++ headers (runtime.h, renderer.h)
- `runtime/` — C++ runtime (state, instances, lifecycle)
- `renderer/` — C++ renderer (ImGui host components, layout stack, style)
- `compiler/src/` — TypeScript compiler (parser, validator, ir, lowering, emitter, index)
- `examples/hello/` — main example app with TodoItem custom component
- `examples/settings/` — LLM-generated settings panel (validates API surface)
- `docs/` — spec, mvp, roadmap, api-reference, quick-start, llm-prompt-reference

## Do's and Don'ts

### Do
- Read this file and `docs/spec.md` before making changes
- Run `npm run build` in `compiler/` after any TypeScript changes
- Run both test suites (C++ and TS) before committing
- Delete `build/Debug/imgui.ini` if the app behaves strangely on startup
- Use variable-based style assignment for MSVC compatibility (no designated initializers)
- Add `asCharPtr()` when passing string expressions to renderer functions expecting `const char*`
- Add new components to ALL layers: components.ts -> ir.ts -> lowering.ts -> emitter.ts -> renderer.h -> components.cpp
- Reset per-frame ID counters in `begin_dockspace()` when adding new auto-ID widgets

### Don't
- Don't use Ninja generator — it's not in PATH, use Visual Studio 17 2022
- Don't use designated initializers in generated C++ (`{.field = val}`) — MSVC doesn't fully support them
- Don't add `.c_str()` to string literals or ternaries of string literals — they're already `const char*`
- Don't couple `imx_runtime` to `imgui_lib` more than necessary (render_context.cpp includes imgui.h only for PushID/PopID)
- Don't make runtime_tests depend on imgui_lib — guard ImGui calls with `GetCurrentContext() != nullptr`
- Don't forget that TypeScript 5.9 normalizes float literals in AST (use `.getText()` not `.text` for float detection)
- Don't touch unrelated files when fixing a bug — fix exactly what's broken

## Current status (Phases 1-8 complete)
- 27 host components working
- Multi-component support with imports, props, callbacks
- TypeScript type definitions for IDE support
- API documentation complete
- Two example apps (hello + settings)
- Next: packaging for distribution (FetchContent + npm)
