cmake_minimum_required(VERSION 3.25)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)
project(reimgui LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

include(FetchContent)

FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG        v1.92.7-docking
)

FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG        3.4
)

FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG        v3.7.1
)

set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
find_package(OpenGL REQUIRED)

FetchContent_MakeAvailable(imgui glfw Catch2)

add_library(imgui_lib STATIC
    ${imgui_SOURCE_DIR}/imgui.cpp
    ${imgui_SOURCE_DIR}/imgui_demo.cpp
    ${imgui_SOURCE_DIR}/imgui_draw.cpp
    ${imgui_SOURCE_DIR}/imgui_tables.cpp
    ${imgui_SOURCE_DIR}/imgui_widgets.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_glfw.cpp
    ${imgui_SOURCE_DIR}/backends/imgui_impl_opengl3.cpp
)
target_include_directories(imgui_lib PUBLIC
    ${imgui_SOURCE_DIR}
    ${imgui_SOURCE_DIR}/backends
)
target_link_libraries(imgui_lib PUBLIC glfw OpenGL::GL)

# --- reimgui_runtime ---
add_library(reimgui_runtime STATIC
    runtime/runtime.cpp
    runtime/render_context.cpp
    runtime/text_buffer.cpp
    runtime/component_instance.cpp
)
target_include_directories(reimgui_runtime PUBLIC include/)
target_link_libraries(reimgui_runtime PUBLIC imgui_lib)

# --- reimgui_renderer ---
add_library(reimgui_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
)
target_include_directories(reimgui_renderer PUBLIC include/)
target_link_libraries(reimgui_renderer PUBLIC reimgui_runtime imgui_lib)

# --- Tests ---
add_executable(runtime_tests
    tests/runtime/test_state.cpp
    tests/runtime/test_text_buffer.cpp
    tests/runtime/test_instance.cpp
    tests/runtime/test_lifecycle.cpp
)
target_link_libraries(runtime_tests PRIVATE reimgui_runtime Catch2::Catch2WithMain)

# --- Legacy app (kept until example replaces it) ---
add_executable(app main.cpp)
target_link_libraries(app PRIVATE imgui_lib)

# --- Code generation: .igx -> .gen.cpp ---
set(REIMGUI_GENERATED_DIR ${CMAKE_BINARY_DIR}/generated)
file(MAKE_DIRECTORY ${REIMGUI_GENERATED_DIR})

add_custom_command(
    OUTPUT
        ${REIMGUI_GENERATED_DIR}/App.gen.cpp
        ${REIMGUI_GENERATED_DIR}/app_root.gen.cpp
        ${REIMGUI_GENERATED_DIR}/TodoItem.gen.cpp
        ${REIMGUI_GENERATED_DIR}/TodoItem.gen.h
    COMMAND node ${CMAKE_SOURCE_DIR}/compiler/dist/index.js
        ${CMAKE_SOURCE_DIR}/examples/hello/App.tsx
        ${CMAKE_SOURCE_DIR}/examples/hello/TodoItem.tsx
        -o ${REIMGUI_GENERATED_DIR}
    DEPENDS
        ${CMAKE_SOURCE_DIR}/examples/hello/App.tsx
        ${CMAKE_SOURCE_DIR}/examples/hello/TodoItem.tsx
    COMMENT "Compiling .tsx -> C++"
)

# --- hello_app: end-to-end .igx -> native binary ---
add_executable(hello_app
    examples/hello/main.cpp
    ${REIMGUI_GENERATED_DIR}/App.gen.cpp
    ${REIMGUI_GENERATED_DIR}/app_root.gen.cpp
    ${REIMGUI_GENERATED_DIR}/TodoItem.gen.cpp
)
target_link_libraries(hello_app PRIVATE reimgui_renderer)
target_include_directories(hello_app PRIVATE ${REIMGUI_GENERATED_DIR})

# --- settings_app: LLM prompt reference test ---
set(SETTINGS_GEN_DIR ${CMAKE_BINARY_DIR}/settings_generated)
add_executable(settings_app
    examples/settings/main.cpp
    ${SETTINGS_GEN_DIR}/App.gen.cpp
    ${SETTINGS_GEN_DIR}/app_root.gen.cpp
    ${SETTINGS_GEN_DIR}/SettingGroup.gen.cpp
)
target_link_libraries(settings_app PRIVATE reimgui_renderer)
target_include_directories(settings_app PRIVATE ${SETTINGS_GEN_DIR})
