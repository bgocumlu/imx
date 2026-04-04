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

// ImGui v1.92+ uses ImTextureRef which accepts ImTextureID (ImU64) via implicit constructor.
// We cast GLuint -> ImTextureID (ImU64) -> ImTextureRef (implicit).
void image(const char* path, float width, float height) {
    before_child();
    GLuint tex = ensure_texture_from_file(path);
    if (tex == 0) return;
    float w = width > 0 ? width : static_cast<float>(g_texture_widths[path]);
    float h = height > 0 ? height : static_cast<float>(g_texture_heights[path]);
    ImGui::Image(ImTextureRef(static_cast<ImTextureID>(static_cast<ImU64>(tex))), ImVec2(w, h));
}

void image_embedded(const char* key, const unsigned char* data, unsigned int size, float width, float height) {
    before_child();
    GLuint tex = ensure_texture_from_memory(key, data, size);
    if (tex == 0) return;
    float w = width > 0 ? width : static_cast<float>(g_texture_widths[key]);
    float h = height > 0 ? height : static_cast<float>(g_texture_heights[key]);
    ImGui::Image(ImTextureRef(static_cast<ImTextureID>(static_cast<ImU64>(tex))), ImVec2(w, h));
}

} // namespace imx::renderer
