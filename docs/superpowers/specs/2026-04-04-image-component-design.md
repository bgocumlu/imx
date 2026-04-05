# Image Component Design

## Summary

Add an `<Image>` host component with two modes: runtime file loading and compile-time embedding. Both modes cache textures by string key after first load. Uses stb_image for decoding and OpenGL for GPU upload.

## TSX API

```tsx
// Runtime file loading — loads from disk on first frame
<Image src="logo.png" width={100} height={100} />

// Embedded in executable — compiler bakes image bytes into .gen.cpp
<Image src="logo.png" embed width={100} height={100} />
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `src` | `string` | yes | Image file path (relative to source file) |
| `embed` | `boolean` | no | If true, compiler embeds image data in the binary |
| `width` | `number` | no | Display width in pixels |
| `height` | `number` | no | Display height in pixels |

## Compiler Pipeline

### Non-embed mode

The compiler emits a direct renderer call:

```cpp
imx::renderer::image("logo.png", 100.0f, 100.0f);
```

The renderer loads the file from disk on first call, caches the OpenGL texture by path.

### Embed mode

1. Compiler reads the image file via `fs.readFileSync()` relative to the source .tsx file
2. Generates a separate `<name>.embed.h` header file in the output directory:

```cpp
// Generated from logo.png by imxc
static const unsigned char logo_png_data[] = { 0x89, 0x50, 0x4E, ... };
static const unsigned int logo_png_size = 12345;
```

3. The .gen.cpp includes the header and calls the embedded variant:

```cpp
#include "logo_png.embed.h"
// ...
imx::renderer::image_embedded("logo_png", logo_png_data, logo_png_size, 100.0f, 100.0f);
```

### Embed caching

The compiler checks if `<name>.embed.h` already exists and if the image file's mtime is older than the header's mtime. If so, it skips regeneration. This avoids re-reading and re-encoding unchanged images on every recompile.

### Embed filename derivation

The embed header filename is derived from the image filename by replacing non-alphanumeric characters with underscores: `logo.png` → `logo_png.embed.h`, data array → `logo_png_data`, size → `logo_png_size`.

## Renderer (C++ Side)

### New file: `renderer/texture.cpp`

Handles texture loading, caching, and the Image ImGui call.

**Texture cache:**
```cpp
static std::unordered_map<std::string, GLuint> g_texture_cache;
```

**Public functions (in `namespace imx::renderer`):**

```cpp
// Load from file path, cache by path
void image(const char* path, float width, float height);

// Load from embedded memory, cache by key
void image_embedded(const char* key, const unsigned char* data, unsigned int size, float width, float height);
```

**Internal load pipeline:**
1. Check `g_texture_cache` for existing texture by key
2. If miss: decode with `stbi_load` (file) or `stbi_load_from_memory` (embedded)
3. Create OpenGL texture: `glGenTextures`, `glBindTexture`, `glTexImage2D` with `GL_RGBA`
4. Set filtering: `GL_LINEAR` for min/mag
5. `stbi_image_free` the decoded data
6. Cache the `GLuint` by key
7. Call `ImGui::Image((ImTextureID)(intptr_t)tex_id, ImVec2(width, height))`

If width/height are 0, use the image's natural dimensions from stb_image.

### stb_image integration

Vendor `stb_image.h` into the project. In `texture.cpp`:

```cpp
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
```

Only `texture.cpp` defines the implementation. The header is not exposed publicly — it's an internal dependency of the renderer.

### OpenGL dependency

`texture.cpp` needs OpenGL headers. The project already links `OpenGL::GL` via imgui_lib. The renderer already includes `<imgui.h>` which pulls in the GL context. For texture creation, include `<GL/gl.h>` or use the glad/glfw headers already available via the imgui backend.

## IR Node

```typescript
export interface IRImage {
    kind: 'image';
    src: string;          // file path as string literal
    embed: boolean;       // whether to embed
    embedKey?: string;    // sanitized name for embed (e.g., "logo_png")
    width?: string;       // C++ expression for width
    height?: string;      // C++ expression for height
    loc?: SourceLoc;
}
```

## Files

| File | Change |
|------|--------|
| `renderer/texture.cpp` | **Create** — texture loading, caching, image/image_embedded |
| `include/imx/renderer.h` | Add image/image_embedded declarations |
| `renderer/stb_image.h` | **Create** — vendored single-header library |
| `CMakeLists.txt` | Add texture.cpp to imx_renderer sources |
| `compiler/src/components.ts` | Add Image component definition |
| `compiler/src/ir.ts` | Add IRImage node + union |
| `compiler/src/lowering.ts` | Add Image lowering |
| `compiler/src/emitter.ts` | Add Image emission (embed: emit #include + image_embedded call) |
| `compiler/src/index.ts` | Add embed header generation (read image, write .embed.h with mtime caching) |
| `compiler/src/init.ts` | Add .d.ts type declaration |
| `compiler/tests/emitter.test.ts` | Add emission tests |
| `docs/api-reference.md` | Add Image documentation |
| `docs/llm-prompt-reference.md` | Add Image examples |
