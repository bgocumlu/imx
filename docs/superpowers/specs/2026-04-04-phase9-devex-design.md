# Phase 9: Developer Experience — Design Spec

## Goal

Improve iteration speed without breaking the native-first architecture. Three deliverables:

1. Source location comments in generated C++
2. Better error diagnostics with source context
3. Watch mode (`imxc watch <dir> -o <output-dir>`)

Exit criteria: debugging and iteration feel reasonable without a JS runtime.

---

## 1. Source Location Comments in Generated C++

### Problem

Generated `.gen.cpp` files have no trace back to the original `.tsx` source. When debugging C++ in Visual Studio or reading generated output, developers can't tell which TSX line produced which C++ block.

### Design

**IR change:** Add an optional `loc` field to all IR node types:

```typescript
interface SourceLoc {
    file: string;  // e.g. "App.tsx"
    line: number;  // 1-indexed
}
```

Every IR node type gets `loc?: SourceLoc`. During lowering, each node captures its source position from the TypeScript AST node via `sourceFile.getLineAndCharacterOfPosition(node.getStart())`.

**Emitter change:** Before emitting each node's C++ code, emit a comment if `loc` is present:

```cpp
// Generated from App.tsx by imxc
#include <imx/runtime.h>
#include <imx/renderer.h>

void App_render(imx::RenderContext& ctx) {
    auto count = ctx.use_state<int>(0, 0);

    // App.tsx:8 <Window>
    imx::renderer::begin_window("Hello");
    // App.tsx:9 <Text>
    imx::renderer::text("Count: %d", count.get());
    // App.tsx:10 <Button>
    if (imx::renderer::button("Increment")) {
        count.set(count.get() + 1);
    }
    imx::renderer::end_window();
}
```

Rules:
- Comments appear before `begin_*`, leaf nodes (`text`, `button`, etc.), and `custom_component` calls
- No comment for `end_*` nodes (they just close the block opened by `begin_*`)
- No comment for `separator` (too trivial)
- File-level banner: `// Generated from <filename> by imxc` at top of each `.gen.cpp`
- Root file (`app_root.gen.cpp`) also gets the banner

**What changes:**
- `ir.ts` — add `SourceLoc` type, add `loc?` to each IR node interface
- `lowering.ts` — capture `loc` from AST nodes when creating IR nodes
- `emitter.ts` — emit `// file:line <Tag>` comments before nodes, add file banner

---

## 2. Better Error Diagnostics

### Problem

Current errors are one-liners:
```
App.tsx:10:5 - error: Unknown component: <Slider>
```

No source context. Developer must open the file and find line 10 manually.

### Design

New diagnostic format:
```
App.tsx:10:5 - error: Unknown component: <Slider>

  10 |     <Slider value={x} />
     |     ^^^^^^^^^^^^^^^^^^^^^
```

**Implementation:** New `diagnostics.ts` module with:

```typescript
interface DiagnosticError {
    file: string;
    line: number;
    col: number;
    message: string;
}

function formatDiagnostic(error: DiagnosticError, source: string): string
```

The function:
1. Splits source by newlines, gets the error line (1-indexed)
2. Formats the line with line number and `|` gutter
3. Adds a `^` caret line underlining from the error column to end of non-whitespace content
4. Returns the formatted string

**Integration in `index.ts`:** The source text is already read via `readFileSync`. Pass it to `formatDiagnostic` when printing errors instead of the current `console.error` one-liner.

**What changes:**
- New file: `compiler/src/diagnostics.ts`
- `index.ts` — use `formatDiagnostic()` instead of inline error formatting

---

## 3. Watch Mode

### Problem

Current workflow: edit `.tsx` -> manually run `imxc` -> check output. Slow iteration.

### Design

New subcommand: `imxc watch <dir> -o <output-dir>`

**Behavior:**
1. On startup, discover all `.tsx` files in `<dir>` (recursive glob)
2. Run a full compilation pass (same as `imxc <files> -o <dir>`)
3. Start watching `<dir>` using `fs.watch` with `{ recursive: true }`
4. On `.tsx` file change, recompile all files (full rebuild for cross-component resolution correctness)
5. Debounce rapid changes with a 100ms timer
6. Print timing: `[watch] 3 component(s) compiled in 45ms`
7. On error, print diagnostics but keep watching
8. On Ctrl+C, print goodbye and exit cleanly

**File discovery:** Use `fs.readdirSync` recursive to find all `.tsx` files in the watched directory. Re-discover on each rebuild to pick up new files.

**No new dependencies.** `fs.watch` with `recursive: true` works on Windows and macOS. This is sufficient since the project targets Windows + VS2022.

**CLI parsing:** In `index.ts`, check `process.argv[2] === 'watch'` before the existing `parseArgs` call (same pattern as the existing `init` subcommand).

**What changes:**
- New file: `compiler/src/watch.ts` — watch loop, debouncing, file discovery
- `index.ts` — add `watch` subcommand dispatch
- Refactor: extract the compilation pipeline from `index.ts` into a `compile.ts` function so both the build command and watch mode can call it

---

## File Change Summary

| File | Change |
|------|--------|
| `ir.ts` | Add `SourceLoc` type, `loc?` on all IR node interfaces |
| `lowering.ts` | Capture source locations when creating IR nodes |
| `emitter.ts` | Emit source location comments, file banner |
| `diagnostics.ts` (new) | `formatDiagnostic()` for rich error output |
| `compile.ts` (new) | Extracted compilation pipeline function |
| `watch.ts` (new) | Watch mode loop with debouncing |
| `index.ts` | Use `formatDiagnostic`, dispatch `watch` subcommand, delegate to `compile()` |

## Testing

- **Emitter tests:** Verify generated C++ contains `// App.tsx:N` comments
- **Diagnostics tests:** Verify `formatDiagnostic` output format
- **Compiler tests:** Existing tests continue to pass (loc is optional, doesn't break existing assertions)
- **Watch mode:** Manual testing (interactive by nature)
