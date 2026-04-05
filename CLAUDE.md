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
- TextInput: runtime-owned persistent buffers, sync each frame. Supports struct binding (directBind syncs buffer to/from struct field)
- ImGui ID scoping: begin_instance/end_instance calls PushID/PopID (guarded by GetCurrentContext for tests)
- Per-frame counters (g_table_id, g_tabbar_id) reset in begin_dockspace()
- C++ struct binding: `value={props.field}` without onChange emits `&props.field` (direct pointer). Root receives mutable ref. Custom component bound props use `T*` in Props struct with `&expr` at call sites. Struct defined in user header (`AppState.h`), included by generated code.
- Adaptive frame loop: `request_frame()`, `needs_frame()`, `frame_rendered()` in Runtime. Idle at 10fps, active at 60fps on input/state change.
- Map loops use auto-generated `_map_idx_N` counters (user variable name is a scoped alias)

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
- `===` and `!==` must be mapped to `==` and `!=` in exprToCpp — JS strict equality is invalid C++
- Style prop `{{ width: 300, height: 100 }}` on self-closing components needs `buildStyleVar()` in emitter — raw JS object literals are invalid C++
- Modal `BeginPopupModal` returns false AND calls EndPopup internally when X is clicked — onClose check must be OUTSIDE the if(begin_modal) block
- Modal/popup overlays should NOT call `before_child()` — they don't participate in parent layout
- Docking chrome (resize handles, tab bars) reads from `ImGui::GetStyle().Colors[]` directly, not the PushStyleColor stack — set accent colors on both

## File structure
- `include/imx/` — public C++ headers (runtime.h, renderer.h)
- `runtime/` — C++ runtime (state, instances, lifecycle)
- `renderer/` — C++ renderer (ImGui host components, layout stack, style, texture loading)
- `renderer/stb_image.h` — vendored image decoder (PNG + JPEG)
- `renderer/texture.cpp` — Image component: file loading, embed loading, OpenGL texture cache
- `compiler/src/` — TypeScript compiler (parser, validator, ir, lowering, emitter, compile, init)
- `compiler/dist/` — compiled JS (committed to git so FetchContent works without npm)
- `cmake/ImxCompile.cmake` — CMake helper for compiling .tsx files
- `examples/hello/` — main example app with TodoItem, all Batch 1-5 components, Canvas, DragDrop, Image
- `examples/hello/public/` — static assets copied to exe directory at build time
- `docs/` — spec, mvp, roadmap, api-reference, quick-start, llm-prompt-reference
- `docs/superpowers/` — design specs and implementation plans for each phase

## Do's and Don'ts

### Do
- Read this file and `docs/spec.md` before making changes
- Run `npm run build` in `compiler/` after any TypeScript changes
- Run both test suites (C++ and TS) before committing
- Delete `build/Debug/imgui.ini` if the app behaves strangely on startup
- Use variable-based style assignment for MSVC compatibility (no designated initializers)
- Add `asCharPtr()` when passing string expressions to renderer functions expecting `const char*`
- Add new components to ALL layers: components.ts -> ir.ts -> lowering.ts -> emitter.ts -> renderer.h -> components.cpp -> imx.d.ts (init.ts + both examples)
- Reset per-frame ID counters in `begin_dockspace()` when adding new auto-ID widgets
- Use `buildStyleVar()` in emitter for self-closing components that accept style props
- Fix the root cause when generated C++ is invalid — the bug is in the compiler pipeline, not the example
- Put static assets in `public/` folder — CMake copies them to exe directory automatically
- Update `compiler/dist/` (commit it) after compiler changes so FetchContent users get the latest

### Don't
- Don't use Ninja generator — it's not in PATH, use Visual Studio 17 2022
- Don't use designated initializers in generated C++ (`{.field = val}`) — MSVC doesn't fully support them
- Don't add `.c_str()` to string literals or ternaries of string literals — they're already `const char*`
- Don't couple `imx_runtime` to `imgui_lib` more than necessary (render_context.cpp includes imgui.h only for PushID/PopID)
- Don't make runtime_tests depend on imgui_lib — guard ImGui calls with `GetCurrentContext() != nullptr`
- Don't forget that TypeScript 5.9 normalizes float literals in AST (use `.getText()` not `.text` for float detection)
- Don't touch unrelated files when fixing a bug — fix exactly what's broken
- Don't emit `===` or `!==` in generated C++ — map to `==` and `!=` in exprToCpp
- Don't pass raw JS object literals as style args — use `buildStyleVar()` to generate imx::Style
- Don't call `before_child()` in modal/popup begin functions — overlays don't participate in layout
- Don't work around compiler bugs by modifying example code — fix the pipeline

## Current status (Phases 1-12 complete)
- 54 host components covering all ImGui widgets
- C++ struct binding (Phase 11): direct pointer binding for props without onChange, template render_root overload
- Struct binding fixes (Phase 12): TextInput struct binding, custom component pointer propagation, DragDrop typed payloads, auto-generated map indices
- Adaptive frame loop: runtime-driven idle/active rendering (request_frame API)
- 5-prop theme system: accentColor, backgroundColor, textColor, borderColor, surfaceColor → all 55 ImGui color slots
- Image component: runtime file loading + compile-time embed (stb_image + OpenGL texture cache)
- Custom widgets: `imx::register_widget()` + `WidgetArgs` for C++ ImGui widgets from TSX
- Custom themes: `imx::register_theme()` for user theme presets
- Canvas drawing: DrawLine, DrawRect, DrawCircle, DrawText with relative coordinates
- DragDrop: DragDropSource/DragDropTarget with typed payloads
- Style overrides: StyleColor (20 color props), StyleVar (11 style vars)
- Multi-component support with imports, props, callbacks
- TypeScript type definitions for IDE support
- CLI: `imxc init` (full scaffold + .gitignore), `imxc add` (existing project), `imxc watch` (file watcher)
- API documentation + LLM prompt reference complete
- Packaging: `imxc@0.5.4` on npm, FetchContent for C++ (compiler/dist/ committed)
- Release builds hide console on Windows (WIN32_EXECUTABLE), Debug shows it
- Next: Phase 13 candidates (GPA example, useEffect, more examples)
