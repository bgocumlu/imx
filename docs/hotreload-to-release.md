# Hot Reload to Release Build

When you've developed your app using the `hotreload` template and are ready to ship a single executable, follow these steps.

## 1. Update CMakeLists.txt

Replace the two-target setup (host exe + DLL) with a single executable:

```cmake
# Remove these:
#   add_library(imx_ui SHARED ...)
#   add_executable(${PROJECT_NAME} src/main.cpp)  # host-only
#   add_dependencies / copy commands

# Replace with:
add_executable(${PROJECT_NAME}
    src/main.cpp
    ${GENERATED}
)
set_target_properties(${PROJECT_NAME} PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
target_link_libraries(${PROJECT_NAME} PRIVATE imx::renderer)
target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_BINARY_DIR}/generated ${CMAKE_CURRENT_SOURCE_DIR}/src)
```

## 2. Update main.cpp

Replace the DLL loading with a direct render call:

```cpp
// Remove these:
//   #include "hotreload.h"
//   HotModule module; (from App struct)
//   app.module.load("imx_ui.dll");
//   app.module.check_reload();
//   app.module.render(app.runtime, app.state, ImGui::GetCurrentContext());
//   app.module.unload();

// Add this include:
#include <imx/renderer.h>

// Replace the render call in render_frame() with:
imx::render_root(app.runtime, app.state);
```

## 3. Remove unused files

You can delete these files from your project — they're only needed for hot reload:

- `src/hotreload.h`
- `src/ui_entry.cpp`

## 4. Rebuild

```bash
cmake -B build -G "Visual Studio 17 2022"
cmake --build build --config Release
```

Your release build is now a single `.exe` with no DLL dependencies.
