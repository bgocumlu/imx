cmake_minimum_required(VERSION 3.25)
set(CMAKE_POLICY_VERSION_MINIMUM 3.5)
project(imx LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(PROJECT_IS_TOP_LEVEL)
    set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
endif()

# --- Options (default ON when building standalone, OFF when consumed) ---
option(IMX_BUILD_EXAMPLES "Build example applications" ${PROJECT_IS_TOP_LEVEL})
option(IMX_BUILD_TESTS    "Build tests"                ${PROJECT_IS_TOP_LEVEL})

# --- Dependencies ---
include(FetchContent)

FetchContent_Declare(
    imgui
    GIT_REPOSITORY https://github.com/ocornut/imgui.git
    GIT_TAG        v1.92.7-docking
    GIT_SHALLOW    TRUE
)

FetchContent_Declare(
    glfw
    GIT_REPOSITORY https://github.com/glfw/glfw.git
    GIT_TAG        3.4
    GIT_SHALLOW    TRUE
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

# --- imx_runtime ---
add_library(imx_runtime STATIC
    runtime/runtime.cpp
    runtime/render_context.cpp
    runtime/text_buffer.cpp
    runtime/component_instance.cpp
)
target_include_directories(imx_runtime PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)
target_link_libraries(imx_runtime PUBLIC imgui_lib)
add_library(imx::runtime ALIAS imx_runtime)

# --- imx_renderer ---
add_library(imx_renderer STATIC
    renderer/style.cpp
    renderer/layout.cpp
    renderer/components.cpp
    renderer/widget_args.cpp
    renderer/texture.cpp
)
target_include_directories(imx_renderer PUBLIC
    $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
)
target_link_libraries(imx_renderer PUBLIC imx_runtime imgui_lib)
add_library(imx::renderer ALIAS imx_renderer)

# --- Codegen helper ---
set(IMX_COMPILER "${CMAKE_CURRENT_SOURCE_DIR}/compiler/dist/index.js"
    CACHE FILEPATH "Path to the IMX TSX compiler (index.js)")
list(APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake")
if(NOT PROJECT_IS_TOP_LEVEL)
    set(CMAKE_MODULE_PATH "${CMAKE_MODULE_PATH}" PARENT_SCOPE)
endif()

# --- Tests ---
if(IMX_BUILD_TESTS)
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
    target_link_libraries(runtime_tests PRIVATE imx_runtime Catch2::Catch2WithMain)
endif()

# --- Examples ---
if(IMX_BUILD_EXAMPLES)
    # --- hello_app: codegen + native binary ---
    include(ImxCompile)

    imx_compile_tsx(HELLO_GENERATED
        SOURCES
            examples/hello/App.tsx
            examples/hello/TodoItem.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated
    )

    add_executable(hello_app
        examples/hello/main.cpp
        ${HELLO_GENERATED}
    )
    target_link_libraries(hello_app PRIVATE imx_renderer)
    target_include_directories(hello_app PRIVATE ${CMAKE_BINARY_DIR}/generated)

    # Copy public/ assets to output directory
    add_custom_command(TARGET hello_app POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/public
            $<TARGET_FILE_DIR:hello_app>
        COMMENT "Copying hello public/ assets"
    )

    # --- todo_app: struct binding example ---
    imx_compile_tsx(TODO_GENERATED
        SOURCES
            examples/todo/src/App.tsx
            examples/todo/src/TodoItem.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_todo
    )

    add_executable(todo_app
        examples/todo/src/main.cpp
        ${TODO_GENERATED}
    )
    set_target_properties(todo_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(todo_app PRIVATE imx_renderer)
    target_include_directories(todo_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_todo
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/todo/src
    )

endif()
