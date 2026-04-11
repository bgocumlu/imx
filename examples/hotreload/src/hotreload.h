#pragma once
#include <string>
#include <filesystem>
#include <iostream>
#include <imx/runtime.h>
#include "AppState.h"

#ifdef _WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <dlfcn.h>
#include <unistd.h>
#endif

struct HotModule {
    using RenderFn = void(*)(imx::Runtime&, AppState&);

#ifdef _WIN32
    HMODULE handle = nullptr;
#else
    void* handle = nullptr;
#endif
    RenderFn render = nullptr;
    std::filesystem::file_time_type last_write{};
    std::string path;

    bool load(const std::string& lib_path) {
        path = lib_path;
        if (!std::filesystem::exists(path)) {
            std::cerr << "hotreload: " << path << " not found\n";
            return false;
        }
        last_write = std::filesystem::last_write_time(path);

#ifdef _WIN32
        // Copy DLL to avoid locking the original (allows rebuild while loaded)
        std::string copy_path = path + ".live";
        std::filesystem::copy_file(path, copy_path, std::filesystem::copy_options::overwrite_existing);
        handle = LoadLibraryA(copy_path.c_str());
        if (!handle) {
            std::cerr << "hotreload: LoadLibrary failed\n";
            return false;
        }
        render = reinterpret_cast<RenderFn>(GetProcAddress(handle, "imx_render"));
#else
        handle = dlopen(path.c_str(), RTLD_NOW);
        if (!handle) {
            std::cerr << "hotreload: dlopen failed: " << dlerror() << "\n";
            return false;
        }
        render = reinterpret_cast<RenderFn>(dlsym(handle, "imx_render"));
#endif
        if (!render) {
            std::cerr << "hotreload: imx_render symbol not found\n";
            unload();
            return false;
        }
        std::cout << "hotreload: loaded " << path << "\n";
        return true;
    }

    void unload() {
        if (!handle) return;
#ifdef _WIN32
        FreeLibrary(handle);
#else
        dlclose(handle);
#endif
        handle = nullptr;
        render = nullptr;
    }

    bool check_reload() {
        if (path.empty() || !std::filesystem::exists(path)) return false;
        auto current = std::filesystem::last_write_time(path);
        if (current == last_write) return false;
        std::cout << "hotreload: change detected, reloading...\n";
        unload();
        // Small delay to ensure file write is complete
#ifdef _WIN32
        Sleep(100);
#else
        usleep(100000);
#endif
        if (load(path)) {
            std::cout << "hotreload: reload successful\n";
            return true;
        }
        std::cerr << "hotreload: reload failed\n";
        return false;
    }

    ~HotModule() { unload(); }
};
