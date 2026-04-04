# ReImGuiCompile.cmake — helper for compiling .tsx files to C++ via the ReImGui compiler.
#
# Usage:
#
#   include(ReImGuiCompile)
#
#   reimgui_compile_tsx(MY_GENERATED
#       SOURCES App.tsx Components/Sidebar.tsx
#       OUTPUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated
#   )
#
#   add_executable(my_app main.cpp ${MY_GENERATED})
#   target_link_libraries(my_app PRIVATE reimgui::renderer)
#   target_include_directories(my_app PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated)
#
# The first source file is treated as the root component (produces <Name>.gen.cpp
# + app_root.gen.cpp).  Subsequent files produce <Name>.gen.cpp + <Name>.gen.h.
#
# Parameters:
#   SOURCES    — list of .tsx source files (absolute or relative to CMAKE_CURRENT_SOURCE_DIR)
#   OUTPUT_DIR — directory for generated C++ files (created automatically)
#   COMPILER   — (optional) path to the compiler index.js; defaults to REIMGUI_COMPILER

function(reimgui_compile_tsx output_var)
    cmake_parse_arguments(ARG "" "OUTPUT_DIR;COMPILER" "SOURCES" ${ARGN})

    if(NOT ARG_SOURCES)
        message(FATAL_ERROR "reimgui_compile_tsx: SOURCES is required")
    endif()

    if(NOT ARG_COMPILER)
        if(REIMGUI_COMPILER)
            set(ARG_COMPILER "${REIMGUI_COMPILER}")
        else()
            message(FATAL_ERROR
                "reimgui_compile_tsx: no COMPILER specified and REIMGUI_COMPILER is not set. "
                "Set REIMGUI_COMPILER to the path of compiler/dist/index.js.")
        endif()
    endif()

    if(NOT ARG_OUTPUT_DIR)
        set(ARG_OUTPUT_DIR "${CMAKE_CURRENT_BINARY_DIR}/reimgui_generated")
    endif()

    file(MAKE_DIRECTORY "${ARG_OUTPUT_DIR}")

    # Build absolute paths for sources and predict output files.
    set(_abs_sources)
    set(_generated)
    list(LENGTH ARG_SOURCES _count)
    math(EXPR _last "${_count} - 1")

    foreach(_i RANGE 0 ${_last})
        list(GET ARG_SOURCES ${_i} _src)

        # Make path absolute if it isn't already
        if(NOT IS_ABSOLUTE "${_src}")
            set(_src "${CMAKE_CURRENT_SOURCE_DIR}/${_src}")
        endif()
        list(APPEND _abs_sources "${_src}")

        get_filename_component(_name "${_src}" NAME_WE)
        list(APPEND _generated "${ARG_OUTPUT_DIR}/${_name}.gen.cpp")
        if(_i EQUAL 0)
            list(APPEND _generated "${ARG_OUTPUT_DIR}/app_root.gen.cpp")
        else()
            list(APPEND _generated "${ARG_OUTPUT_DIR}/${_name}.gen.h")
        endif()
    endforeach()

    add_custom_command(
        OUTPUT  ${_generated}
        COMMAND node "${ARG_COMPILER}" ${_abs_sources} -o "${ARG_OUTPUT_DIR}"
        DEPENDS ${_abs_sources}
        COMMENT "ReImGui: compiling .tsx -> C++"
    )

    set(${output_var} ${_generated} PARENT_SCOPE)
endfunction()
