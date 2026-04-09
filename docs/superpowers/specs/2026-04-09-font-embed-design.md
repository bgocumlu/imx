# Font Embed from TSX — Design Spec

## Philosophy

IMX is a **UI layer for C++ applications**. TSX describes the UI; C++ owns the data, configuration, and lifecycle. TSX conveniences like font embedding generate the same C++ calls a developer would write by hand — they reduce boilerplate, not replace C++.

The C++ API (`load_font`, `load_font_embedded`, `set_default_font`) is always the authority. TSX font declarations are sugar for the common case.

## Problem

Currently, fonts must be loaded manually in C++ main.cpp:

```cpp
imx::load_font("inter-ui", "Inter-Regular.ttf", 16.0f, options);
imx::load_font("jetbrains-mono", "JetBrainsMono-Regular.ttf", 15.0f);
```

And for embedded fonts, the user must manually convert .ttf to a C byte array and call `load_font_embedded`. This is tedious and creates boilerplate that every IMX app repeats.

Meanwhile, images already have a clean TSX-level embed pattern: `<Image src="photo.jpg" embed />` — the compiler handles everything.

## Solution

Extend `<Font>` with `src`, `size`, and `embed` props. The compiler generates font loading code automatically, following the same pattern as image embedding.

## New Props on `<Font>`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Font identifier (existing) |
| src | string | No | Path to .ttf file (relative to source dir) |
| size | number | No | Font size in pixels (required when `src` is present) |
| embed | boolean | No | Bake font into binary (opt-in, like Image) |

### Usage Patterns

```tsx
// Declare + use — embed font into binary
<Font name="mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
  <Text>Monospace text</Text>
</Font>

// Reuse — no src needed, already declared above
<Font name="mono">
  <Text>Also monospace</Text>
</Font>

// File-loaded — .ttf ships alongside exe in public/
<Font name="inter" src="Inter-Regular.ttf" size={16}>
  <Text>UI text</Text>
</Font>
```

### Behavior Rules

- `<Font name="...">` without `src` — existing behavior, just PushFont/PopFont. No loading.
- `<Font name="..." src="..." size={N}>` — declares a font to load from file at runtime.
- `<Font name="..." src="..." size={N} embed>` — declares a font to embed into binary.
- First occurrence with `src` declares the font. Subsequent uses of the same `name` are just PushFont.
- Compiler deduplicates by `name` — same name with different `src` is a compile error.
- `size` is required when `src` is present (compile error if missing).

## Compiler Pipeline

### 1. Component definition (components.ts)

Add `src`, `size`, `embed` props to Font:

```typescript
Font: {
    props: {
        name: { type: 'string', required: true },
        src: { type: 'string', required: false },
        size: { type: 'number', required: false },
        embed: { type: 'boolean', required: false },
    },
    hasChildren: true, isContainer: true,
},
```

### 2. IR (ir.ts)

Update `IRBeginContainer` props to carry font loading info through the pipeline. No new IR node needed — the `Font` container tag already exists, and `src`/`size`/`embed` pass through as props.

### 3. Font collection (compile.ts)

After lowering all TSX files, scan IR for all `Font` containers with `src` prop. Collect unique font declarations:

```typescript
interface FontDeclaration {
    name: string;       // e.g. "jetbrains-mono"
    src: string;        // e.g. "JetBrainsMono-Regular.ttf"
    size: string;       // e.g. "15.0f"
    embed: boolean;
    embedKey?: string;  // e.g. "JetBrainsMono_Regular_ttf"
}
```

Deduplicate by name. Error if same name has different src.

### 4. Embed header generation (compile.ts)

For fonts with `embed: true`, generate `.embed.h` files — same pattern as image embedding:

```cpp
// Generated from JetBrainsMono-Regular.ttf by imxc
#pragma once
static const unsigned char JetBrainsMono_Regular_ttf_data[] = { 0x00, 0x01, 0x00, 0x00, ... };
static const unsigned int JetBrainsMono_Regular_ttf_size = 234567;
```

Uses the same byte-array generation and mtime caching as `generateEmbedHeaders` for images.

### 5. Font init function generation (emitter.ts)

Generate `_imx_load_fonts()` in `app_root.gen.cpp`:

```cpp
#include "JetBrainsMono_Regular_ttf.embed.h"  // if embed

void _imx_load_fonts() {
    static bool done = false;
    if (done) return;
    done = true;
    imx::load_font_embedded("jetbrains-mono", JetBrainsMono_Regular_ttf_data, JetBrainsMono_Regular_ttf_size, 15.0f);
    imx::load_font("inter-ui", "Inter-Regular.ttf", 16.0f);
}
```

### 6. Auto-init in render function

The generated root render function calls `_imx_load_fonts()` at the top:

```cpp
void render_App(imx::Runtime& rt, AppState& state) {
    _imx_load_fonts();  // idempotent — static bool guard inside
    // ... rest of render
}
```

This is the fallback for users who don't call it explicitly. There may be a one-frame flicker where the default ImGui font shows before the atlas rebuilds.

### 7. Explicit early init (recommended)

Power users call `_imx_load_fonts()` in main.cpp before the render loop to avoid flicker:

```cpp
// After ImGui init, before main loop:
_imx_load_fonts();
ImGui::GetIO().Fonts->Build();  // optional — forces atlas rebuild immediately
```

All example apps use this approach.

## Emitter Changes

The `Font` container emitter currently emits `begin_font(name)` / `end_font()`. This stays the same — the loading is handled by `_imx_load_fonts()`, not by the container begin/end. The `src`/`size`/`embed` props are consumed by the font collection pass, not by the container emitter.

## Renderer Changes

None. The existing `load_font()`, `load_font_embedded()`, `begin_font()`, `end_font()` functions are unchanged. The generated code calls them directly.

## Validation

Compiler should validate:
- `size` is present when `src` is present (error otherwise)
- Same `name` is not declared with different `src` values across files
- `embed` without `src` is a warning (no-op)

## Scope

**What changes:**
- `compiler/src/components.ts` — Font props
- `compiler/src/compile.ts` — font collection + embed header generation (extends existing image pattern)
- `compiler/src/emitter.ts` — `_imx_load_fonts()` generation + include directives
- Example main.cpp files — add `_imx_load_fonts()` call

**What doesn't change:**
- `compiler/src/ir.ts` — Font container props already pass through
- `compiler/src/lowering.ts` — props pass through as container props
- `include/imx/renderer.h` — existing API unchanged
- `renderer/components.cpp` — existing implementation unchanged

## Size Impact

~0 KB when no fonts use `embed`. Embedded fonts add their .ttf file size to the binary (typically 50-200KB per font).
