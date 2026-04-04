cmake_minimum_required(VERSION 3.25)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)
project(reimgui LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(PROJECT_IS_TOP_LEVEL)
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
endif()

# --- Options (default ON when building standalone, OFF when consumed) ---
option(REIMGUI_BUILD_EXAMPLES "Build example applications" ${PROJECT_IS_TOP_LEVEL})
option(REIMGUI_BUILD_TESTS    "Build tests"                ${PROJECT_IS_TOP_LEVEL})

# --- Dependencies ---
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

set(GLFW_BUILD_DOCS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(GLFW_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
find_package(OpenGL REQUIRED)

FetchContent_MakeAvailable(imgui glfw)

# --- ImGui static library (skip if consumer already provides this target) ---
if(NOT TARGET imgui_lib)
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
endif()

# --- reimgui_runtime ---
add_library(reimgui_runtime STATIC
    runtime/runtime.cpp
    runtime/render_context.cpp
    runtime/text_buffer.cpp
    runtime/component_instance.cpp
)
target_include_directories(reimgui_runtime PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)
target_link_libraries(reimgui_runtime PUBLIC imgui_lib)
add_library(reimgui::runtime ALIAS reimgui_runtime)

# --- reimgui_renderer ---
add_library(reimgui_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
)
target_include_directories(reimgui_renderer PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)
target_link_libraries(reimgui_renderer PUBLIC reimgui_runtime imgui_lib)
add_library(reimgui::renderer ALIAS reimgui_renderer)

# --- Codegen helper ---
set(REIMGUI_COMPILER "${CMAKE_CURRENT_SOURCE_DIR}/compiler/dist/index.js"
    CACHE FILEPATH "Path to the ReImGui TSX compiler (index.js)")
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")

# --- Tests ---
if(REIMGUI_BUILD_TESTS)
    FetchContent_Declare(
        Catch2
        GIT_REPOSITORY https://github.com/catchorg/Catch2.git
        GIT_TAG        v3.7.1
    )
    FetchContent_MakeAvailable(Catch2)

    add_executable(runtime_tests
        tests/runtime/test_state.cpp
        tests/runtime/test_text_buffer.cpp
        tests/runtime/test_instance.cpp
        tests/runtime/test_lifecycle.cpp
    )
    target_link_libraries(runtime_tests PRIVATE reimgui_runtime Catch2::Catch2WithMain)
endif()

# --- Examples ---
if(REIMGUI_BUILD_EXAMPLES)
    # Legacy app (kept until example replaces it)
    add_executable(app main.cpp)
    target_link_libraries(app PRIVATE imgui_lib)

    # --- hello_app: codegen + native binary ---
    set(REIMGUI_GENERATED_DIR ${CMAKE_BINARY_DIR}/generated)
    file(MAKE_DIRECTORY ${REIMGUI_GENERATED_DIR})

    add_custom_command(
        OUTPUT
            ${REIMGUI_GENERATED_DIR}/App.gen.cpp
            ${REIMGUI_GENERATED_DIR}/app_root.gen.cpp
            ${REIMGUI_GENERATED_DIR}/TodoItem.gen.cpp
            ${REIMGUI_GENERATED_DIR}/TodoItem.gen.h
        COMMAND node ${CMAKE_CURRENT_SOURCE_DIR}/compiler/dist/index.js
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/App.tsx
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/TodoItem.tsx
            -o ${REIMGUI_GENERATED_DIR}
        DEPENDS
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/App.tsx
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/TodoItem.tsx
        COMMENT "Compiling hello .tsx -> C++"
    )

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
endif()
