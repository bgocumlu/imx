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
    # --- hello_app: minimal getting-started ---
    include(ImxCompile)

    imx_compile_tsx(HELLO_GENERATED
        SOURCES
            examples/hello/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_hello
    )

    add_executable(hello_app
        examples/hello/src/main.cpp
        ${HELLO_GENERATED}
    )
    set_target_properties(hello_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(hello_app PRIVATE imx_renderer)
    target_include_directories(hello_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_hello
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/src
    )

    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/public)
        add_custom_command(TARGET hello_app POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${CMAKE_CURRENT_SOURCE_DIR}/examples/hello/public
                $<TARGET_FILE_DIR:hello_app>
            COMMENT "Copying hello public/ assets"
        )
    endif()

    # --- demo_app: component-organized demo (like imgui_demo) ---
    imx_compile_tsx(DEMO_GENERATED
        SOURCES
            examples/demo/src/App.tsx
            examples/demo/src/LayoutDemo.tsx
            examples/demo/src/TextDemo.tsx
            examples/demo/src/InputsDemo.tsx
            examples/demo/src/SlidersDemo.tsx
            examples/demo/src/ButtonsDemo.tsx
            examples/demo/src/ColorDemo.tsx
            examples/demo/src/TablesDemo.tsx
            examples/demo/src/TreesDemo.tsx
            examples/demo/src/MenusDemo.tsx
            examples/demo/src/DragDropDemo.tsx
            examples/demo/src/CanvasDemo.tsx
            examples/demo/src/ThemingDemo.tsx
            examples/demo/src/ImagesDemo.tsx
            examples/demo/src/AdvancedDemo.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_demo
    )

    add_executable(demo_app
        examples/demo/src/main.cpp
        ${DEMO_GENERATED}
    )
    set_target_properties(demo_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(demo_app PRIVATE imx_renderer)
    target_include_directories(demo_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_demo
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/demo/src
    )

    add_custom_command(TARGET demo_app POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
            ${CMAKE_CURRENT_SOURCE_DIR}/examples/demo/public
            $<TARGET_FILE_DIR:demo_app>
        COMMENT "Copying demo public/ assets"
    )

    # --- phases_app: phase showcase (content added incrementally) ---
    imx_compile_tsx(PHASES_GENERATED
        SOURCES
            examples/phases/src/App.tsx
            examples/phases/src/Phase11.tsx
            examples/phases/src/Phase12.tsx
            examples/phases/src/Phase13.tsx
            examples/phases/src/Phase14.tsx
            examples/phases/src/Phase15.tsx
            examples/phases/src/Phase16.tsx
            examples/phases/src/Phase17.tsx
            examples/phases/src/Phase18.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_phases
    )

    add_executable(phases_app
        examples/phases/src/main.cpp
        ${PHASES_GENERATED}
    )
    set_target_properties(phases_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(phases_app PRIVATE imx_renderer)
    target_include_directories(phases_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_phases
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/phases/src
    )

    if(EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/examples/phases/public)
        add_custom_command(TARGET phases_app POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${CMAKE_CURRENT_SOURCE_DIR}/examples/phases/public
                $<TARGET_FILE_DIR:phases_app>
            COMMENT "Copying phases public/ assets"
        )
    endif()

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

    # --- settings_app: all input widgets with struct binding ---
    imx_compile_tsx(SETTINGS_GENERATED
        SOURCES
            examples/settings/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_settings
    )

    add_executable(settings_app
        examples/settings/src/main.cpp
        ${SETTINGS_GENERATED}
    )
    set_target_properties(settings_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(settings_app PRIVATE imx_renderer)
    target_include_directories(settings_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_settings
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/settings/src
    )

    # --- kanban_app: nested .map() + DragDrop ---
    imx_compile_tsx(KANBAN_GENERATED
        SOURCES
            examples/kanban/src/App.tsx
            examples/kanban/src/KanbanCard.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_kanban
    )

    add_executable(kanban_app
        examples/kanban/src/main.cpp
        ${KANBAN_GENERATED}
    )
    set_target_properties(kanban_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(kanban_app PRIVATE imx_renderer)
    target_include_directories(kanban_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_kanban
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/kanban/src
    )

    # --- dashboard_app: Table + .map(), plots, multi-window docking ---
    imx_compile_tsx(DASHBOARD_GENERATED
        SOURCES
            examples/dashboard/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_dashboard
    )

    add_executable(dashboard_app
        examples/dashboard/src/main.cpp
        ${DASHBOARD_GENERATED}
    )
    set_target_properties(dashboard_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(dashboard_app PRIVATE imx_renderer)
    target_include_directories(dashboard_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_dashboard
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/dashboard/src
    )

    # --- async_app: background task scaffolding ---
    imx_compile_tsx(ASYNC_GENERATED
        SOURCES
            examples/async/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_async
    )

    add_executable(async_app
        examples/async/src/main.cpp
        ${ASYNC_GENERATED}
    )
    set_target_properties(async_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(async_app PRIVATE imx_renderer)
    target_include_directories(async_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_async
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/async/src
    )

    # --- nlohmann/json (for persistence example) ---
    FetchContent_Declare(json
        GIT_REPOSITORY https://github.com/nlohmann/json.git
        GIT_TAG v3.11.3
        GIT_SHALLOW TRUE
    )
    set(JSON_BuildTests OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(json)

    # --- persistence_app: JSON save/load scaffolding ---
    imx_compile_tsx(PERSISTENCE_GENERATED
        SOURCES
            examples/persistence/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_persistence
    )

    add_executable(persistence_app
        examples/persistence/src/main.cpp
        ${PERSISTENCE_GENERATED}
    )
    set_target_properties(persistence_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(persistence_app PRIVATE imx_renderer nlohmann_json::nlohmann_json)
    target_include_directories(persistence_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_persistence
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/persistence/src
    )

    # --- cpp-httplib (for networking example) ---
    FetchContent_Declare(httplib
        GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
        GIT_TAG v0.18.3
        GIT_SHALLOW TRUE
    )
    set(HTTPLIB_COMPILE OFF CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(httplib)

    # --- networking_app: HTTP client scaffolding ---
    imx_compile_tsx(NETWORKING_GENERATED
        SOURCES
            examples/networking/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_networking
    )

    add_executable(networking_app
        examples/networking/src/main.cpp
        ${NETWORKING_GENERATED}
    )
    set_target_properties(networking_app PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(networking_app PRIVATE imx_renderer httplib::httplib)
    target_include_directories(networking_app PRIVATE
        ${CMAKE_BINARY_DIR}/generated_networking
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/networking/src
    )

    # --- hotreload: DLL hot reload scaffolding ---
    imx_compile_tsx(HOTRELOAD_GENERATED
        SOURCES
            examples/hotreload/src/App.tsx
        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated_hotreload
    )

    # UI shared library (hot-reloadable)
    add_library(hotreload_ui SHARED
        examples/hotreload/src/ui_entry.cpp
        ${HOTRELOAD_GENERATED}
    )
    target_link_libraries(hotreload_ui PRIVATE imx_renderer)
    target_include_directories(hotreload_ui PRIVATE
        ${CMAKE_BINARY_DIR}/generated_hotreload
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/hotreload/src
    )

    # Host executable (loads hotreload_ui dynamically)
    add_executable(hotreload_host
        examples/hotreload/src/main.cpp
    )
    set_target_properties(hotreload_host PROPERTIES WIN32_EXECUTABLE $<CONFIG:Release>)
    target_link_libraries(hotreload_host PRIVATE imx_renderer ${CMAKE_DL_LIBS})
    target_include_directories(hotreload_host PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/examples/hotreload/src
    )

    # Copy DLL next to host exe after build
    add_custom_command(TARGET hotreload_ui POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:hotreload_ui> $<TARGET_FILE_DIR:hotreload_host>
        COMMENT "Copying hotreload_ui DLL to host directory"
    )

    # Build host after UI so the DLL is ready
    add_dependencies(hotreload_host hotreload_ui)

endif()
