# ImxCompile.cmake - helper for compiling .tsx files to C++ via the IMX compiler.
#
# Usage:
#
#   include(ImxCompile)
#
#   imx_compile_tsx(MY_GENERATED
#       SOURCES App.tsx Components/Sidebar.tsx
#       OUTPUT_DIR ${CMAKE_CURRENT_BINARY_DIR}/generated
#   )
#
#   add_executable(my_app main.cpp ${MY_GENERATED})
#   target_link_libraries(my_app PRIVATE imx::renderer)
#   target_include_directories(my_app PRIVATE ${CMAKE_CURRENT_BINARY_DIR}/generated)
#
# The first source file is treated as the root component (produces <Name>.gen.cpp
# + app_root.gen.cpp). Subsequent files, including locally imported sibling
# components, produce <Name>.gen.cpp + <Name>.gen.h.
#
# Parameters:
#   SOURCES    - list of .tsx source files (absolute or relative to CMAKE_CURRENT_SOURCE_DIR)
#   OUTPUT_DIR - directory for generated C++ files (created automatically)
#   COMPILER   - (optional) path to the compiler index.js; defaults to IMX_COMPILER

function(_imx_resolve_import out_var base_dir specifier)
    set(_candidates
        "${base_dir}/${specifier}"
        "${base_dir}/${specifier}.tsx"
        "${base_dir}/${specifier}.ts"
        "${base_dir}/${specifier}/index.tsx"
        "${base_dir}/${specifier}/index.ts"
    )

    foreach(_candidate IN LISTS _candidates)
        if(EXISTS "${_candidate}")
            file(REAL_PATH "${_candidate}" _resolved)
            set(${out_var} "${_resolved}" PARENT_SCOPE)
            return()
        endif()
    endforeach()

    set(${out_var} "" PARENT_SCOPE)
endfunction()

function(_imx_collect_local_sources out_tsx_var out_dep_var)
    set(_queue ${ARGN})
    set(_visited)
    set(_tsx_sources)
    set(_dependencies)

    while(_queue)
        list(POP_FRONT _queue _current)

        if(NOT IS_ABSOLUTE "${_current}")
            set(_current "${CMAKE_CURRENT_SOURCE_DIR}/${_current}")
        endif()
        file(REAL_PATH "${_current}" _current)

        if(NOT EXISTS "${_current}")
            message(FATAL_ERROR "imx_compile_tsx: source not found: ${_current}")
        endif()

        list(FIND _visited "${_current}" _seen_index)
        if(NOT _seen_index EQUAL -1)
            continue()
        endif()

        list(APPEND _visited "${_current}")
        list(APPEND _dependencies "${_current}")

        get_filename_component(_ext "${_current}" EXT)
        if(_ext STREQUAL ".tsx")
            list(APPEND _tsx_sources "${_current}")
        endif()

        file(READ "${_current}" _content)
        set(_import_matches)
        string(REGEX MATCHALL "(import|export)[^;]*from[ \t\r\n]*['\"][^'\"]+['\"]" _from_matches "${_content}")
        string(REGEX MATCHALL "import[ \t\r\n]*['\"][^'\"]+['\"]" _side_effect_matches "${_content}")
        list(APPEND _import_matches ${_from_matches} ${_side_effect_matches})

        get_filename_component(_current_dir "${_current}" DIRECTORY)
        foreach(_match IN LISTS _import_matches)
            string(REGEX REPLACE ".*['\"]([^'\"]+)['\"].*" "\\1" _specifier "${_match}")
            if(NOT _specifier MATCHES "^\\.")
                continue()
            endif()

            _imx_resolve_import(_resolved "${_current_dir}" "${_specifier}")
            if(_resolved)
                list(APPEND _queue "${_resolved}")
            endif()
        endforeach()
    endwhile()

    set(${out_tsx_var} "${_tsx_sources}" PARENT_SCOPE)
    set(${out_dep_var} "${_dependencies}" PARENT_SCOPE)
endfunction()

function(imx_compile_tsx output_var)
    cmake_parse_arguments(ARG "" "OUTPUT_DIR;COMPILER" "SOURCES" ${ARGN})

    if(NOT ARG_SOURCES)
        message(FATAL_ERROR "imx_compile_tsx: SOURCES is required")
    endif()

    if(NOT ARG_COMPILER)
        if(IMX_COMPILER)
            set(ARG_COMPILER "${IMX_COMPILER}")
        else()
            message(FATAL_ERROR
                "imx_compile_tsx: no COMPILER specified and IMX_COMPILER is not set. "
                "Set IMX_COMPILER to the path of compiler/dist/index.js.")
        endif()
    endif()

    if(NOT ARG_OUTPUT_DIR)
        set(ARG_OUTPUT_DIR "${CMAKE_CURRENT_BINARY_DIR}/imx_generated")
    endif()

    get_filename_component(_compiler_dir "${ARG_COMPILER}" DIRECTORY)

    file(MAKE_DIRECTORY "${ARG_OUTPUT_DIR}")

    file(GLOB _compiler_deps CONFIGURE_DEPENDS
        "${_compiler_dir}/*.js"
        "${_compiler_dir}/*.d.ts"
    )

    # Resolve local imports so generated outputs include sibling components too.
    _imx_collect_local_sources(_abs_sources _source_deps ${ARG_SOURCES})

    set(_generated)
    list(LENGTH _abs_sources _count)
    math(EXPR _last "${_count} - 1")

    foreach(_i RANGE 0 ${_last})
        list(GET _abs_sources ${_i} _src)
        get_filename_component(_name "${_src}" NAME_WE)
        list(APPEND _generated "${ARG_OUTPUT_DIR}/${_name}.gen.cpp")
        if(_i EQUAL 0)
            list(APPEND _generated "${ARG_OUTPUT_DIR}/app_root.gen.cpp")
        else()
            list(APPEND _generated "${ARG_OUTPUT_DIR}/${_name}.gen.h")
        endif()
    endforeach()

    add_custom_command(
        OUTPUT ${_generated}
        COMMAND node "${ARG_COMPILER}" ${_abs_sources} -o "${ARG_OUTPUT_DIR}"
        DEPENDS ${_source_deps} ${_compiler_deps}
        COMMENT "IMX: compiling .tsx -> C++"
    )

    set(${output_var} ${_generated} PARENT_SCOPE)
endfunction()
