# Image Component Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `<Image>` component with runtime file loading and compile-time embed modes, backed by stb_image and OpenGL texture caching.

**Architecture:** The renderer gets a new `texture.cpp` with stb_image for decoding and OpenGL for GPU upload, plus a string-keyed texture cache. The compiler handles two modes: non-embed emits `image(path, w, h)`, embed reads the image at compile time, generates a `.embed.h` byte array (with mtime caching), and emits `image_embedded(key, data, size, w, h)`.

**Tech Stack:** C++20 (MSVC), TypeScript, stb_image (vendored), OpenGL, Dear ImGui

---

## File Structure

| File | Responsibility |
|------|---------------|
| `renderer/stb_image.h` | **Create** — vendored stb_image single-header library |
| `renderer/texture.cpp` | **Create** — texture loading, caching, image/image_embedded functions |
| `include/imx/renderer.h` | Modify — add image/image_embedded declarations |
| `CMakeLists.txt` | Modify — add texture.cpp to imx_renderer sources |
| `compiler/src/components.ts` | Modify — add Image component definition |
| `compiler/src/ir.ts` | Modify — add IRImage node + union |
| `compiler/src/lowering.ts` | Modify — add Image lowering |
| `compiler/src/emitter.ts` | Modify — add Image emission |
| `compiler/src/compile.ts` | Modify — add embed header generation with mtime caching |
| `compiler/src/init.ts` | Modify — add .d.ts type |
| `compiler/tests/emitter.test.ts` | Modify — add emission tests |
| `docs/api-reference.md` | Modify — add Image docs |
| `docs/llm-prompt-reference.md` | Modify — add Image examples |

---

### Task 1: Vendor stb_image and Create Texture Module

**Files:**
- Create: `renderer/stb_image.h`
- Create: `renderer/texture.cpp`
- Modify: `include/imx/renderer.h`
- Modify: `CMakeLists.txt`

- [ ] **Step 1: Download stb_image.h**

Download `stb_image.h` from the official stb repository and place it at `renderer/stb_image.h`. This is a single public-domain header (~7800 lines). You can download it with:

```bash
curl -L https://raw.githubusercontent.com/nothings/stb/master/stb_image.h -o renderer/stb_image.h
```

- [ ] **Step 2: Add renderer declarations to renderer.h**

In `include/imx/renderer.h`, add these declarations inside `namespace imx::renderer` (before `void begin_theme`):

```cpp
void image(const char* path, float width = 0, float height = 0);
void image_embedded(const char* key, const unsigned char* data, unsigned int size, float width = 0, float height = 0);
```

- [ ] **Step 3: Create texture.cpp**

Create `renderer/texture.cpp`:

```cpp
#define STBI_ONLY_JPEG
#define STBI_ONLY_PNG
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#include <imx/renderer.h>
#include <GLFW/glfw3.h>
#include <unordered_map>
#include <string>

namespace imx::renderer {

static std::unordered_map<std::string, GLuint> g_texture_cache;
static std::unordered_map<std::string, int> g_texture_widths;
static std::unordered_map<std::string, int> g_texture_heights;

static GLuint upload_texture(unsigned char* pixels, int w, int h) {
    GLuint tex = 0;
    glGenTextures(1, &tex);
    glBindTexture(GL_TEXTURE_2D, tex);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, w, h, 0, GL_RGBA, GL_UNSIGNED_BYTE, pixels);
    return tex;
}

static GLuint ensure_texture_from_file(const char* path) {
    auto it = g_texture_cache.find(path);
    if (it != g_texture_cache.end()) return it->second;

    int w = 0, h = 0, channels = 0;
    unsigned char* pixels = stbi_load(path, &w, &h, &channels, 4);
    if (!pixels) return 0;

    GLuint tex = upload_texture(pixels, w, h);
    stbi_image_free(pixels);

    g_texture_cache[path] = tex;
    g_texture_widths[path] = w;
    g_texture_heights[path] = h;
    return tex;
}

static GLuint ensure_texture_from_memory(const char* key, const unsigned char* data, unsigned int size) {
    auto it = g_texture_cache.find(key);
    if (it != g_texture_cache.end()) return it->second;

    int w = 0, h = 0, channels = 0;
    unsigned char* pixels = stbi_load_from_memory(data, static_cast<int>(size), &w, &h, &channels, 4);
    if (!pixels) return 0;

    GLuint tex = upload_texture(pixels, w, h);
    stbi_image_free(pixels);

    g_texture_cache[key] = tex;
    g_texture_widths[key] = w;
    g_texture_heights[key] = h;
    return tex;
}

void image(const char* path, float width, float height) {
    before_child();
    GLuint tex = ensure_texture_from_file(path);
    if (tex == 0) return;
    float w = width > 0 ? width : static_cast<float>(g_texture_widths[path]);
    float h = height > 0 ? height : static_cast<float>(g_texture_heights[path]);
    ImGui::Image(static_cast<ImTextureID>(static_cast<intptr_t>(tex)), ImVec2(w, h));
}

void image_embedded(const char* key, const unsigned char* data, unsigned int size, float width, float height) {
    before_child();
    GLuint tex = ensure_texture_from_memory(key, data, size);
    if (tex == 0) return;
    float w = width > 0 ? width : static_cast<float>(g_texture_widths[key]);
    float h = height > 0 ? height : static_cast<float>(g_texture_heights[key]);
    ImGui::Image(static_cast<ImTextureID>(static_cast<intptr_t>(tex)), ImVec2(w, h));
}

} // namespace imx::renderer
```

Note: `ImGui::Image` in imgui v1.92+ uses `ImTextureRef` which accepts `ImTextureID`. The cast `static_cast<ImTextureID>(static_cast<intptr_t>(tex))` converts the GLuint to the opaque texture ID. If the imgui version uses a different signature, check `imgui.h` and adjust the cast accordingly — the key is converting a GLuint to whatever `ImGui::Image` expects as its first argument.

- [ ] **Step 4: Add texture.cpp to CMakeLists.txt**

Change the `imx_renderer` library sources from:

```cmake
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
    renderer/widget_args.cpp
)
```

to:

```cmake
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
    renderer/widget_args.cpp
    renderer/texture.cpp
)
```

- [ ] **Step 5: Build to verify compilation**

```bash
cmake -B build -G "Visual Studio 17 2022" && cmake --build build --target imx_renderer
```

Expected: Build succeeds. stb_image compiles, texture functions link.

Note: If there are issues with the `ImTextureID` cast (imgui v1.92+ changed `ImTextureID` to `ImTextureRef`), check the exact imgui API in `build/_deps/imgui-src/imgui.h` for the `Image()` signature and adjust the cast. The GLuint needs to become whatever type `ImGui::Image` expects as its first parameter.

- [ ] **Step 6: Commit**

```bash
git add renderer/stb_image.h renderer/texture.cpp include/imx/renderer.h CMakeLists.txt
git commit -m "feat: add texture loading module with stb_image"
```

---

### Task 2: Compiler — Image Component (Non-Embed Mode)

**Files:**
- Modify: `compiler/src/components.ts`
- Modify: `compiler/src/ir.ts`
- Modify: `compiler/src/lowering.ts`
- Modify: `compiler/src/emitter.ts`
- Modify: `compiler/src/init.ts`
- Modify: `compiler/tests/emitter.test.ts`

- [ ] **Step 1: Add Image to components.ts**

Add after the existing `Modal` entry:

```typescript
    Image: {
        props: {
            src: { type: 'string', required: true },
            embed: { type: 'boolean', required: false },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
```

- [ ] **Step 2: Add IRImage to ir.ts**

Add the interface before `IRDockLayout`:

```typescript
export interface IRImage {
    kind: 'image';
    src: string;
    embed: boolean;
    embedKey?: string;
    width?: string;
    height?: string;
    loc?: SourceLoc;
}
```

Add `| IRImage` to the `IRNode` union.

- [ ] **Step 3: Add lowering**

In `lowering.ts`, add `IRImage` to the import from `./ir.js`.

In `lowerJsxSelfClosing` switch, add before `default`:

```typescript
        case 'Image':
            lowerImage(attrs, body, ctx, loc);
            break;
```

Add the lowering function:

```typescript
function lowerImage(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const src = attrs['src'] ?? '""';
    const embed = attrs['embed'] === 'true';
    const width = attrs['width'];
    const height = attrs['height'];

    let embedKey: string | undefined;
    if (embed) {
        // Derive key from src: strip quotes, replace non-alnum with underscore
        const rawSrc = src.replace(/^"|"$/g, '');
        embedKey = rawSrc.replace(/[^a-zA-Z0-9]/g, '_');
    }

    body.push({ kind: 'image', src, embed, embedKey, width, height, loc });
}
```

- [ ] **Step 4: Add emission (non-embed mode first)**

In `emitter.ts`, add `IRImage` to the import from `./ir.js`.

Add case in `emitNode` switch:

```typescript
        case 'image':
            emitImage(node, lines, indent);
            break;
```

Add the emission function:

```typescript
function emitImage(node: IRImage, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Image', lines, indent);
    const width = node.width ? ensureFloatLiteral(node.width) : '0';
    const height = node.height ? ensureFloatLiteral(node.height) : '0';

    if (node.embed && node.embedKey) {
        // Embedded mode: reference the data from the .embed.h header
        lines.push(`${indent}imx::renderer::image_embedded("${node.embedKey}", ${node.embedKey}_data, ${node.embedKey}_size, ${width}, ${height});`);
    } else {
        // File mode: pass the path string
        lines.push(`${indent}imx::renderer::image(${node.src}, ${width}, ${height});`);
    }
}
```

- [ ] **Step 5: Handle embed #include in emitComponent**

For embedded images, the .gen.cpp needs to `#include "name.embed.h"` at the top. In `emitter.ts`, the `emitComponent` function needs to collect embed keys from the IR body and emit includes.

Add a helper function:

```typescript
function collectEmbedKeys(nodes: IRNode[]): string[] {
    const keys: string[] = [];
    for (const node of nodes) {
        if (node.kind === 'image' && node.embed && node.embedKey) {
            keys.push(node.embedKey);
        } else if (node.kind === 'conditional') {
            keys.push(...collectEmbedKeys(node.body));
            if (node.elseBody) keys.push(...collectEmbedKeys(node.elseBody));
        } else if (node.kind === 'list_map') {
            keys.push(...collectEmbedKeys(node.body));
        }
    }
    return keys;
}
```

In `emitComponent`, after the existing `#include` lines are generated (around where it pushes `'#include <imx/runtime.h>'` etc.), add embed includes. Find the place where `lines.push('')` is called after the last include, and before it, add:

```typescript
    // Embed image includes
    const embedKeys = collectEmbedKeys(comp.body);
    for (const key of embedKeys) {
        lines.push(`#include "${key}.embed.h"`);
    }
```

- [ ] **Step 6: Add .d.ts type to init.ts**

Add the interface:

```typescript
interface ImageProps { src: string; embed?: boolean; width?: number; height?: number; }
```

And: `declare function Image(props: ImageProps): any;`

- [ ] **Step 7: Add emitter tests**

Add to `compiler/tests/emitter.test.ts`:

```typescript
    it('emits Image with file path', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><Image src="logo.png" width={100} height={50} /></Window>;
}
        `);
        expect(output).toContain('imx::renderer::image("logo.png", 100.0f, 50.0f)');
    });

    it('emits Image with embed mode', () => {
        const output = compile(`
function App() {
  return <Window title="Test"><Image src="logo.png" embed width={100} height={50} /></Window>;
}
        `);
        expect(output).toContain('#include "logo_png.embed.h"');
        expect(output).toContain('imx::renderer::image_embedded("logo_png", logo_png_data, logo_png_size, 100.0f, 50.0f)');
    });
```

- [ ] **Step 8: Build and test**

```bash
cd compiler && npm run build && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add compiler/src/components.ts compiler/src/ir.ts compiler/src/lowering.ts compiler/src/emitter.ts compiler/src/init.ts compiler/tests/emitter.test.ts
git commit -m "feat: add Image component to compiler (file + embed modes)"
```

---

### Task 3: Embed Header Generation in Compile Driver

**Files:**
- Modify: `compiler/src/compile.ts`

- [ ] **Step 1: Add embed header generation to compile.ts**

In `compiler/src/compile.ts`, add a helper function and call it during Phase 3 (after emitting .gen.cpp).

First, add the import at the top:

```typescript
import type { IRImage } from './ir.js';
```

Add this helper function after the existing `resolveCustomComponents` function:

```typescript
function collectEmbedImages(nodes: IRNode[]): IRImage[] {
    const images: IRImage[] = [];
    for (const node of nodes) {
        if (node.kind === 'image' && node.embed && node.embedKey) {
            images.push(node as IRImage);
        } else if (node.kind === 'conditional') {
            images.push(...collectEmbedImages(node.body));
            if (node.elseBody) images.push(...collectEmbedImages(node.elseBody));
        } else if (node.kind === 'list_map') {
            images.push(...collectEmbedImages(node.body));
        }
    }
    return images;
}

function generateEmbedHeaders(images: IRImage[], sourceDir: string, outputDir: string): void {
    for (const img of images) {
        if (!img.embedKey) continue;

        const rawSrc = img.src.replace(/^"|"$/g, '');
        const imagePath = path.resolve(sourceDir, rawSrc);
        const headerPath = path.join(outputDir, `${img.embedKey}.embed.h`);

        // Mtime caching: skip if header exists and is newer than image
        if (fs.existsSync(headerPath) && fs.existsSync(imagePath)) {
            const imgStat = fs.statSync(imagePath);
            const hdrStat = fs.statSync(headerPath);
            if (hdrStat.mtimeMs >= imgStat.mtimeMs) {
                continue; // Header is up to date
            }
        }

        if (!fs.existsSync(imagePath)) {
            console.warn(`  warning: embedded image not found: ${imagePath}`);
            continue;
        }

        const imageData = fs.readFileSync(imagePath);
        const bytes = Array.from(imageData)
            .map(b => `0x${b.toString(16).padStart(2, '0')}`)
            .join(', ');

        const header = [
            `// Generated from ${rawSrc} by imxc`,
            `#pragma once`,
            `static const unsigned char ${img.embedKey}_data[] = { ${bytes} };`,
            `static const unsigned int ${img.embedKey}_size = ${imageData.length};`,
            '',
        ].join('\n');

        fs.writeFileSync(headerPath, header);
        console.log(`  ${rawSrc} -> ${headerPath} (embed)`);
    }
}
```

Then in the Phase 3 loop (around line 87-113), after writing the .gen.cpp and .gen.h files for each component, add:

```typescript
        // Generate embed headers for any <Image embed> nodes
        const embedImages = collectEmbedImages(comp.ir.body);
        if (embedImages.length > 0) {
            const sourceDir = path.dirname(path.resolve(files[compiled.indexOf(comp)] ?? files[0]));
            generateEmbedHeaders(embedImages, sourceDir, outputDir);
        }
```

Note: `files` is the input array passed to `compile()`. You need to track which file each component came from. The simplest approach: store the original file path in `CompiledComponent`.

Update the `CompiledComponent` interface to include the original file path:

```typescript
interface CompiledComponent {
    name: string;
    sourceFile: string;
    sourcePath: string;  // ADD: full path to original .tsx file
    stateCount: number;
    bufferCount: number;
    ir: IRComponent;
    imports: Map<string, string>;
    hasProps: boolean;
}
```

And in the Phase 1 loop where `compiled.push(...)` is called, add `sourcePath: file`:

```typescript
        compiled.push({
            name: ir.name,
            sourceFile: path.basename(file),
            sourcePath: file,  // ADD THIS
            stateCount: ir.stateSlots.length,
            bufferCount: ir.bufferCount,
            ir,
            imports,
            hasProps: ir.params.length > 0,
        });
```

Then the embed generation call becomes:

```typescript
        // Generate embed headers for any <Image embed> nodes
        const embedImages = collectEmbedImages(comp.ir.body);
        if (embedImages.length > 0) {
            const sourceDir = path.dirname(path.resolve(comp.sourcePath));
            generateEmbedHeaders(embedImages, sourceDir, outputDir);
        }
```

- [ ] **Step 2: Build compiler**

```bash
cd compiler && npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add compiler/src/compile.ts
git commit -m "feat: add embed header generation with mtime caching"
```

---

### Task 4: End-to-End Build + Documentation

**Files:**
- Modify: `docs/api-reference.md`
- Modify: `docs/llm-prompt-reference.md`

- [ ] **Step 1: Full build verification**

```bash
cd compiler && npm run build && npx vitest run
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --target hello_app
cmake --build build --target runtime_tests && ./build/Debug/runtime_tests.exe
```

Expected: All pass.

- [ ] **Step 2: Add Image documentation to api-reference.md**

Add a section for the Image component:

```markdown
## Image

Display an image from a file path or embedded in the executable.

### File Loading (Runtime)

\`\`\`tsx
<Image src="logo.png" width={200} height={100} />
\`\`\`

The image is loaded from disk on first render and cached. If `width`/`height` are omitted, the image's natural dimensions are used.

### Embedded (Compile-Time)

\`\`\`tsx
<Image src="logo.png" embed width={200} height={100} />
\`\`\`

The compiler reads the image file and bakes it into the binary as a byte array. A `.embed.h` header is generated alongside the `.gen.cpp`. The header is only regenerated when the image file changes (mtime check).

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | yes | Path to image file (relative to .tsx source) |
| `embed` | `boolean` | no | Embed image data in binary |
| `width` | `number` | no | Display width (default: natural width) |
| `height` | `number` | no | Display height (default: natural height) |

Supported formats: PNG, JPEG.
```

- [ ] **Step 3: Add Image examples to llm-prompt-reference.md**

Add:

```markdown
## Image

\`\`\`tsx
// Runtime file loading
<Image src="icon.png" width={32} height={32} />

// Embedded in executable (no file needed at runtime)
<Image src="splash.png" embed width={800} height={600} />
\`\`\`
```

- [ ] **Step 4: Commit**

```bash
git add docs/api-reference.md docs/llm-prompt-reference.md
git commit -m "docs: add Image component documentation"
```
