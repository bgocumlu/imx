# Font Embed from TSX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable `<Font name="mono" src="JetBrainsMono.ttf" size={15} embed>` in TSX — compiler generates embed headers and font loading code, eliminating manual C++ font loading.

**Architecture:** Font props (`src`, `size`, `embed`) are added to the Font component. The compiler collects font declarations from IR, generates `.embed.h` byte arrays (same as images), and emits a `_imx_load_fonts()` function in `app_root.gen.cpp`. The render_root function auto-calls it on first frame. No renderer changes needed.

**Tech Stack:** TypeScript (compiler), C++20 (generated code), CMake

---

### Task 1: Add Font props to compiler

**Files:**
- Modify: `compiler/src/components.ts:709-714`

- [ ] **Step 1: Update Font component definition**

In `compiler/src/components.ts`, replace the Font definition (lines 709-714):

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

- [ ] **Step 2: Build compiler**

```bash
cd compiler && npm run build && cd ..
```

- [ ] **Step 3: Commit**

```bash
git add compiler/src/components.ts
git commit -m "feat: add src, size, embed props to Font component"
```

---

### Task 2: Font collection and embed header generation

**Files:**
- Modify: `compiler/src/compile.ts:239-292` area (add font collection + embed generation)

This task adds two functions to compile.ts (mirroring `collectEmbedImages` and `generateEmbedHeaders`) and wires them into the compilation flow.

- [ ] **Step 1: Add FontDeclaration type and collectFontDeclarations function**

In `compiler/src/compile.ts`, after the `generateEmbedHeaders` function (around line 292), add:

```typescript
interface FontDeclaration {
    name: string;       // e.g. "jetbrains-mono"
    src: string;        // e.g. "JetBrainsMono-Regular.ttf"
    size: string;       // e.g. "15.0f"
    embed: boolean;
    embedKey?: string;  // e.g. "JetBrainsMono_Regular_ttf"
}

function collectFontDeclarations(nodes: IRNode[]): FontDeclaration[] {
    const fonts: FontDeclaration[] = [];
    for (const node of nodes) {
        if (node.kind === 'begin_container' && node.tag === 'Font' && node.props['src']) {
            const name = (node.props['name'] ?? '').replace(/^"|"$/g, '');
            const src = (node.props['src'] ?? '').replace(/^"|"$/g, '');
            const size = node.props['size'] ?? '16.0f';
            const embed = node.props['embed'] === 'true';
            let embedKey: string | undefined;
            if (embed) {
                embedKey = src.replace(/[^a-zA-Z0-9]/g, '_');
            }
            fonts.push({ name, src, size, embed, embedKey });
        } else if (node.kind === 'conditional') {
            fonts.push(...collectFontDeclarations(node.body));
            if (node.elseBody) fonts.push(...collectFontDeclarations(node.elseBody));
        } else if (node.kind === 'list_map') {
            fonts.push(...collectFontDeclarations(node.body));
        }
    }
    return fonts;
}

function deduplicateFonts(fonts: FontDeclaration[]): FontDeclaration[] {
    const seen = new Map<string, FontDeclaration>();
    for (const f of fonts) {
        if (seen.has(f.name)) {
            const existing = seen.get(f.name)!;
            if (existing.src !== f.src) {
                console.error(`  error: font "${f.name}" declared with different sources: "${existing.src}" vs "${f.src}"`);
            }
            continue;
        }
        seen.set(f.name, f);
    }
    return Array.from(seen.values());
}

function generateFontEmbedHeaders(fonts: FontDeclaration[], sourceDir: string, outputDir: string): void {
    for (const font of fonts) {
        if (!font.embed || !font.embedKey) continue;

        const fontPath = path.resolve(sourceDir, font.src);
        const headerPath = path.join(outputDir, `${font.embedKey}.embed.h`);

        // Mtime caching: skip if header exists and is newer than font file
        if (fs.existsSync(headerPath) && fs.existsSync(fontPath)) {
            const fontStat = fs.statSync(fontPath);
            const hdrStat = fs.statSync(headerPath);
            if (hdrStat.mtimeMs >= fontStat.mtimeMs) {
                continue;
            }
        }

        if (!fs.existsSync(fontPath)) {
            // Try public/ subdirectory
            const publicPath = path.resolve(sourceDir, 'public', font.src);
            if (!fs.existsSync(publicPath)) {
                console.warn(`  warning: embedded font not found: ${fontPath} (also tried public/)`);
                continue;
            }
            // Use the public/ path
            const fontData = fs.readFileSync(publicPath);
            writeFontEmbedHeader(fontData, font, headerPath);
            continue;
        }

        const fontData = fs.readFileSync(fontPath);
        writeFontEmbedHeader(fontData, font, headerPath);
    }
}

function writeFontEmbedHeader(data: Buffer, font: FontDeclaration, headerPath: string): void {
    const bytes = Array.from(data)
        .map(b => `0x${b.toString(16).padStart(2, '0')}`)
        .join(', ');
    const header = [
        `// Generated from ${font.src} by imxc`,
        `#pragma once`,
        `static const unsigned char ${font.embedKey}_data[] = { ${bytes} };`,
        `static const unsigned int ${font.embedKey}_size = ${data.length};`,
        '',
    ].join('\n');
    fs.writeFileSync(headerPath, header);
    console.log(`  ${font.src} -> ${headerPath} (font embed)`);
}
```

- [ ] **Step 2: Wire font collection into compilation flow**

In the main `compile` function, after the embed image generation block (around line 149), add font collection. Also collect fonts globally across all components:

Find the block around lines 144-149:
```typescript
// Generate embed headers for any <Image embed> nodes
const embedImages = collectEmbedImages(comp.ir.body);
if (embedImages.length > 0) {
    const sourceDir = path.dirname(path.resolve(comp.sourcePath));
    generateEmbedHeaders(embedImages, sourceDir, outputDir);
}
```

After this block, and outside the per-component loop, we need to collect fonts globally. Find where `app_root.gen.cpp` is generated (around line 161). Before that, add:

```typescript
// Collect font declarations from ALL components
const allFontDeclarations: FontDeclaration[] = [];
for (const comp of compiled) {
    allFontDeclarations.push(...collectFontDeclarations(comp.ir.body));
}
const fontDeclarations = deduplicateFonts(allFontDeclarations);

// Generate embed headers for fonts
if (fontDeclarations.some(f => f.embed)) {
    const sourceDir = path.dirname(path.resolve(compiled[0].sourcePath));
    generateFontEmbedHeaders(fontDeclarations, sourceDir, outputDir);
}
```

Then pass `fontDeclarations` to `emitRoot` (will be added in Task 3). Update the `emitRoot` call (around line 168):

```typescript
const rootOutput = emitRoot(root.name, root.stateCount, root.bufferCount, root.sourceFile, propsType, isNamedPropsType, fontDeclarations);
```

- [ ] **Step 3: Export FontDeclaration type**

Add the export to `FontDeclaration` so emitter.ts can import it:

```typescript
export interface FontDeclaration {
    name: string;
    src: string;
    size: string;
    embed: boolean;
    embedKey?: string;
}
```

- [ ] **Step 4: Note — do not build yet**

compile.ts now passes `fontDeclarations` to `emitRoot`, but emitter.ts doesn't accept it yet. Complete Task 3 before building. Tasks 2 and 3 are committed together after Task 3.

---

### Task 3: Generate _imx_load_fonts() in app_root.gen.cpp

**Files:**
- Modify: `compiler/src/emitter.ts:349-402` (emitRoot function)

- [ ] **Step 1: Import FontDeclaration**

At the top of `compiler/src/emitter.ts`, add to the imports from `./compile.js`:

```typescript
import type { FontDeclaration } from './compile.js';
```

If compile.ts doesn't export the type yet, this import will resolve once Task 2's export is in place.

- [ ] **Step 2: Update emitRoot signature and generate _imx_load_fonts()**

In `compiler/src/emitter.ts`, update the `emitRoot` function (line 349). Add `fontDeclarations` parameter and generate the font loading function:

Change the signature from:
```typescript
export function emitRoot(rootName: string, stateCount: number, bufferCount: number, sourceFile?: string, propsType?: string, namedPropsType?: boolean): string {
```
To:
```typescript
export function emitRoot(rootName: string, stateCount: number, bufferCount: number, sourceFile?: string, propsType?: string, namedPropsType?: boolean, fontDeclarations?: FontDeclaration[]): string {
```

After the initial `#include` directives (around line 354, after `lines.push('#include <imx/runtime.h>');`), add font embed includes and the init function:

```typescript
    // Font embed includes and init function
    const fonts = fontDeclarations ?? [];
    if (fonts.length > 0) {
        lines.push('#include <imx/renderer.h>');
        for (const f of fonts) {
            if (f.embed && f.embedKey) {
                lines.push(`#include "${f.embedKey}.embed.h"`);
            }
        }
        lines.push('');
        lines.push('void _imx_load_fonts() {');
        lines.push(`${INDENT}static bool done = false;`);
        lines.push(`${INDENT}if (done) return;`);
        lines.push(`${INDENT}done = true;`);
        for (const f of fonts) {
            if (f.embed && f.embedKey) {
                lines.push(`${INDENT}imx::load_font_embedded("${f.name}", ${f.embedKey}_data, ${f.embedKey}_size, ${f.size});`);
            } else {
                lines.push(`${INDENT}imx::load_font("${f.name}", "${f.src}", ${f.size});`);
            }
        }
        lines.push('}');
        lines.push('');
    }
```

- [ ] **Step 3: Add auto-init call in render_root**

Inside the `emitRoot` function, find where the render body is generated. There are two paths — with propsType and without. In both paths, add `_imx_load_fonts()` call after `begin_frame`:

For the propsType path (around line 380), find:
```typescript
        lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
```

Add right after it:
```typescript
        if (fonts.length > 0) {
            lines.push(`${INDENT}_imx_load_fonts();`);
        }
```

Do the same for the no-propsType path (around line 393), find the same `begin_frame` line and add the `_imx_load_fonts()` call after it.

- [ ] **Step 4: Build compiler**

```bash
cd compiler && npm run build && cd ..
```

Should compile cleanly now (both compile.ts and emitter.ts changes are in).

- [ ] **Step 5: Run compiler tests**

```bash
cd compiler && npx vitest run && cd ..
```

Some tests may need updating if they test `emitRoot` output. Fix any failures.

- [ ] **Step 6: Commit Tasks 2 + 3 together**

```bash
git add compiler/src/compile.ts compiler/src/emitter.ts
git commit -m "feat: font embed — collection, header generation, and _imx_load_fonts() in app_root"
```

---

### Task 4: Test with hello example

**Files:**
- Modify: `examples/hello/App.tsx` (add src/size/embed to Font usages)
- Modify: `examples/hello/main.cpp` (remove manual load_font calls, add _imx_load_fonts)

- [ ] **Step 1: Update Font declarations in App.tsx**

In `examples/hello/App.tsx`, find all `<Font name="jetbrains-mono">` usages. Only the FIRST occurrence needs `src`/`size`/`embed`. Find the first one (around line 185 in the Phase 13 section):

```tsx
<Font name="jetbrains-mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
```

All other `<Font name="jetbrains-mono">` usages stay as-is (no src/size/embed — they just reference the already-declared font).

Also add a declaration for the Inter font. Find a good place early in the render tree (e.g., wrapping the DockSpace or at the top of a window). Since Inter is the default ImGui font and is used everywhere, add it at the top level. Before the `<MainMenuBar>`, add:

```tsx
<Font name="inter-ui" src="Inter-Regular.ttf" size={16} embed default>
```

Wait — we decided against the `default` prop. The first font loaded becomes default. So if inter-ui is declared first in TSX, it will be the first font loaded in `_imx_load_fonts()`, and ImGui makes the first font the default. Just make sure the Inter declaration appears before the JetBrains one in the TSX.

Actually, this is tricky. The `<Font>` container wraps children, so it can't just be a bare declaration. The Inter font would need to wrap something. The simplest approach: wrap the entire Theme/DockSpace in a Font container at the top level.

```tsx
return (
    <Font name="inter-ui" src="Inter-Regular.ttf" size={16} embed>
    <Theme preset="dark" ...>
    <MainMenuBar>
    ...
```

But this changes indentation of the entire file. A simpler approach: just accept that the first font in `_imx_load_fonts()` order depends on the order the compiler encounters Font declarations. The compiler processes the root file first, and within it encounters nodes top-to-bottom. So the first `<Font>` with `src` in App.tsx will be the first loaded.

Actually, the simplest correct approach: keep the JetBrains font in TSX and keep Inter loading in main.cpp (since Inter is the default/body font and benefits from explicit early loading). This is the "power user" pattern — use C++ for the default font, TSX for specialty fonts.

Let me simplify: just convert the JetBrains mono font to use TSX embed. Keep Inter in main.cpp.

Find the first `<Font name="jetbrains-mono">` (around line 185):
```tsx
<Font name="jetbrains-mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
```

All other `<Font name="jetbrains-mono">` remain unchanged.

- [ ] **Step 2: Update main.cpp**

In `examples/hello/main.cpp`, find the JetBrains font loading line (around line 129):
```cpp
imx::load_font("jetbrains-mono", "JetBrainsMono-Regular.ttf", 15.0f * dpi_scale, mono_font_options);
```

Remove this line. The Inter font loading stays:
```cpp
imx::load_font("inter-ui", "Inter-Regular.ttf", 16.0f * dpi_scale, ui_font_options);
```

Also add `_imx_load_fonts()` call before the main loop. Find the line just before the loop starts (search for `while (!glfwWindowShouldClose`). Add before it:

```cpp
// Load fonts declared in TSX (embedded and file-loaded)
extern void _imx_load_fonts();
_imx_load_fonts();
```

The `extern` declaration is needed because `_imx_load_fonts()` is defined in `app_root.gen.cpp`, not in a header.

- [ ] **Step 3: Build and test**

```bash
cd compiler && npm run build && cd ..
cmake --build build --target hello_app
```

Run `build/Debug/hello_app.exe`. Verify:
- JetBrains Mono font still works in Phase 13/14/etc. sections
- Inter font is still the default
- No font loading errors in console
- Delete `build/Debug/imgui.ini` if the app freezes

- [ ] **Step 4: Verify embed header was generated**

Check that the font embed header exists:
```bash
ls build/generated/JetBrainsMono_Regular_ttf.embed.h
```

It should exist and contain the byte array.

- [ ] **Step 5: Commit**

```bash
git add examples/hello/App.tsx examples/hello/main.cpp
git commit -m "feat: use Font embed from TSX for JetBrains Mono in hello example"
```

---

### Task 5: Type definitions and docs

**Files:**
- Modify: `compiler/src/init.ts` (IMX_DTS)
- Modify: `examples/hello/imx.d.ts`
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update FontProps in init.ts**

Find `interface FontProps` in the IMX_DTS string and update:

```typescript
interface FontProps { name: string; src?: string; size?: number; embed?: boolean; children?: any; }
```

- [ ] **Step 2: Update examples/hello/imx.d.ts**

Same change — find `interface FontProps` and update:

```typescript
interface FontProps { name: string; src?: string; size?: number; embed?: boolean; children?: any; }
```

- [ ] **Step 3: Update docs/api-reference.md**

Find the Font component section and update the props table:

```markdown
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | Font identifier |
| src | string | No | Path to .ttf file (relative to source dir or public/) |
| size | number | No | Font size in pixels (required when src is present) |
| embed | boolean | No | Bake font into binary at compile time |
| children | any | Yes | Content to render with this font |
```

Add usage examples:

```markdown
**Declare and use (embedded):**
```tsx
<Font name="mono" src="JetBrainsMono-Regular.ttf" size={15} embed>
  <Text>Monospace</Text>
</Font>
```

**Reuse (already declared):**
```tsx
<Font name="mono">
  <Text>Also monospace</Text>
</Font>
```

**File-loaded (not embedded):**
```tsx
<Font name="inter" src="Inter-Regular.ttf" size={16}>
  <Text>UI text</Text>
</Font>
```

The first `<Font>` with `src` declares the font. Subsequent uses of the same `name` just select it. The compiler generates `_imx_load_fonts()` which can be called explicitly in main.cpp before the render loop to avoid a one-frame fallback to the default font.
```

- [ ] **Step 4: Update docs/llm-prompt-reference.md**

Find the Font line and update:

```
Font: name(string, required) | src?(string) | size?(number) | embed?(boolean) | children — PushFont/PopFont; first occurrence with src declares the font (file or embedded), subsequent uses just select by name. Compiler generates _imx_load_fonts() for auto-loading.
```

- [ ] **Step 5: Update CLAUDE.md**

In the current status section, add:

```
- Font embed from TSX: `<Font name="mono" src="file.ttf" size={15} embed>` — compiler generates .embed.h and `_imx_load_fonts()` in app_root.gen.cpp. C++ `load_font()` / `load_font_embedded()` API unchanged.
```

- [ ] **Step 6: Commit**

```bash
git add compiler/src/init.ts examples/hello/imx.d.ts docs/api-reference.md docs/llm-prompt-reference.md CLAUDE.md
git commit -m "docs: add font embed documentation — types, api-reference, llm-reference, CLAUDE.md"
```

---

### Task 6: Build compiler/dist/ and final verification

**Files:**
- Modify: `compiler/dist/` (all generated JS files)

- [ ] **Step 1: Rebuild compiler dist**

```bash
cd compiler && npm run build && cd ..
```

- [ ] **Step 2: Run compiler tests**

```bash
cd compiler && npx vitest run && cd ..
```

Fix any test failures.

- [ ] **Step 3: Run C++ tests**

```bash
cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe
```

- [ ] **Step 4: Build and run hello app end-to-end**

```bash
cmake --build build --target hello_app
```

Run `build/Debug/hello_app.exe`. Delete `build/Debug/imgui.ini` first if needed. Verify JetBrains Mono works in all Font sections.

- [ ] **Step 5: Commit compiler/dist/**

```bash
git add compiler/dist/
git commit -m "build: update compiler/dist for font embed feature"
```
