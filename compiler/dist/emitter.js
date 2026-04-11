const INDENT = '    ';
let currentCompName = '';
let currentBoundProps = new Set();
let allBoundProps = new Map();
function emitLocComment(loc, tag, lines, indent) {
    if (loc) {
        lines.push(`${indent}// ${loc.file}:${loc.line} <${tag}>`);
    }
}
function cppType(t) {
    switch (t) {
        case 'int': return 'int';
        case 'float': return 'float';
        case 'bool': return 'bool';
        case 'string': return 'std::string';
        case 'color': return 'std::array<float, 4>';
        case 'int_array': return 'std::array<int, 4>';
    }
}
function cppPropType(t) {
    if (t === 'callback')
        return 'std::function<void()>';
    if (t === 'int' || t === 'float' || t === 'bool' || t === 'string' || t === 'color' || t === 'int_array') {
        return cppType(t);
    }
    return t;
}
/**
 * Ensure a string expression is a const char*.
 * String literals (quoted) are already const char*.
 * Expressions like props.title (std::string) need .c_str().
 */
function asCharPtr(expr) {
    // Already a string literal — "hello" is const char*
    if (expr.startsWith('"'))
        return expr;
    // Already has .c_str()
    if (expr.endsWith('.c_str()'))
        return expr;
    // Expression — assume std::string, add .c_str()
    return `${expr}.c_str()`;
}
/**
 * For directBind emitters: if the valueExpr references a bound prop (pointer),
 * return the correct address expression for nested bound props.
 * Otherwise, emit &expr.
 */
function emitDirectBindPtr(valueExpr) {
    const boundExpr = emitBoundValueExpr(valueExpr);
    if (boundExpr !== valueExpr) {
        return `&${boundExpr}`;
    }
    return `&${valueExpr}`;
}
function boundPropName(valueExpr) {
    return valueExpr.startsWith('props.') ? valueExpr.slice(6).split('.')[0].split('[')[0] : '';
}
function emitBoundValueExpr(valueExpr) {
    const propName = boundPropName(valueExpr);
    if (!currentBoundProps.has(propName)) {
        return valueExpr;
    }
    const prefix = `props.${propName}`;
    const suffix = valueExpr.slice(prefix.length);
    if (suffix.length === 0) {
        return `(*props.${propName})`;
    }
    return `((*props.${propName})${suffix})`;
}
function emitImVec4(arrayStr) {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return /^-?\d+(\.\d+)?$/.test(v) ? (v.includes('.') ? `${v}f` : `${v}.0f`) : v;
    });
    return `ImVec4(${parts.join(', ')})`;
}
function emitImVec2(arrayStr) {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return /^-?\d+(\.\d+)?$/.test(v) ? (v.includes('.') ? `${v}f` : `${v}.0f`) : v;
    });
    return `ImVec2(${parts.join(', ')})`;
}
function emitFloat(val) {
    const trimmed = val.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed))
        return trimmed;
    return trimmed.includes('.') ? `${trimmed}F` : `${trimmed}.0F`;
}
function findDockLayout(nodes) {
    for (const node of nodes) {
        if (node.kind === 'dock_layout')
            return node;
    }
    return null;
}
function emitDockSetupFunction(layout, compName, lines) {
    lines.push(`void ${compName}_setup_dock_layout(ImGuiID dockspace_id) {`);
    lines.push(`${INDENT}ImGui::DockBuilderRemoveNode(dockspace_id);`);
    lines.push(`${INDENT}ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_None);`);
    lines.push(`${INDENT}ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->WorkSize);`);
    lines.push('');
    let counter = 0;
    function emitDockNode(node, parentVar) {
        if (node.kind === 'dock_panel') {
            for (const title of node.windows) {
                lines.push(`${INDENT}ImGui::DockBuilderDockWindow(${title}, ${parentVar});`);
            }
        }
        else {
            const dirRaw = node.direction.replace(/"/g, '');
            const dir = dirRaw === 'horizontal' ? 'ImGuiDir_Left' : 'ImGuiDir_Up';
            const sizeF = emitFloat(node.size);
            const firstVar = `dock_${counter++}`;
            const secondVar = `dock_${counter++}`;
            lines.push(`${INDENT}ImGuiID ${firstVar}, ${secondVar};`);
            lines.push(`${INDENT}ImGui::DockBuilderSplitNode(${parentVar}, ${dir}, ${sizeF}, &${firstVar}, &${secondVar});`);
            if (node.children.length >= 1)
                emitDockNode(node.children[0], firstVar);
            if (node.children.length >= 2)
                emitDockNode(node.children[1], secondVar);
        }
    }
    for (const child of layout.children) {
        emitDockNode(child, 'dockspace_id');
    }
    lines.push(`${INDENT}ImGui::DockBuilderFinish(dockspace_id);`);
    lines.push('}');
    lines.push('');
}
/**
 * Emit a .gen.h header for a component that has props.
 * Contains the props struct and function forward declaration.
 */
export function emitComponentHeader(comp, sourceFile, boundProps, sharedPropsType) {
    const lines = [];
    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    lines.push('#pragma once');
    lines.push('#include <imx/runtime.h>');
    lines.push('#include <imx/renderer.h>');
    lines.push('#include <functional>');
    lines.push('#include <string>');
    if (sharedPropsType) {
        lines.push(`#include "${sharedPropsType}.h"`);
    }
    lines.push('');
    if (comp.params.length > 0) {
        // Props struct
        lines.push(`struct ${comp.name}Props {`);
        for (const p of comp.params) {
            if (boundProps && boundProps.has(p.name)) {
                lines.push(`${INDENT}${cppPropType(p.type)}* ${p.name} = nullptr;`);
            }
            else {
                lines.push(`${INDENT}${cppPropType(p.type)} ${p.name};`);
            }
        }
        lines.push('};');
        lines.push('');
        lines.push(`void ${comp.name}_render(imx::RenderContext& ctx, ${comp.name}Props& props);`);
    }
    else {
        // Propless component — just the function forward declaration
        lines.push(`void ${comp.name}_render(imx::RenderContext& ctx);`);
    }
    lines.push('');
    return lines.join('\n');
}
export function emitComponent(comp, imports, sourceFile, boundProps, boundPropsMap) {
    const lines = [];
    // Reset counters for each component
    styleCounter = 0;
    customComponentCounter = 0;
    checkboxCounter = 0;
    comboCounter = 0;
    listBoxCounter = 0;
    nativeWidgetCounter = 0;
    plotCounter = 0;
    widgetTempCounter = 0;
    dragDropSourceStack.length = 0;
    dragDropTargetStack.length = 0;
    collapsingHeaderOnCloseStack.length = 0;
    currentCompName = comp.name;
    currentBoundProps = boundProps ?? new Set();
    allBoundProps = boundPropsMap ?? new Map();
    // hasProps: true for inline prop struct OR named interface
    const hasProps = comp.params.length > 0 || !!comp.namedPropsType;
    // propsTypeName: for named interface use it directly; for inline use ComponentProps convention
    const propsTypeName = comp.namedPropsType ?? (comp.params.length > 0 ? `${comp.name}Props` : undefined);
    const hasColorType = comp.stateSlots.some(s => s.type === 'color');
    // File banner
    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    if (hasProps) {
        if (comp.namedPropsType) {
            // Named interface: include runtime + renderer, plus user header for the struct definition
            lines.push('#include <imx/runtime.h>');
            lines.push('#include <imx/renderer.h>');
            lines.push(`#include "${comp.namedPropsType}.h"`);
            if (hasColorType) {
                lines.push('#include <array>');
            }
            // Include imported component headers
            if (imports && imports.length > 0) {
                for (const imp of imports) {
                    lines.push(`#include "${imp.headerFile}"`);
                }
            }
            // Embed image includes
            const embedKeysNamed = collectEmbedKeys(comp.body);
            for (const key of embedKeysNamed) {
                lines.push(`#include "${key}.embed.h"`);
            }
            lines.push('');
        }
        else {
            // Component with inline props: include its own header instead of redeclaring struct
            lines.push(`#include "${comp.name}.gen.h"`);
            if (hasColorType) {
                lines.push('#include <array>');
            }
            // Embed image includes
            const embedKeysProps = collectEmbedKeys(comp.body);
            for (const key of embedKeysProps) {
                lines.push(`#include "${key}.embed.h"`);
            }
            lines.push('');
        }
    }
    else {
        // No props: standard headers
        lines.push('#include <imx/runtime.h>');
        lines.push('#include <imx/renderer.h>');
        if (hasColorType) {
            lines.push('#include <array>');
        }
        // Include imported component headers
        if (imports && imports.length > 0) {
            for (const imp of imports) {
                lines.push(`#include "${imp.headerFile}"`);
            }
        }
        // Embed image includes
        const embedKeys = collectEmbedKeys(comp.body);
        for (const key of embedKeys) {
            lines.push(`#include "${key}.embed.h"`);
        }
        lines.push('');
    }
    const dockLayout = findDockLayout(comp.body);
    if (dockLayout) {
        lines.push('#include <imgui_internal.h>');
        lines.push('');
        lines.push('static bool g_layout_applied = false;');
        lines.push('static bool g_reset_layout = false;');
        lines.push('');
        lines.push('void imx_reset_layout() {');
        lines.push(`${INDENT}g_reset_layout = true;`);
        lines.push('}');
        lines.push('');
        emitDockSetupFunction(dockLayout, comp.name, lines);
    }
    // Function signature
    const propsArg = propsTypeName ? `, ${propsTypeName}& props` : '';
    lines.push(`void ${comp.name}_render(imx::RenderContext& ctx${propsArg}) {`);
    // State declarations
    for (const slot of comp.stateSlots) {
        const initVal = slot.type === 'string'
            ? `std::string(${slot.initialValue})`
            : slot.type === 'color'
                ? `std::array<float, 4>${slot.initialValue}`
                : slot.type === 'int_array'
                    ? `std::array<int, 4>${slot.initialValue}`
                    : slot.initialValue;
        lines.push(`${INDENT}auto ${slot.name} = ctx.use_state<${cppType(slot.type)}>(${initVal}, ${slot.index});`);
    }
    if (comp.stateSlots.length > 0) {
        lines.push('');
    }
    // Body IR nodes
    emitNodes(comp.body, lines, 1);
    // Post-processing: dereference bound prop reads in expressions
    if (currentBoundProps.size > 0) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trimStart().startsWith('//'))
                continue;
            for (const prop of currentBoundProps) {
                // Replace props.X reads with (*props.X) — but not &props.X or *props.X (already handled)
                const pattern = new RegExp(`(?<![&*])\\bprops\\.${prop}\\b`, 'g');
                lines[i] = lines[i].replace(pattern, `(*props.${prop})`);
            }
        }
    }
    lines.push('}');
    lines.push('');
    return lines.join('\n');
}
export function emitRoot(rootName, stateCount, bufferCount, sourceFile, propsType, namedPropsType, fontDeclarations) {
    const lines = [];
    const fonts = fontDeclarations ?? [];
    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    lines.push('#include <imx/runtime.h>');
    // Font embed includes and init function
    if (fonts.length > 0) {
        lines.push('#include <imx/renderer.h>');
        for (const f of fonts) {
            if (f.embed && f.embedKey) {
                lines.push(`#include "${f.embedKey}.embed.h"`);
            }
        }
        lines.push('');
        lines.push('void _imx_load_fonts() {');
        lines.push(`${INDENT}static bool done = false;`);
        lines.push(`${INDENT}if (done) return;`);
        lines.push(`${INDENT}done = true;`);
        for (const f of fonts) {
            if (f.embed && f.embedKey) {
                lines.push(`${INDENT}imx::load_font_embedded("${f.name}", ${f.embedKey}_data, ${f.embedKey}_size, ${f.size});`);
            }
            else {
                lines.push(`${INDENT}imx::load_font("${f.name}", "${f.src}", ${f.size});`);
            }
        }
        lines.push('}');
        lines.push('');
    }
    if (propsType) {
        if (namedPropsType) {
            // Named interface type (e.g. AppState defined in user code).
            // Include the user header so the template specialization sees the full type.
            lines.push(`#include "${propsType}.h"`);
            lines.push('');
            lines.push(`void ${rootName}_render(imx::RenderContext& ctx, ${propsType}& props);`);
        }
        else {
            lines.push(`#include "${rootName}.gen.h"`);
            lines.push('');
            lines.push(`void ${rootName}_render(imx::RenderContext& ctx, ${propsType}& props);`);
        }
        lines.push('');
        lines.push('namespace imx {');
        if (namedPropsType) {
            // Template specialization — matches the template<typename T> declaration in runtime.h
            lines.push('template <>');
            lines.push(`void render_root<${propsType}>(Runtime& runtime, ${propsType}& state) {`);
        }
        else {
            lines.push(`void render_root(Runtime& runtime, ${propsType}& state) {`);
        }
        lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
        if (fonts.length > 0) {
            lines.push(`${INDENT}_imx_load_fonts();`);
        }
        lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
        lines.push(`${INDENT}${rootName}_render(ctx, state);`);
        lines.push(`${INDENT}ctx.end_instance();`);
        lines.push(`${INDENT}runtime.end_frame();`);
        lines.push('}');
        lines.push('} // namespace imx');
    }
    else {
        lines.push('');
        lines.push(`void ${rootName}_render(imx::RenderContext& ctx);`);
        lines.push('');
        lines.push('namespace imx {');
        lines.push('void render_root(Runtime& runtime) {');
        lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
        if (fonts.length > 0) {
            lines.push(`${INDENT}_imx_load_fonts();`);
        }
        lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
        lines.push(`${INDENT}${rootName}_render(ctx);`);
        lines.push(`${INDENT}ctx.end_instance();`);
        lines.push(`${INDENT}runtime.end_frame();`);
        lines.push('}');
        lines.push('} // namespace imx');
    }
    lines.push('');
    return lines.join('\n');
}
function emitNodes(nodes, lines, depth) {
    for (const node of nodes) {
        emitNode(node, lines, depth);
    }
}
function emitNode(node, lines, depth) {
    const indent = INDENT.repeat(depth);
    switch (node.kind) {
        case 'begin_container':
            emitBeginContainer(node, lines, indent);
            break;
        case 'end_container':
            emitEndContainer(node, lines, indent);
            break;
        case 'text':
            emitText(node, lines, indent);
            break;
        case 'button':
            emitButton(node, lines, indent, depth);
            break;
        case 'small_button':
            emitSmallButton(node, lines, indent);
            break;
        case 'arrow_button':
            emitArrowButton(node, lines, indent);
            break;
        case 'invisible_button':
            emitInvisibleButton(node, lines, indent);
            break;
        case 'image_button':
            emitImageButton(node, lines, indent);
            break;
        case 'text_input':
            emitTextInput(node, lines, indent);
            break;
        case 'checkbox':
            emitCheckbox(node, lines, indent);
            break;
        case 'separator':
            lines.push(`${indent}imx::renderer::separator();`);
            break;
        case 'spacing':
            emitSpacing(node, lines, indent);
            break;
        case 'dummy':
            emitDummy(node, lines, indent);
            break;
        case 'same_line':
            emitSameLine(node, lines, indent);
            break;
        case 'new_line':
            emitNewLine(node, lines, indent);
            break;
        case 'cursor':
            emitCursor(node, lines, indent);
            break;
        case 'begin_popup':
            emitLocComment(node.loc, 'Popup', lines, indent);
            lines.push(`${indent}if (imx::renderer::begin_popup(${node.id})) {`);
            break;
        case 'end_popup':
            lines.push(`${indent}imx::renderer::end_popup();`);
            lines.push(`${indent}}`);
            break;
        case 'open_popup':
            emitLocComment(node.loc, 'OpenPopup', lines, indent);
            lines.push(`${indent}imx::renderer::open_popup(${node.id});`);
            break;
        case 'conditional':
            emitConditional(node, lines, indent, depth);
            break;
        case 'list_map':
            emitListMap(node, lines, indent, depth);
            break;
        case 'menu_item':
            emitMenuItem(node, lines, indent, depth);
            break;
        case 'begin_table':
            emitBeginTable(node, lines, indent);
            break;
        case 'end_table':
            lines.push(`${indent}imx::renderer::end_table();`);
            lines.push(`${indent}}`);
            break;
        case 'begin_table_row':
            emitBeginTableRow(node, lines, indent);
            break;
        case 'end_table_row':
            lines.push(`${indent}imx::renderer::end_table_row();`);
            break;
        case 'begin_table_cell':
            emitBeginTableCell(node, lines, indent);
            break;
        case 'end_table_cell':
            lines.push(`${indent}imx::renderer::end_table_cell();`);
            break;
        case 'begin_tree_node':
            emitBeginTreeNode(node, lines, indent);
            break;
        case 'end_tree_node':
            emitEndTreeNode(node, lines, indent);
            break;
        case 'begin_collapsing_header':
            emitBeginCollapsingHeader(node, lines, indent);
            break;
        case 'end_collapsing_header':
            emitEndCollapsingHeader(node, lines, indent);
            break;
        case 'custom_component':
            emitCustomComponent(node, lines, indent);
            break;
        case 'slider_float':
            emitSliderFloat(node, lines, indent);
            break;
        case 'slider_int':
            emitSliderInt(node, lines, indent);
            break;
        case 'drag_float':
            emitDragFloat(node, lines, indent);
            break;
        case 'drag_int':
            emitDragInt(node, lines, indent);
            break;
        case 'begin_combo': {
            const n = node;
            emitLocComment(n.loc, 'Combo (manual)', lines, indent);
            const label = asCharPtr(n.label);
            const preview = asCharPtr(n.preview);
            const flagStr = n.flags.length > 0 ? n.flags.join(' | ') : '0';
            if (n.width) {
                lines.push(`${indent}ImGui::PushItemWidth(${n.width});`);
            }
            lines.push(`${indent}if (imx::renderer::begin_combo(${label}, ${preview}, ${flagStr})) {`);
            break;
        }
        case 'end_combo':
            lines.push(`${indent}imx::renderer::end_combo();`);
            lines.push(`${indent}}`);
            break;
        case 'begin_list_box': {
            const n = node;
            emitLocComment(n.loc, 'ListBox (manual)', lines, indent);
            const label = asCharPtr(n.label);
            const w = n.width ?? '0.0f';
            const h = n.height ?? '0.0f';
            lines.push(`${indent}if (imx::renderer::begin_list_box(${label}, ${w}, ${h})) {`);
            break;
        }
        case 'end_list_box':
            lines.push(`${indent}imx::renderer::end_list_box();`);
            lines.push(`${indent}}`);
            break;
        case 'combo':
            emitCombo(node, lines, indent);
            break;
        case 'input_int':
            emitInputInt(node, lines, indent);
            break;
        case 'input_float':
            emitInputFloat(node, lines, indent);
            break;
        case 'color_edit':
            emitColorEdit(node, lines, indent);
            break;
        case 'color_edit3':
            emitColorEdit3(node, lines, indent);
            break;
        case 'list_box':
            emitListBox(node, lines, indent);
            break;
        case 'progress_bar':
            emitProgressBar(node, lines, indent);
            break;
        case 'tooltip':
            emitTooltip(node, lines, indent);
            break;
        case 'shortcut':
            emitShortcut(node, lines, indent);
            break;
        case 'bullet_text':
            emitBulletText(node, lines, indent);
            break;
        case 'bullet':
            emitLocComment(node.loc, 'Bullet', lines, indent);
            lines.push(`${indent}imx::renderer::bullet();`);
            break;
        case 'label_text':
            emitLabelText(node, lines, indent);
            break;
        case 'selectable':
            emitSelectable(node, lines, indent);
            break;
        case 'radio':
            emitRadio(node, lines, indent);
            break;
        case 'input_text_multiline':
            emitInputTextMultiline(node, lines, indent);
            break;
        case 'color_picker':
            emitColorPicker(node, lines, indent);
            break;
        case 'color_picker3':
            emitColorPicker3(node, lines, indent);
            break;
        case 'plot_lines':
            emitPlotLines(node, lines, indent);
            break;
        case 'plot_histogram':
            emitPlotHistogram(node, lines, indent);
            break;
        case 'image':
            emitImage(node, lines, indent);
            break;
        case 'draw_line':
            emitDrawLine(node, lines, indent);
            break;
        case 'draw_rect':
            emitDrawRect(node, lines, indent);
            break;
        case 'draw_circle':
            emitDrawCircle(node, lines, indent);
            break;
        case 'draw_text':
            emitDrawText(node, lines, indent);
            break;
        case 'draw_bezier_cubic':
            emitDrawBezierCubic(node, lines, indent);
            break;
        case 'draw_bezier_quadratic':
            emitDrawBezierQuadratic(node, lines, indent);
            break;
        case 'draw_polyline':
            emitDrawPolyline(node, lines, indent);
            break;
        case 'draw_convex_poly_filled':
            emitDrawConvexPolyFilled(node, lines, indent);
            break;
        case 'draw_ngon':
            emitDrawNgon(node, lines, indent);
            break;
        case 'draw_ngon_filled':
            emitDrawNgonFilled(node, lines, indent);
            break;
        case 'draw_triangle':
            emitDrawTriangle(node, lines, indent);
            break;
        case 'input_float_n':
            emitVectorInput(node, 'input_float_n', 'float', lines, indent);
            break;
        case 'input_int_n':
            emitVectorInput(node, 'input_int_n', 'int', lines, indent);
            break;
        case 'drag_float_n': {
            const speed = ensureFloatLiteral(node.speed);
            emitVectorInput(node, 'drag_float_n', 'float', lines, indent, `, ${speed}`);
            break;
        }
        case 'drag_int_n': {
            const speed = ensureFloatLiteral(node.speed);
            emitVectorInput(node, 'drag_int_n', 'int', lines, indent, `, ${speed}`);
            break;
        }
        case 'slider_float_n': {
            const min = ensureFloatLiteral(node.min);
            const max = ensureFloatLiteral(node.max);
            emitVectorInput(node, 'slider_float_n', 'float', lines, indent, `, ${min}, ${max}`);
            break;
        }
        case 'slider_int_n': {
            emitVectorInput(node, 'slider_int_n', 'int', lines, indent, `, ${node.min}, ${node.max}`);
            break;
        }
        case 'vslider_float':
            emitVSliderFloat(node, lines, indent);
            break;
        case 'vslider_int':
            emitVSliderInt(node, lines, indent);
            break;
        case 'slider_angle':
            emitSliderAngle(node, lines, indent);
            break;
        case 'native_widget':
            emitNativeWidget(node, lines, indent);
            break;
        case 'dock_layout': {
            lines.push(`${indent}{`);
            lines.push(`${indent}${INDENT}ImGuiID dock_id = ImGui::GetID("MainDockSpace");`);
            lines.push(`${indent}${INDENT}if (g_reset_layout) {`);
            lines.push(`${indent}${INDENT}${INDENT}${currentCompName}_setup_dock_layout(dock_id);`);
            lines.push(`${indent}${INDENT}${INDENT}g_reset_layout = false;`);
            lines.push(`${indent}${INDENT}} else if (!g_layout_applied) {`);
            lines.push(`${indent}${INDENT}${INDENT}g_layout_applied = true;`);
            lines.push(`${indent}${INDENT}${INDENT}ImGuiDockNode* node = ImGui::DockBuilderGetNode(dock_id);`);
            lines.push(`${indent}${INDENT}${INDENT}if (node == nullptr || !node->IsSplitNode()) {`);
            lines.push(`${indent}${INDENT}${INDENT}${INDENT}${currentCompName}_setup_dock_layout(dock_id);`);
            lines.push(`${indent}${INDENT}${INDENT}}`);
            lines.push(`${indent}${INDENT}}`);
            lines.push(`${indent}}`);
            break;
        }
    }
}
let styleCounter = 0;
let customComponentCounter = 0;
let checkboxCounter = 0;
let comboCounter = 0;
let listBoxCounter = 0;
let nativeWidgetCounter = 0;
let plotCounter = 0;
let widgetTempCounter = 0;
const windowOpenStack = []; // tracks if begin_window used open prop
const modalOnCloseStack = []; // tracks modal onClose expressions
const collapsingHeaderOnCloseStack = [];
const dragDropSourceStack = [];
const dragDropTargetStack = [];
const multiSelectCallbackStack = [];
/**
 * Build a Style variable from a raw style expression string for self-closing components.
 * Handles JS-like object literals: { width: 300, height: 100 } -> imx::Style with assignments.
 * Returns the variable name, or null if no style.
 */
/**
 * Split a comma-separated list of key:value pairs in a style object literal,
 * respecting brackets so that array values like [0.1, 0.1, 0.1, 1.0] are not split.
 */
function splitStylePairs(inner) {
    const pairs = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '[' || ch === '(')
            depth++;
        else if (ch === ']' || ch === ')')
            depth--;
        else if (ch === ',' && depth === 0) {
            const piece = inner.substring(start, i).trim();
            if (piece)
                pairs.push(piece);
            start = i + 1;
        }
    }
    const last = inner.substring(start).trim();
    if (last)
        pairs.push(last);
    return pairs;
}
function assignStyleExpr(varName, styleExpr, indent, lines) {
    const trimmed = styleExpr.trim();
    if (!trimmed)
        return;
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        lines.push(`${indent}${varName} = ${trimmed};`);
        return;
    }
    const inner = trimmed.slice(1, -1).trim();
    if (!inner)
        return;
    const pairs = splitStylePairs(inner);
    for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1)
            continue;
        const key = pair.substring(0, colonIdx).trim();
        const val = pair.substring(colonIdx + 1).trim();
        const cppKey = key === 'paddingHorizontal' ? 'padding_horizontal'
            : key === 'paddingVertical' ? 'padding_vertical'
                : key === 'minWidth' ? 'min_width'
                    : key === 'minHeight' ? 'min_height'
                        : key === 'backgroundColor' ? 'background_color'
                            : key === 'textColor' ? 'text_color'
                                : key === 'fontSize' ? 'font_size'
                                    : key;
        if (cppKey === 'background_color' || cppKey === 'text_color') {
            const arrInner = val.trim().replace(/^\[/, '').replace(/\]$/, '');
            const components = arrInner.split(',').map(c => {
                const s = c.trim();
                return /^-?\d+(\.\d+)?$/.test(s) ? (s.includes('.') ? `${s}f` : `${s}.0f`) : s;
            });
            lines.push(`${indent}${varName}.${cppKey} = ImVec4(${components.join(', ')});`);
        }
        else {
            lines.push(`${indent}${varName}.${cppKey} = ${emitFloat(val)};`);
        }
    }
}
function buildStyleVar(styleExpr, indent, lines) {
    if (!styleExpr)
        return null;
    const varName = `style_${styleCounter++}`;
    lines.push(`${indent}imx::Style ${varName};`);
    assignStyleExpr(varName, styleExpr, indent, lines);
    return varName;
}
function buildWidgetStyleVar(styleExpr, widthExpr, indent, lines) {
    if (!styleExpr && !widthExpr)
        return null;
    const varName = `style_${styleCounter++}`;
    lines.push(`${indent}imx::Style ${varName};`);
    if (styleExpr) {
        assignStyleExpr(varName, styleExpr, indent, lines);
    }
    if (widthExpr) {
        lines.push(`${indent}${varName}.width = ${emitFloat(widthExpr)};`);
    }
    return varName;
}
function nextWidgetTemp(prefix) {
    return `_${prefix}_${widgetTempCounter++}`;
}
function emitActionStatements(statements, lines, indent) {
    if (!statements)
        return;
    for (const stmt of statements) {
        lines.push(`${indent}${stmt}`);
    }
}
function emitItemInteractionBefore(item, lines, indent) {
    if (!item?.autoFocus)
        return;
    lines.push(`${indent}if (${item.autoFocus}) imx::renderer::request_keyboard_focus();`);
}
function emitItemInteractionAfter(item, lines, indent) {
    if (!item)
        return;
    if (item.tooltip) {
        lines.push(`${indent}imx::renderer::tooltip(${asCharPtr(item.tooltip)});`);
    }
    if (item.scrollToHere) {
        lines.push(`${indent}if (${item.scrollToHere}) imx::renderer::item_scroll_to_here();`);
    }
    if (item.cursor) {
        lines.push(`${indent}imx::renderer::item_cursor(${asCharPtr(item.cursor)});`);
    }
    const callbackChecks = [
        [item.onHover, 'item_hovered'],
        [item.onActive, 'item_active'],
        [item.onFocused, 'item_focused'],
        [item.onClicked, 'item_clicked'],
        [item.onDoubleClicked, 'item_double_clicked'],
    ];
    for (const [statements, fn] of callbackChecks) {
        if (!statements || statements.length === 0)
            continue;
        lines.push(`${indent}if (imx::renderer::${fn}()) {`);
        emitActionStatements(statements, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitBoolWidgetCall(callExpr, item, lines, indent, resultVar) {
    emitItemInteractionBefore(item, lines, indent);
    if (item || resultVar) {
        const varName = resultVar ?? nextWidgetTemp('item');
        lines.push(`${indent}bool ${varName} = ${callExpr};`);
        emitItemInteractionAfter(item, lines, indent);
        return varName;
    }
    lines.push(`${indent}${callExpr};`);
    return null;
}
function buildStyleBlock(node, indent, lines) {
    // Check for style-related props (gap, padding, width, height, etc.)
    const styleProps = {};
    for (const [key, val] of Object.entries(node.props)) {
        if (['gap', 'padding', 'paddingHorizontal', 'paddingVertical', 'width', 'height', 'minWidth', 'minHeight'].includes(key)) {
            // Map camelCase to snake_case for C++ Style struct
            const cppKey = key === 'paddingHorizontal' ? 'padding_horizontal'
                : key === 'paddingVertical' ? 'padding_vertical'
                    : key === 'minWidth' ? 'min_width'
                        : key === 'minHeight' ? 'min_height'
                            : key;
            styleProps[cppKey] = val;
        }
    }
    // Also check node.style (explicit style prop) — route through buildStyleVar to handle
    // object literals like { backgroundColor: [r,g,b,a] } safely
    const explicitStyle = node.style ?? node.props['style'];
    if (explicitStyle) {
        return buildStyleVar(explicitStyle, indent, lines);
    }
    if (Object.keys(styleProps).length === 0) {
        return null;
    }
    // Generate MSVC-compatible style construction
    const varName = `style_${styleCounter++}`;
    lines.push(`${indent}imx::Style ${varName};`);
    for (const [key, val] of Object.entries(styleProps)) {
        lines.push(`${indent}${varName}.${key} = ${emitFloat(val)};`);
    }
    return varName;
}
function emitTableOptions(node, varName, indent, lines) {
    lines.push(`${indent}imx::TableOptions ${varName};`);
    if (node.sortable || node.onSortBody)
        lines.push(`${indent}${varName}.sortable = ${node.sortable ?? 'true'};`);
    if (node.hideable)
        lines.push(`${indent}${varName}.hideable = ${node.hideable};`);
    if (node.multiSortable)
        lines.push(`${indent}${varName}.multi_sortable = ${node.multiSortable};`);
    if (node.noClip)
        lines.push(`${indent}${varName}.no_clip = ${node.noClip};`);
    if (node.padOuterX)
        lines.push(`${indent}${varName}.pad_outer_x = ${node.padOuterX};`);
    if (node.scrollX)
        lines.push(`${indent}${varName}.scroll_x = ${node.scrollX};`);
    if (node.scrollY)
        lines.push(`${indent}${varName}.scroll_y = ${node.scrollY};`);
    if (node.noBorders)
        lines.push(`${indent}${varName}.no_borders = ${node.noBorders};`);
    if (node.noRowBg)
        lines.push(`${indent}${varName}.no_row_bg = ${node.noRowBg};`);
}
function emitBeginTable(node, lines, indent) {
    emitLocComment(node.loc, 'Table', lines, indent);
    const colsVar = `table_cols_${styleCounter++}`;
    const optsVar = `table_opts_${styleCounter++}`;
    const style = node.style ? buildStyleVar(node.style, indent, lines) : null;
    lines.push(`${indent}imx::TableColumn ${colsVar}[${node.columns.length}];`);
    node.columns.forEach((column, index) => {
        lines.push(`${indent}${colsVar}[${index}].label = ${asCharPtr(column.label)};`);
        if (column.defaultHide)
            lines.push(`${indent}if (${column.defaultHide}) ${colsVar}[${index}].flags |= ImGuiTableColumnFlags_DefaultHide;`);
        if (column.preferSortAscending)
            lines.push(`${indent}if (${column.preferSortAscending}) ${colsVar}[${index}].flags |= ImGuiTableColumnFlags_PreferSortAscending;`);
        if (column.preferSortDescending)
            lines.push(`${indent}if (${column.preferSortDescending}) ${colsVar}[${index}].flags |= ImGuiTableColumnFlags_PreferSortDescending;`);
        if (column.noResize)
            lines.push(`${indent}if (${column.noResize}) ${colsVar}[${index}].flags |= ImGuiTableColumnFlags_NoResize;`);
        if (column.fixedWidth)
            lines.push(`${indent}if (${column.fixedWidth}) ${colsVar}[${index}].flags |= ImGuiTableColumnFlags_WidthFixed;`);
    });
    emitTableOptions(node, optsVar, indent, lines);
    const styleArg = style ?? '{}';
    lines.push(`${indent}if (imx::renderer::begin_table("##table", ${colsVar}, ${node.columns.length}, ${styleArg}, ${optsVar})) {`);
    if (node.onSortBody) {
        const paramName = node.onSortParam ?? 'tableSortSpecs';
        lines.push(`${indent}${INDENT}if (ImGuiTableSortSpecs* _imx_sort_specs = ImGui::TableGetSortSpecs()) {`);
        lines.push(`${indent}${INDENT}${INDENT}if (_imx_sort_specs->SpecsDirty) {`);
        lines.push(`${indent}${INDENT}${INDENT}${INDENT}ImGuiTableSortSpecs& ${paramName} = *_imx_sort_specs;`);
        lines.push(`${indent}${INDENT}${INDENT}${INDENT}${node.onSortBody}`);
        lines.push(`${indent}${INDENT}${INDENT}${INDENT}_imx_sort_specs->SpecsDirty = false;`);
        lines.push(`${indent}${INDENT}${INDENT}}`);
        lines.push(`${indent}${INDENT}}`);
    }
}
function emitBeginTableRow(node, lines, indent) {
    emitLocComment(node.loc, 'TableRow', lines, indent);
    if (node.bgColor) {
        lines.push(`${indent}imx::renderer::begin_table_row(${emitImVec4(node.bgColor)});`);
    }
    else {
        lines.push(`${indent}imx::renderer::begin_table_row();`);
    }
}
function emitBeginTableCell(node, lines, indent) {
    emitLocComment(node.loc, 'TableCell', lines, indent);
    const columnIndex = node.columnIndex ?? '-1';
    if (node.bgColor) {
        lines.push(`${indent}imx::renderer::begin_table_cell(${columnIndex}, ${emitImVec4(node.bgColor)});`);
    }
    else {
        lines.push(`${indent}imx::renderer::begin_table_cell(${columnIndex});`);
    }
}
function emitBeginTreeNode(node, lines, indent) {
    emitLocComment(node.loc, 'TreeNode', lines, indent);
    if (node.forceOpen) {
        lines.push(`${indent}ImGui::SetNextItemOpen(${node.forceOpen}, ImGuiCond_Always);`);
    }
    else if (node.defaultOpen) {
        lines.push(`${indent}ImGui::SetNextItemOpen(${node.defaultOpen}, ImGuiCond_Once);`);
    }
    const flagsVar = `tree_flags_${styleCounter++}`;
    lines.push(`${indent}ImGuiTreeNodeFlags ${flagsVar} = 0;`);
    if (node.defaultOpen)
        lines.push(`${indent}if (${node.defaultOpen}) ${flagsVar} |= ImGuiTreeNodeFlags_DefaultOpen;`);
    if (node.openOnArrow)
        lines.push(`${indent}if (${node.openOnArrow}) ${flagsVar} |= ImGuiTreeNodeFlags_OpenOnArrow;`);
    if (node.openOnDoubleClick)
        lines.push(`${indent}if (${node.openOnDoubleClick}) ${flagsVar} |= ImGuiTreeNodeFlags_OpenOnDoubleClick;`);
    if (node.leaf)
        lines.push(`${indent}if (${node.leaf}) ${flagsVar} |= ImGuiTreeNodeFlags_Leaf;`);
    if (node.bullet)
        lines.push(`${indent}if (${node.bullet}) ${flagsVar} |= ImGuiTreeNodeFlags_Bullet;`);
    if (node.noTreePushOnOpen)
        lines.push(`${indent}if (${node.noTreePushOnOpen}) ${flagsVar} |= ImGuiTreeNodeFlags_NoTreePushOnOpen;`);
    emitItemInteractionBefore(node.item, lines, indent);
    const openVar = nextWidgetTemp('tree_open');
    lines.push(`${indent}bool ${openVar} = imx::renderer::begin_tree_node(${asCharPtr(node.label)}, ${flagsVar});`);
    emitItemInteractionAfter(node.item, lines, indent);
    lines.push(`${indent}if (${openVar}) {`);
}
function emitEndTreeNode(node, lines, indent) {
    lines.push(`${indent}imx::renderer::end_tree_node(${node.noTreePushOnOpen ?? 'false'});`);
    lines.push(`${indent}}`);
}
function emitBeginCollapsingHeader(node, lines, indent) {
    emitLocComment(node.loc, 'CollapsingHeader', lines, indent);
    if (node.forceOpen) {
        lines.push(`${indent}ImGui::SetNextItemOpen(${node.forceOpen}, ImGuiCond_Always);`);
    }
    else if (node.defaultOpen) {
        lines.push(`${indent}ImGui::SetNextItemOpen(${node.defaultOpen}, ImGuiCond_Once);`);
    }
    const flagsVar = `header_flags_${styleCounter++}`;
    lines.push(`${indent}ImGuiTreeNodeFlags ${flagsVar} = 0;`);
    if (node.defaultOpen)
        lines.push(`${indent}if (${node.defaultOpen}) ${flagsVar} |= ImGuiTreeNodeFlags_DefaultOpen;`);
    if (node.closable) {
        collapsingHeaderOnCloseStack.push(node.onCloseBody ?? null);
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}bool header_visible = true;`);
        lines.push(`${indent}${INDENT}bool* header_visible_ptr = ${node.closable} ? &header_visible : nullptr;`);
        emitItemInteractionBefore(node.item, lines, indent + INDENT);
        const openVar = nextWidgetTemp('header_open');
        lines.push(`${indent}${INDENT}bool ${openVar} = imx::renderer::begin_collapsing_header(${asCharPtr(node.label)}, ${flagsVar}, header_visible_ptr);`);
        emitItemInteractionAfter(node.item, lines, indent + INDENT);
        lines.push(`${indent}${INDENT}if (${openVar}) {`);
    }
    else {
        collapsingHeaderOnCloseStack.push(null);
        emitItemInteractionBefore(node.item, lines, indent);
        const openVar = nextWidgetTemp('header_open');
        lines.push(`${indent}bool ${openVar} = imx::renderer::begin_collapsing_header(${asCharPtr(node.label)}, ${flagsVar});`);
        emitItemInteractionAfter(node.item, lines, indent);
        lines.push(`${indent}if (${openVar}) {`);
    }
}
function emitEndCollapsingHeader(node, lines, indent) {
    lines.push(`${indent}imx::renderer::end_collapsing_header();`);
    lines.push(`${indent}}`);
    const onCloseBody = collapsingHeaderOnCloseStack.pop() ?? null;
    if (node.closable) {
        if (onCloseBody) {
            lines.push(`${indent}${INDENT}if (${node.closable} && !header_visible) { ${onCloseBody} }`);
        }
        lines.push(`${indent}}`);
    }
}
function emitBeginContainer(node, lines, indent) {
    emitLocComment(node.loc, node.tag, lines, indent);
    switch (node.tag) {
        case 'Window': {
            const title = asCharPtr(node.props['title'] ?? '""');
            const flagParts = [];
            if (node.props['noTitleBar'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoTitleBar');
            if (node.props['noResize'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoResize');
            if (node.props['noMove'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoMove');
            if (node.props['noCollapse'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoCollapse');
            if (node.props['noDocking'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoDocking');
            if (node.props['noScrollbar'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoScrollbar');
            if (node.props['noBackground'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoBackground');
            if (node.props['alwaysAutoResize'] === 'true')
                flagParts.push('ImGuiWindowFlags_AlwaysAutoResize');
            if (node.props['noNavFocus'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoNavFocus');
            if (node.props['noNav'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoNav');
            if (node.props['noDecoration'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoDecoration');
            if (node.props['noInputs'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoInputs');
            if (node.props['noScrollWithMouse'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoScrollWithMouse');
            if (node.props['horizontalScrollbar'] === 'true')
                flagParts.push('ImGuiWindowFlags_HorizontalScrollbar');
            if (node.props['alwaysVerticalScrollbar'] === 'true')
                flagParts.push('ImGuiWindowFlags_AlwaysVerticalScrollbar');
            if (node.props['alwaysHorizontalScrollbar'] === 'true')
                flagParts.push('ImGuiWindowFlags_AlwaysHorizontalScrollbar');
            if (node.props['hasMenuBar'] === 'true')
                flagParts.push('ImGuiWindowFlags_MenuBar');
            const flags = flagParts.length > 0 ? flagParts.join(' | ') : '0';
            // Window positioning
            const xExpr = node.props['x'];
            const yExpr = node.props['y'];
            if (xExpr && yExpr) {
                const posCond = node.props['forcePosition'] === 'true' ? 'ImGuiCond_Always' : 'ImGuiCond_Once';
                lines.push(`${indent}ImGui::SetNextWindowPos(ImVec2(${xExpr}, ${yExpr}), ${posCond});`);
            }
            // Window sizing
            const wExpr = node.props['width'];
            const hExpr = node.props['height'];
            if (wExpr || hExpr) {
                const sizeCond = node.props['forceSize'] === 'true' ? 'ImGuiCond_Always' : 'ImGuiCond_Once';
                const sw = wExpr ?? '0.0f';
                const sh = hExpr ?? '0.0f';
                lines.push(`${indent}ImGui::SetNextWindowSize(ImVec2(${sw}, ${sh}), ${sizeCond});`);
            }
            // Window size constraints
            const minW = node.props['minWidth'];
            const minH = node.props['minHeight'];
            const maxW = node.props['maxWidth'];
            const maxH = node.props['maxHeight'];
            if (minW || minH || maxW || maxH) {
                const cminW = minW ?? '0.0f';
                const cminH = minH ?? '0.0f';
                const cmaxW = maxW ?? 'FLT_MAX';
                const cmaxH = maxH ?? 'FLT_MAX';
                lines.push(`${indent}ImGui::SetNextWindowSizeConstraints(ImVec2(${cminW}, ${cminH}), ImVec2(${cmaxW}, ${cmaxH}));`);
            }
            // Window background alpha
            const bgAlpha = node.props['bgAlpha'];
            if (bgAlpha) {
                lines.push(`${indent}ImGui::SetNextWindowBgAlpha(${bgAlpha});`);
            }
            // Viewport control
            if (node.props['noViewport'] === 'true') {
                lines.push(`${indent}ImGui::SetNextWindowViewport(ImGui::GetMainViewport()->ID);`);
            }
            const openExpr = node.props['open'];
            const onCloseExpr = node.props['onClose'];
            if (openExpr) {
                const vpOnTop = node.props['viewportAlwaysOnTop'] === 'true';
                windowOpenStack.push(true);
                lines.push(`${indent}{`);
                lines.push(`${indent}    bool win_open = ${openExpr};`);
                lines.push(`${indent}    imx::renderer::begin_window(${title}, ${flags}, &win_open${vpOnTop ? ', true' : ''});`);
                if (onCloseExpr) {
                    const lambdaMatch = onCloseExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\s*\}$/);
                    const onCloseBody = lambdaMatch ? lambdaMatch[1] : `${onCloseExpr}();`;
                    lines.push(`${indent}    if (!win_open) { ${onCloseBody} }`);
                }
            }
            else {
                const vpOnTopElse = node.props['viewportAlwaysOnTop'] === 'true';
                windowOpenStack.push(false);
                if (vpOnTopElse) {
                    lines.push(`${indent}imx::renderer::begin_window(${title}, ${flags}, nullptr, true);`);
                }
                else {
                    lines.push(`${indent}imx::renderer::begin_window(${title}, ${flags});`);
                }
            }
            break;
        }
        case 'Row': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_row(${style});`);
            }
            else {
                lines.push(`${indent}imx::renderer::begin_row();`);
            }
            break;
        }
        case 'Column': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_column(${style});`);
            }
            else {
                lines.push(`${indent}imx::renderer::begin_column();`);
            }
            break;
        }
        case 'View': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_view(${style});`);
            }
            else {
                lines.push(`${indent}imx::renderer::begin_view();`);
            }
            break;
        }
        case 'Indent': {
            const width = node.props['width'] ? emitFloat(node.props['width']) : '0.0F';
            lines.push(`${indent}imx::renderer::begin_indent(${width});`);
            break;
        }
        case 'TextWrap': {
            lines.push(`${indent}imx::renderer::begin_text_wrap(${emitFloat(node.props['width'] ?? '0')});`);
            break;
        }
        case 'DockSpace': {
            const style = buildStyleBlock(node, indent, lines);
            const hasMenuBar = node.props['hasMenuBar'] === 'true';
            if (hasMenuBar) {
                lines.push(`${indent}imx::renderer::begin_dockspace(${style ?? '{}'}, true);`);
            }
            else if (style) {
                lines.push(`${indent}imx::renderer::begin_dockspace(${style});`);
            }
            else {
                lines.push(`${indent}imx::renderer::begin_dockspace();`);
            }
            break;
        }
        case 'MainMenuBar': {
            lines.push(`${indent}if (imx::renderer::begin_main_menu_bar()) {`);
            break;
        }
        case 'MenuBar': {
            lines.push(`${indent}if (imx::renderer::begin_menu_bar()) {`);
            break;
        }
        case 'Menu': {
            const label = asCharPtr(node.props['label'] ?? '""');
            lines.push(`${indent}if (imx::renderer::begin_menu(${label})) {`);
            break;
        }
        case 'TabBar': {
            lines.push(`${indent}if (imx::renderer::begin_tab_bar()) {`);
            break;
        }
        case 'TabItem': {
            const label = asCharPtr(node.props['label'] ?? '""');
            lines.push(`${indent}if (imx::renderer::begin_tab_item(${label})) {`);
            break;
        }
        case 'Theme': {
            const preset = asCharPtr(node.props['preset'] ?? '"dark"');
            const varName = `theme_${styleCounter++}`;
            lines.push(`${indent}imx::ThemeConfig ${varName};`);
            if (node.props['accentColor']) {
                lines.push(`${indent}${varName}.accent_color = ${emitImVec4(node.props['accentColor'])};`);
            }
            if (node.props['backgroundColor']) {
                lines.push(`${indent}${varName}.background_color = ${emitImVec4(node.props['backgroundColor'])};`);
            }
            if (node.props['textColor']) {
                lines.push(`${indent}${varName}.text_color = ${emitImVec4(node.props['textColor'])};`);
            }
            if (node.props['borderColor']) {
                lines.push(`${indent}${varName}.border_color = ${emitImVec4(node.props['borderColor'])};`);
            }
            if (node.props['surfaceColor']) {
                lines.push(`${indent}${varName}.surface_color = ${emitImVec4(node.props['surfaceColor'])};`);
            }
            if (node.props['rounding']) {
                lines.push(`${indent}${varName}.rounding = ${emitFloat(node.props['rounding'])};`);
            }
            if (node.props['borderSize']) {
                lines.push(`${indent}${varName}.border_size = ${emitFloat(node.props['borderSize'])};`);
            }
            if (node.props['spacing']) {
                lines.push(`${indent}${varName}.spacing = ${emitFloat(node.props['spacing'])};`);
            }
            lines.push(`${indent}imx::renderer::begin_theme(${preset}, ${varName});`);
            break;
        }
        case 'Modal': {
            const title = asCharPtr(node.props['title'] ?? '""');
            // Build modal flags
            const flagParts = [];
            if (node.props['noTitleBar'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoTitleBar');
            if (node.props['noResize'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoResize');
            if (node.props['noMove'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoMove');
            if (node.props['noScrollbar'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoScrollbar');
            if (node.props['noCollapse'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoCollapse');
            if (node.props['alwaysAutoResize'] === 'true')
                flagParts.push('ImGuiWindowFlags_AlwaysAutoResize');
            if (node.props['noBackground'] === 'true')
                flagParts.push('ImGuiWindowFlags_NoBackground');
            if (node.props['horizontalScrollbar'] === 'true')
                flagParts.push('ImGuiWindowFlags_HorizontalScrollbar');
            const modalFlags = flagParts.length > 0 ? flagParts.join(' | ') : '0';
            const openExpr = node.props['open'];
            const onCloseExpr = node.props['onClose'];
            if (openExpr) {
                windowOpenStack.push(true);
                // Extract onClose body for use in end emitter
                let onCloseBody = null;
                if (onCloseExpr) {
                    const lambdaMatch = onCloseExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\s*\}$/);
                    onCloseBody = lambdaMatch ? lambdaMatch[1] : `${onCloseExpr};`;
                }
                modalOnCloseStack.push(onCloseBody);
                lines.push(`${indent}{`);
                lines.push(`${indent}    bool modal_closed = false;`);
                lines.push(`${indent}    if (imx::renderer::begin_modal(${title}, ${openExpr}, &modal_closed, ${modalFlags})) {`);
            }
            else {
                windowOpenStack.push(false);
                modalOnCloseStack.push(null);
                lines.push(`${indent}if (imx::renderer::begin_modal(${title}, true, nullptr, ${modalFlags})) {`);
            }
            break;
        }
        case 'StyleColor': {
            const varName = `sc_${styleCounter++}`;
            lines.push(`${indent}imx::StyleColorOverrides ${varName};`);
            const colorProps = [
                ['text', 'text'], ['textDisabled', 'text_disabled'],
                ['windowBg', 'window_bg'], ['frameBg', 'frame_bg'],
                ['frameBgHovered', 'frame_bg_hovered'], ['frameBgActive', 'frame_bg_active'],
                ['titleBg', 'title_bg'], ['titleBgActive', 'title_bg_active'],
                ['button', 'button'], ['buttonHovered', 'button_hovered'],
                ['buttonActive', 'button_active'], ['header', 'header'],
                ['headerHovered', 'header_hovered'], ['headerActive', 'header_active'],
                ['separator', 'separator'], ['checkMark', 'check_mark'],
                ['sliderGrab', 'slider_grab'], ['border', 'border'],
                ['popupBg', 'popup_bg'], ['tab', 'tab'],
            ];
            for (const [tsName, cppName] of colorProps) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitImVec4(node.props[tsName])};`);
                }
            }
            lines.push(`${indent}imx::renderer::begin_style_color(${varName});`);
            break;
        }
        case 'StyleVar': {
            const varName = `sv_${styleCounter++}`;
            lines.push(`${indent}imx::StyleVarOverrides ${varName};`);
            const floatProps = [
                ['alpha', 'alpha'], ['windowRounding', 'window_rounding'],
                ['frameRounding', 'frame_rounding'], ['frameBorderSize', 'frame_border_size'],
                ['indentSpacing', 'indent_spacing'], ['tabRounding', 'tab_rounding'],
            ];
            for (const [tsName, cppName] of floatProps) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitFloat(node.props[tsName])};`);
                }
            }
            const vec2Props = [
                ['windowPadding', 'window_padding'], ['framePadding', 'frame_padding'],
                ['itemSpacing', 'item_spacing'], ['itemInnerSpacing', 'item_inner_spacing'],
                ['cellPadding', 'cell_padding'],
            ];
            for (const [tsName, cppName] of vec2Props) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitImVec2(node.props[tsName])};`);
                }
            }
            lines.push(`${indent}imx::renderer::begin_style_var(${varName});`);
            break;
        }
        case 'Group': {
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
        case 'ID': {
            const scope = node.props['scope'] ?? '""';
            if (scope.startsWith('"')) {
                lines.push(`${indent}ImGui::PushID(${scope});`);
            }
            else {
                lines.push(`${indent}ImGui::PushID(static_cast<int>(${scope}));`);
            }
            break;
        }
        case 'DragDropSource': {
            dragDropSourceStack.push(node.props);
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
        case 'DragDropTarget': {
            dragDropTargetStack.push(node.props);
            lines.push(`${indent}ImGui::BeginGroup();`);
            break;
        }
        case 'Disabled': {
            const disabled = node.props['disabled'] ?? 'true';
            lines.push(`${indent}ImGui::BeginDisabled(${disabled});`);
            break;
        }
        case 'Child': {
            const id = asCharPtr(node.props['id'] ?? '"##child"');
            const width = emitFloat(node.props['width'] ?? '0');
            const height = emitFloat(node.props['height'] ?? '0');
            const border = node.props['border'] === 'true' ? 'true' : 'false';
            lines.push(`${indent}ImGui::BeginChild(${id}, ImVec2(${width}, ${height}), ${border});`);
            break;
        }
        case 'Canvas': {
            const width = emitFloat(node.props['width'] ?? '0');
            const height = emitFloat(node.props['height'] ?? '0');
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_canvas(${width}, ${height}, ${style});`);
            }
            else {
                lines.push(`${indent}imx::renderer::begin_canvas(${width}, ${height});`);
            }
            break;
        }
        case 'Font': {
            const name = asCharPtr(node.props['name'] ?? '""');
            lines.push(`${indent}imx::renderer::begin_font(${name});`);
            break;
        }
        case 'ContextMenu': {
            const idExpr = node.props['id'];
            const idArg = idExpr ? asCharPtr(idExpr) : 'nullptr';
            const mbExpr = node.props['mouseButton'];
            let mouseButtonArg = '1'; // default: right click
            if (mbExpr === '"left"')
                mouseButtonArg = '0';
            else if (mbExpr === '"middle"')
                mouseButtonArg = '2';
            if (node.props['target'] === '"window"') {
                lines.push(`${indent}if (imx::renderer::begin_context_menu_window(${idArg}, ${mouseButtonArg})) {`);
            }
            else {
                lines.push(`${indent}if (imx::renderer::begin_context_menu_item(${idArg}, ${mouseButtonArg})) {`);
            }
            break;
        }
        case 'MultiSelect': {
            const flagParts = [];
            if (node.props['singleSelect'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_SingleSelect');
            if (node.props['noSelectAll'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_NoSelectAll');
            if (node.props['noRangeSelect'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_NoRangeSelect');
            if (node.props['noAutoSelect'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_NoAutoSelect');
            if (node.props['noAutoClear'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_NoAutoClear');
            if (node.props['boxSelect'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_BoxSelect1d');
            if (node.props['boxSelect2d'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_BoxSelect2d');
            if (node.props['boxSelectNoScroll'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_BoxSelectNoScroll');
            if (node.props['clearOnClickVoid'] === 'true')
                flagParts.push('ImGuiMultiSelectFlags_ClearOnClickVoid');
            const flags = flagParts.length > 0 ? flagParts.join(' | ') : '0';
            const selSize = node.props['selectionSize'] ?? '-1';
            const itemCount = node.props['itemsCount'] ?? '-1';
            lines.push(`${indent}{`);
            lines.push(`${indent}    auto* ms_io = imx::renderer::begin_multi_select(${flags}, ${selSize}, ${itemCount});`);
            const onChangeExpr = node.props['onSelectionChange'];
            // Also apply requests from BeginMultiSelect (ImGui protocol requires both)
            if (onChangeExpr) {
                const lambdaMatch = onChangeExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\(\s*\d+\s*\)\s*;?\s*\}$/);
                if (lambdaMatch) {
                    lines.push(`${indent}    ${lambdaMatch[1]}(ms_io);`);
                }
            }
            multiSelectCallbackStack.push(onChangeExpr ?? null);
            break;
        }
        case 'DockLayout':
        case 'DockSplit':
        case 'DockPanel':
            break;
    }
}
function emitEndContainer(node, lines, indent) {
    switch (node.tag) {
        case 'Window': {
            lines.push(`${indent}imx::renderer::end_window();`);
            const hadOpen = windowOpenStack.pop() ?? false;
            if (hadOpen) {
                lines.push(`${indent}}`);
            }
            break;
        }
        case 'Row':
            lines.push(`${indent}imx::renderer::end_row();`);
            break;
        case 'Column':
            lines.push(`${indent}imx::renderer::end_column();`);
            break;
        case 'View':
            lines.push(`${indent}imx::renderer::end_view();`);
            break;
        case 'Indent':
            lines.push(`${indent}imx::renderer::end_indent();`);
            break;
        case 'TextWrap':
            lines.push(`${indent}imx::renderer::end_text_wrap();`);
            break;
        case 'DockSpace':
            lines.push(`${indent}imx::renderer::end_dockspace();`);
            break;
        case 'MainMenuBar':
            lines.push(`${indent}imx::renderer::end_main_menu_bar();`);
            lines.push(`${indent}}`);
            break;
        case 'MenuBar':
            lines.push(`${indent}imx::renderer::end_menu_bar();`);
            lines.push(`${indent}}`);
            break;
        case 'Menu':
            lines.push(`${indent}imx::renderer::end_menu();`);
            lines.push(`${indent}}`);
            break;
        case 'TabBar':
            lines.push(`${indent}imx::renderer::end_tab_bar();`);
            lines.push(`${indent}}`);
            break;
        case 'TabItem':
            lines.push(`${indent}imx::renderer::end_tab_item();`);
            lines.push(`${indent}}`);
            break;
        case 'Theme':
            lines.push(`${indent}imx::renderer::end_theme();`);
            break;
        case 'Modal': {
            lines.push(`${indent}imx::renderer::end_modal();`);
            lines.push(`${indent}}`); // close the if (begin_modal) block
            const hadOpen = windowOpenStack.pop() ?? false;
            const onCloseBody = modalOnCloseStack.pop() ?? null;
            if (hadOpen && onCloseBody) {
                // Check modal_closed OUTSIDE the if(begin_modal) block,
                // because BeginPopupModal returns false when X is clicked
                // (it calls EndPopup internally).
                lines.push(`${indent}if (modal_closed) { ${onCloseBody} }`);
                lines.push(`${indent}}`); // close the { bool modal_closed scope
            }
            else if (hadOpen) {
                lines.push(`${indent}}`); // close scope without onClose
            }
            break;
        }
        case 'StyleColor':
            lines.push(`${indent}imx::renderer::end_style_color();`);
            break;
        case 'StyleVar':
            lines.push(`${indent}imx::renderer::end_style_var();`);
            break;
        case 'Group':
            lines.push(`${indent}ImGui::EndGroup();`);
            break;
        case 'ID':
            lines.push(`${indent}ImGui::PopID();`);
            break;
        case 'DragDropSource': {
            const props = dragDropSourceStack.pop() ?? {};
            const typeStr = asCharPtr(props['type'] ?? '""');
            const payload = props['payload'] ?? '0';
            lines.push(`${indent}ImGui::EndGroup();`);
            lines.push(`${indent}if (ImGui::BeginDragDropSource(ImGuiDragDropFlags_SourceAllowNullID)) {`);
            const payloadType = props['_payloadType'] ?? 'float';
            lines.push(`${indent}    ${payloadType} _dd_payload = static_cast<${payloadType}>(${payload});`);
            lines.push(`${indent}    ImGui::SetDragDropPayload(${typeStr}, &_dd_payload, sizeof(_dd_payload));`);
            lines.push(`${indent}    ImGui::Text("Dragging...");`);
            lines.push(`${indent}    ImGui::EndDragDropSource();`);
            lines.push(`${indent}}`);
            break;
        }
        case 'Disabled':
            lines.push(`${indent}ImGui::EndDisabled();`);
            break;
        case 'Child':
            lines.push(`${indent}ImGui::EndChild();`);
            break;
        case 'Canvas':
            lines.push(`${indent}imx::renderer::end_canvas();`);
            break;
        case 'Font':
            lines.push(`${indent}imx::renderer::end_font();`);
            break;
        case 'ContextMenu':
            lines.push(`${indent}imx::renderer::end_context_menu();`);
            lines.push(`${indent}}`);
            break;
        case 'MultiSelect': {
            lines.push(`${indent}    auto* ms_io_end = imx::renderer::end_multi_select();`);
            const onChangeExpr = multiSelectCallbackStack.pop() ?? null;
            if (onChangeExpr) {
                // Extract function call from lambda [&]() { fn(placeholder); }
                // Replace the placeholder argument with ms_io_end
                const lambdaMatch = onChangeExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\(\s*\d+\s*\)\s*;?\s*\}$/);
                if (lambdaMatch) {
                    lines.push(`${indent}    if (ms_io_end) { ${lambdaMatch[1]}(ms_io_end); }`);
                }
                else {
                    lines.push(`${indent}    if (ms_io_end) { ${onChangeExpr}; }`);
                }
            }
            lines.push(`${indent}}`);
            break;
        }
        case 'DragDropTarget': {
            const props = dragDropTargetStack.pop() ?? {};
            const typeStr = asCharPtr(props['type'] ?? '""');
            const onDrop = props['onDrop'] ?? '';
            lines.push(`${indent}ImGui::EndGroup();`);
            lines.push(`${indent}if (ImGui::BeginDragDropTarget()) {`);
            lines.push(`${indent}    if (const ImGuiPayload* _dd_p = ImGui::AcceptDragDropPayload(${typeStr})) {`);
            // Parse the structured callback: "cppType|paramName|bodyCode"
            const parts = onDrop.split('|');
            if (parts.length >= 3) {
                const cppType = parts[0];
                const paramName = parts[1];
                const bodyCode = parts.slice(2).join('|'); // rejoin in case body contained |
                lines.push(`${indent}        ${cppType} ${paramName} = *(const ${cppType}*)_dd_p->Data;`);
                lines.push(`${indent}        ${bodyCode}`);
            }
            lines.push(`${indent}    }`);
            lines.push(`${indent}    ImGui::EndDragDropTarget();`);
            lines.push(`${indent}}`);
            break;
        }
        case 'DockLayout':
        case 'DockSplit':
        case 'DockPanel':
            break;
    }
}
function emitText(node, lines, indent) {
    emitLocComment(node.loc, 'Text', lines, indent);
    const fmtStr = JSON.stringify(node.format);
    const argsStr = node.args.length > 0 ? ', ' + node.args.join(', ') : '';
    if (node.disabled) {
        // disabled takes priority — ImGui::TextDisabled has its own grayed style
        lines.push(`${indent}imx::renderer::text_disabled(${fmtStr}${argsStr});`);
    }
    else if (node.color && node.wrapped) {
        // color + wrapped: PushStyleColor + TextWrapped + PopStyleColor
        lines.push(`${indent}ImGui::PushStyleColor(ImGuiCol_Text, ImVec4(${node.color}));`);
        lines.push(`${indent}imx::renderer::text_wrapped(${fmtStr}${argsStr});`);
        lines.push(`${indent}ImGui::PopStyleColor();`);
    }
    else if (node.color) {
        // color only: inline ImGui::TextColored
        lines.push(`${indent}ImGui::TextColored(ImVec4(${node.color}), ${fmtStr}${argsStr});`);
    }
    else if (node.wrapped) {
        // wrapped only
        lines.push(`${indent}imx::renderer::text_wrapped(${fmtStr}${argsStr});`);
    }
    else {
        // plain text (current behavior)
        if (node.args.length === 0) {
            lines.push(`${indent}imx::renderer::text(${fmtStr});`);
        }
        else {
            lines.push(`${indent}imx::renderer::text(${fmtStr}${argsStr});`);
        }
    }
}
function emitButton(node, lines, indent, depth) {
    emitLocComment(node.loc, 'Button', lines, indent);
    const title = asCharPtr(node.title);
    const disabledArg = node.disabled ? ', {}, true' : '';
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('button_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::button(${title}${disabledArg})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitSmallButton(node, lines, indent) {
    emitLocComment(node.loc, 'SmallButton', lines, indent);
    const label = asCharPtr(node.label);
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('small_button_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::small_button(${label})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitArrowButton(node, lines, indent) {
    emitLocComment(node.loc, 'ArrowButton', lines, indent);
    const id = asCharPtr(node.id);
    const dirMap = { '"left"': '0', '"right"': '1', '"up"': '2', '"down"': '3' };
    const dir = dirMap[node.direction] ?? '0';
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('arrow_button_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::arrow_button(${id}, ${dir})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitInvisibleButton(node, lines, indent) {
    emitLocComment(node.loc, 'InvisibleButton', lines, indent);
    const id = asCharPtr(node.id);
    const width = emitFloat(node.width);
    const height = emitFloat(node.height);
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('invisible_button_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::invisible_button(${id}, ${width}, ${height})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitImageButton(node, lines, indent) {
    emitLocComment(node.loc, 'ImageButton', lines, indent);
    const id = asCharPtr(node.id);
    const src = asCharPtr(node.src);
    const width = node.width ? emitFloat(node.width) : '0';
    const height = node.height ? emitFloat(node.height) : '0';
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('image_button_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::image_button(${id}, ${src}, ${width}, ${height})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitMenuItem(node, lines, indent, depth) {
    emitLocComment(node.loc, 'MenuItem', lines, indent);
    const label = asCharPtr(node.label);
    const shortcut = node.shortcut ? asCharPtr(node.shortcut) : undefined;
    const callExpr = shortcut
        ? `imx::renderer::menu_item(${label}, ${shortcut})`
        : `imx::renderer::menu_item(${label})`;
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('menu_item_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(callExpr, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitTextInput(node, lines, indent) {
    emitLocComment(node.loc, 'TextInput', lines, indent);
    const label = asCharPtr(node.label && node.label !== '""' ? node.label : `"##textinput_${node.bufferIndex}"`);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${innerIndent}buf.sync_from(${node.stateVar}.get());`);
        const changedVar = nextWidgetTemp('text_input_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::text_input(${label}, buf${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(buf.value());`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const readExpr = emitBoundValueExpr(node.valueExpr);
        const writeExpr = emitBoundValueExpr(node.valueExpr);
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${innerIndent}buf.sync_from(${readExpr});`);
        const changedVar = nextWidgetTemp('text_input_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::text_input(${label}, buf${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${writeExpr} = buf.value();`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${innerIndent}buf.sync_from(${node.valueExpr});`);
        const changedVar = nextWidgetTemp('text_input_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::text_input(${label}, buf${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto& buf_${node.bufferIndex} = ctx.get_buffer(${node.bufferIndex});`);
        emitBoolWidgetCall(`imx::renderer::text_input(${label}, buf_${node.bufferIndex}${styleArg})`, node.item, lines, innerIndent);
        lines.push(`${indent}}`);
    }
}
function emitCheckbox(node, lines, indent) {
    emitLocComment(node.loc, 'Checkbox', lines, indent);
    const label = asCharPtr(node.label && node.label !== '""' ? node.label : `"##checkbox_${checkboxCounter}"`);
    checkboxCounter++;
    if (node.stateVar) {
        // State-bound case
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}bool val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('checkbox_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::checkbox(${label}, &val)`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        emitBoolWidgetCall(`imx::renderer::checkbox(${label}, ${emitDirectBindPtr(node.valueExpr)})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}bool val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('checkbox_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::checkbox(${label}, &val)`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else {
        emitBoolWidgetCall(`imx::renderer::checkbox(${label}, nullptr)`, node.item, lines, indent);
    }
}
function emitSpacing(node, lines, indent) {
    emitLocComment(node.loc, 'Spacing', lines, indent);
    lines.push(`${indent}imx::renderer::spacing();`);
}
function emitDummy(node, lines, indent) {
    emitLocComment(node.loc, 'Dummy', lines, indent);
    lines.push(`${indent}imx::renderer::dummy(${emitFloat(node.width)}, ${emitFloat(node.height)});`);
}
function emitSameLine(node, lines, indent) {
    emitLocComment(node.loc, 'SameLine', lines, indent);
    lines.push(`${indent}imx::renderer::same_line(${emitFloat(node.offset)}, ${emitFloat(node.spacing)});`);
}
function emitNewLine(node, lines, indent) {
    emitLocComment(node.loc, 'NewLine', lines, indent);
    lines.push(`${indent}imx::renderer::new_line();`);
}
function emitCursor(node, lines, indent) {
    emitLocComment(node.loc, 'Cursor', lines, indent);
    lines.push(`${indent}imx::renderer::set_cursor_pos(${emitFloat(node.x)}, ${emitFloat(node.y)});`);
}
function emitConditional(node, lines, indent, depth) {
    if (node.loc) {
        lines.push(`${indent}// ${node.loc.file}:${node.loc.line} conditional`);
    }
    lines.push(`${indent}if (${node.condition}) {`);
    emitNodes(node.body, lines, depth + 1);
    if (node.elseBody && node.elseBody.length > 0) {
        lines.push(`${indent}} else {`);
        emitNodes(node.elseBody, lines, depth + 1);
    }
    lines.push(`${indent}}`);
}
function emitListMap(node, lines, indent, depth) {
    if (node.loc) {
        lines.push(`${indent}// ${node.loc.file}:${node.loc.line} .map()`);
    }
    const idx = node.internalIndexVar;
    lines.push(`${indent}for (size_t ${idx} = 0; ${idx} < ${node.array}.size(); ${idx}++) {`);
    lines.push(`${indent}${INDENT}auto& ${node.itemVar} = ${node.array}[${idx}];`);
    lines.push(`${indent}${INDENT}size_t ${node.indexVar} = ${idx};`);
    lines.push(`${indent}${INDENT}ctx.begin_instance("${node.componentName}", (int)${idx}, ${node.stateCount}, ${node.bufferCount});`);
    emitNodes(node.body, lines, depth + 2);
    lines.push(`${indent}${INDENT}ctx.end_instance();`);
    lines.push(`${indent}}`);
}
function emitCustomComponent(node, lines, indent) {
    emitLocComment(node.loc, node.name, lines, indent);
    const instanceIndex = customComponentCounter++;
    const propsEntries = Object.entries(node.props);
    const childBound = allBoundProps.get(node.name) ?? new Set();
    lines.push(`${indent}ctx.begin_instance("${node.name}", ${instanceIndex}, ${node.stateCount}, ${node.bufferCount});`);
    if (propsEntries.length > 0) {
        // MSVC-compatible: use variable-based prop assignment instead of designated initializers
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}${node.name}Props p;`);
        for (const [k, v] of propsEntries) {
            if (childBound.has(k)) {
                // Check if the value is already a pointer (bound prop of current component)
                const valPropName = v.startsWith('props.') ? v.slice(6).split('.')[0].split('[')[0] : '';
                if (currentBoundProps.has(valPropName)) {
                    // Already a pointer — pass through directly. Use &* to block post-processing regex.
                    lines.push(`${indent}${INDENT}p.${k} = &*${v};`);
                }
                else {
                    lines.push(`${indent}${INDENT}p.${k} = &${v};`);
                }
            }
            else {
                lines.push(`${indent}${INDENT}p.${k} = ${v};`);
            }
        }
        lines.push(`${indent}${INDENT}${node.name}_render(ctx, p);`);
        lines.push(`${indent}}`);
    }
    else {
        lines.push(`${indent}${node.name}_render(ctx);`);
    }
    lines.push(`${indent}ctx.end_instance();`);
}
function emitNativeWidget(node, lines, indent) {
    emitLocComment(node.loc, node.name, lines, indent);
    const idx = nativeWidgetCounter++;
    const label = `${node.name}##nw_${idx}`;
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}imx::WidgetArgs _wa("${label}");`);
    // Value props
    for (const [k, v] of Object.entries(node.props)) {
        lines.push(`${indent}${INDENT}_wa.set("${k}", ${v});`);
    }
    // Callback props — already lowered to [&](std::any _v) { ... } lambdas
    for (const [k, v] of Object.entries(node.callbackProps)) {
        lines.push(`${indent}${INDENT}_wa.set_callback("${k}", ${v});`);
    }
    lines.push(`${indent}${INDENT}imx::call_widget("${node.name}", _wa);`);
    lines.push(`${indent}}`);
}
function ensureFloatLiteral(val) {
    const trimmed = val.trim();
    if (!/^-?\d+(\.\d+)?$/.test(trimmed))
        return trimmed;
    return trimmed.includes('.') ? `${trimmed}f` : `${trimmed}.0f`;
}
function emitSliderFloat(node, lines, indent) {
    emitLocComment(node.loc, 'SliderFloat', lines, indent);
    const label = asCharPtr(node.label);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('slider_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::slider_float(${label}, &val, ${min}, ${max}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::slider_float(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${min}, ${max}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('slider_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::slider_float(${label}, &val, ${min}, ${max}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitSliderInt(node, lines, indent) {
    emitLocComment(node.loc, 'SliderInt', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('slider_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::slider_int(${label}, &val, ${node.min}, ${node.max}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::slider_int(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${node.min}, ${node.max}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('slider_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::slider_int(${label}, &val, ${node.min}, ${node.max}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitVSliderFloat(node, lines, indent) {
    emitLocComment(node.loc, 'VSliderFloat', lines, indent);
    const label = asCharPtr(node.label);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    const width = emitFloat(node.width);
    const height = emitFloat(node.height);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}float val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('vslider_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::vslider_float(${label}, ${width}, ${height}, &val, ${min}, ${max})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        emitBoolWidgetCall(`imx::renderer::vslider_float(${label}, ${width}, ${height}, ${emitDirectBindPtr(node.valueExpr)}, ${min}, ${max})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}float val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('vslider_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::vslider_float(${label}, ${width}, ${height}, &val, ${min}, ${max})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitVSliderInt(node, lines, indent) {
    emitLocComment(node.loc, 'VSliderInt', lines, indent);
    const label = asCharPtr(node.label);
    const width = emitFloat(node.width);
    const height = emitFloat(node.height);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('vslider_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::vslider_int(${label}, ${width}, ${height}, &val, ${node.min}, ${node.max})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        emitBoolWidgetCall(`imx::renderer::vslider_int(${label}, ${width}, ${height}, ${emitDirectBindPtr(node.valueExpr)}, ${node.min}, ${node.max})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('vslider_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::vslider_int(${label}, ${width}, ${height}, &val, ${node.min}, ${node.max})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitSliderAngle(node, lines, indent) {
    emitLocComment(node.loc, 'SliderAngle', lines, indent);
    const label = asCharPtr(node.label);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('slider_angle_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::slider_angle(${label}, &val, ${min}, ${max}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::slider_angle(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${min}, ${max}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('slider_angle_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::slider_angle(${label}, &val, ${min}, ${max}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitDragFloat(node, lines, indent) {
    emitLocComment(node.loc, 'DragFloat', lines, indent);
    const label = asCharPtr(node.label);
    const speed = ensureFloatLiteral(node.speed);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('drag_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::drag_float(${label}, &val, ${speed}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::drag_float(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${speed}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('drag_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::drag_float(${label}, &val, ${speed}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitDragInt(node, lines, indent) {
    emitLocComment(node.loc, 'DragInt', lines, indent);
    const label = asCharPtr(node.label);
    const speed = ensureFloatLiteral(node.speed);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('drag_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::drag_int(${label}, &val, ${speed}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::drag_int(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${speed}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('drag_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::drag_int(${label}, &val, ${speed}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitCombo(node, lines, indent) {
    emitLocComment(node.loc, 'Combo', lines, indent);
    const label = asCharPtr(node.label);
    const itemsList = node.items.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const count = itemsList.length;
    const varName = `combo_items_${comboCounter++}`;
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('combo_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::combo(${label}, &val, ${varName}, ${count}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        emitBoolWidgetCall(`imx::renderer::combo(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${varName}, ${count}${styleArg})`, node.item, lines, innerIndent);
        lines.push(`${indent}}`);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('combo_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::combo(${label}, &val, ${varName}, ${count}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitInputInt(node, lines, indent) {
    emitLocComment(node.loc, 'InputInt', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('input_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::input_int(${label}, &val${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::input_int(${label}, ${emitDirectBindPtr(node.valueExpr)}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('input_int_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::input_int(${label}, &val${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitInputFloat(node, lines, indent) {
    emitLocComment(node.loc, 'InputFloat', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('input_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::input_float(${label}, &val${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::input_float(${label}, ${emitDirectBindPtr(node.valueExpr)}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('input_float_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::input_float(${label}, &val${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitColorEdit(node, lines, indent) {
    emitLocComment(node.loc, 'ColorEdit', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('color_edit_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_edit(${label}, val.data()${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const dataExpr = `${emitBoundValueExpr(node.valueExpr)}.data()`;
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::color_edit(${label}, ${dataExpr}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('color_edit_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_edit(${label}, val.data()${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitColorEdit3(node, lines, indent) {
    emitLocComment(node.loc, 'ColorEdit3', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('color_edit3_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_edit3(${label}, val.data()${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const dataExpr = `${emitBoundValueExpr(node.valueExpr)}.data()`;
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::color_edit3(${label}, ${dataExpr}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('color_edit3_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_edit3(${label}, val.data()${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitListBox(node, lines, indent) {
    emitLocComment(node.loc, 'ListBox', lines, indent);
    const label = asCharPtr(node.label);
    const itemsList = node.items.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const count = itemsList.length;
    const varName = `listbox_items_${listBoxCounter++}`;
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('list_box_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::list_box(${label}, &val, ${varName}, ${count}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        emitBoolWidgetCall(`imx::renderer::list_box(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${varName}, ${count}${styleArg})`, node.item, lines, innerIndent);
        lines.push(`${indent}}`);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('list_box_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::list_box(${label}, &val, ${varName}, ${count}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitProgressBar(node, lines, indent) {
    emitLocComment(node.loc, 'ProgressBar', lines, indent);
    if (node.overlay) {
        lines.push(`${indent}imx::renderer::progress_bar(${node.value}, ${node.overlay});`);
    }
    else {
        lines.push(`${indent}imx::renderer::progress_bar(${node.value});`);
    }
}
function emitTooltip(node, lines, indent) {
    emitLocComment(node.loc, 'Tooltip', lines, indent);
    lines.push(`${indent}imx::renderer::tooltip(${node.text});`);
}
function emitShortcut(node, lines, indent) {
    emitLocComment(node.loc, 'Shortcut', lines, indent);
    const keys = asCharPtr(node.keys);
    lines.push(`${indent}if (imx::renderer::shortcut_pressed(${keys})) {`);
    emitActionStatements(node.action, lines, indent + INDENT);
    lines.push(`${indent}}`);
}
function emitBulletText(node, lines, indent) {
    emitLocComment(node.loc, 'BulletText', lines, indent);
    if (node.args.length === 0) {
        lines.push(`${indent}imx::renderer::bullet_text("${node.format}");`);
    }
    else {
        const fmtArgs = node.args.map(a => {
            if (a.startsWith('"'))
                return a;
            return `std::to_string(${a}).c_str()`;
        }).join(', ');
        lines.push(`${indent}imx::renderer::bullet_text("${node.format}", ${fmtArgs});`);
    }
}
function emitLabelText(node, lines, indent) {
    emitLocComment(node.loc, 'LabelText', lines, indent);
    lines.push(`${indent}imx::renderer::label_text(${asCharPtr(node.label)}, ${asCharPtr(node.value)});`);
}
function emitSelectable(node, lines, indent) {
    emitLocComment(node.loc, 'Selectable', lines, indent);
    if (node.selectionIndex) {
        lines.push(`${indent}imx::renderer::set_next_item_selection_data(${node.selectionIndex});`);
    }
    const label = asCharPtr(node.label);
    const flagsArg = node.flags ? `, ${node.flags}` : '';
    const pressedVar = node.action.length > 0 ? nextWidgetTemp('selectable_pressed') : undefined;
    const resultVar = emitBoolWidgetCall(`imx::renderer::selectable(${label}, ${node.selected}${flagsArg})`, node.item, lines, indent, pressedVar);
    if (node.action.length > 0 && resultVar) {
        lines.push(`${indent}if (${resultVar}) {`);
        emitActionStatements(node.action, lines, indent + INDENT);
        lines.push(`${indent}}`);
    }
}
function emitRadio(node, lines, indent) {
    emitLocComment(node.loc, 'Radio', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}int val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('radio_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::radio(${label}, &val, ${node.index})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        emitBoolWidgetCall(`imx::renderer::radio(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${node.index})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}int val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('radio_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::radio(${label}, &val, ${node.index})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitInputTextMultiline(node, lines, indent) {
    emitLocComment(node.loc, 'InputTextMultiline', lines, indent);
    lines.push(`${indent}{`);
    const innerIndent = indent + INDENT;
    const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
    lines.push(`${innerIndent}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
    const styleArg = styleVar ? `, ${styleVar}` : '';
    if (node.stateVar) {
        lines.push(`${innerIndent}buf.sync_from(${node.stateVar}.get());`);
        const changedVar = nextWidgetTemp('text_input_multiline_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::text_input_multiline(${node.label}, buf${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(buf.value());`);
        lines.push(`${innerIndent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const readExpr = emitBoundValueExpr(node.valueExpr);
        const writeExpr = emitBoundValueExpr(node.valueExpr);
        lines.push(`${innerIndent}buf.sync_from(${readExpr});`);
        const changedVar = nextWidgetTemp('text_input_multiline_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::text_input_multiline(${node.label}, buf${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${writeExpr} = buf.value();`);
        lines.push(`${innerIndent}}`);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${innerIndent}buf.sync_from(${node.valueExpr});`);
        const changedVar = nextWidgetTemp('text_input_multiline_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::text_input_multiline(${node.label}, buf${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
    }
    else {
        emitBoolWidgetCall(`imx::renderer::text_input_multiline(${node.label}, buf${styleArg})`, node.item, lines, innerIndent);
    }
    lines.push(`${indent}}`);
}
function emitColorPicker(node, lines, indent) {
    emitLocComment(node.loc, 'ColorPicker', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}auto val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('color_picker_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_picker(${label}, val.data())`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const dataExpr = `${emitBoundValueExpr(node.valueExpr)}.data()`;
        emitBoolWidgetCall(`imx::renderer::color_picker(${label}, ${dataExpr})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        lines.push(`${innerIndent}auto val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('color_picker_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_picker(${label}, val.data())`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitColorPicker3(node, lines, indent) {
    emitLocComment(node.loc, 'ColorPicker3', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp('color_picker3_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_picker3(${label}, val.data()${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const dataExpr = `${emitBoundValueExpr(node.valueExpr)}.data()`;
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::color_picker3(${label}, ${dataExpr}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.valueExpr};`);
        const changedVar = nextWidgetTemp('color_picker3_changed');
        const resultVar = emitBoolWidgetCall(`imx::renderer::color_picker3(${label}, val.data()${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function emitPlotLines(node, lines, indent) {
    emitLocComment(node.loc, 'PlotLines', lines, indent);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    // Check if values is a variable/property access (struct binding) vs literal array
    if (node.values.includes('.') || /^[a-zA-Z_]\w*$/.test(node.values)) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildStyleVar(node.style, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}imx::renderer::plot_lines(${node.label}, ${node.values}.data(), static_cast<int>(${node.values}.size())${overlay}${styleArg});`);
        lines.push(`${indent}}`);
    }
    else {
        const idx = plotCounter++;
        const varName = `_plot_${idx}`;
        const values = node.values.split(',').map(v => ensureFloatLiteral(v.trim()));
        const count = values.length;
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildStyleVar(node.style, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float ${varName}[] = {${values.join(', ')}};`);
        lines.push(`${innerIndent}imx::renderer::plot_lines(${node.label}, ${varName}, ${count}${overlay}${styleArg});`);
        lines.push(`${indent}}`);
    }
}
function emitPlotHistogram(node, lines, indent) {
    emitLocComment(node.loc, 'PlotHistogram', lines, indent);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    if (node.values.includes('.') || /^[a-zA-Z_]\w*$/.test(node.values)) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildStyleVar(node.style, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}imx::renderer::plot_histogram(${node.label}, ${node.values}.data(), static_cast<int>(${node.values}.size())${overlay}${styleArg});`);
        lines.push(`${indent}}`);
    }
    else {
        const idx = plotCounter++;
        const varName = `_plot_${idx}`;
        const values = node.values.split(',').map(v => ensureFloatLiteral(v.trim()));
        const count = values.length;
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildStyleVar(node.style, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}float ${varName}[] = {${values.join(', ')}};`);
        lines.push(`${innerIndent}imx::renderer::plot_histogram(${node.label}, ${varName}, ${count}${overlay}${styleArg});`);
        lines.push(`${indent}}`);
    }
}
function emitImage(node, lines, indent) {
    emitLocComment(node.loc, 'Image', lines, indent);
    const width = node.width ? ensureFloatLiteral(node.width) : '0';
    const height = node.height ? ensureFloatLiteral(node.height) : '0';
    if (node.embed && node.embedKey) {
        // Embedded mode: reference the data from the .embed.h header
        lines.push(`${indent}imx::renderer::image_embedded("${node.embedKey}", ${node.embedKey}_data, ${node.embedKey}_size, ${width}, ${height});`);
    }
    else {
        // File mode: pass the path string
        lines.push(`${indent}imx::renderer::image(${node.src}, ${width}, ${height});`);
    }
}
function emitDrawLine(node, lines, indent) {
    const p1Parts = node.p1.split(',').map((s) => emitFloat(s.trim()));
    const p2Parts = node.p2.split(',').map((s) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_line(${p1Parts.join(', ')}, ${p2Parts.join(', ')}, ${color}, ${thickness});`);
}
function emitDrawRect(node, lines, indent) {
    const minParts = node.min.split(',').map((s) => emitFloat(s.trim()));
    const maxParts = node.max.split(',').map((s) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    const rounding = emitFloat(node.rounding);
    lines.push(`${indent}imx::renderer::draw_rect(${minParts.join(', ')}, ${maxParts.join(', ')}, ${color}, ${filled}, ${thickness}, ${rounding});`);
}
function emitDrawCircle(node, lines, indent) {
    const centerParts = node.center.split(',').map((s) => emitFloat(s.trim()));
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_circle(${centerParts.join(', ')}, ${radius}, ${color}, ${filled}, ${thickness});`);
}
function emitDrawText(node, lines, indent) {
    const posParts = node.pos.split(',').map((s) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const text = asCharPtr(node.text);
    lines.push(`${indent}imx::renderer::draw_text(${posParts.join(', ')}, ${color}, ${text});`);
}
function emitDrawBezierCubic(node, lines, indent) {
    const p1 = node.p1.split(',').map((s) => emitFloat(s.trim()));
    const p2 = node.p2.split(',').map((s) => emitFloat(s.trim()));
    const p3 = node.p3.split(',').map((s) => emitFloat(s.trim()));
    const p4 = node.p4.split(',').map((s) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    const segments = node.segments;
    lines.push(`${indent}imx::renderer::draw_bezier_cubic(${p1.join(', ')}, ${p2.join(', ')}, ${p3.join(', ')}, ${p4.join(', ')}, ${color}, ${thickness}, ${segments});`);
}
function emitDrawBezierQuadratic(node, lines, indent) {
    const p1 = node.p1.split(',').map((s) => emitFloat(s.trim()));
    const p2 = node.p2.split(',').map((s) => emitFloat(s.trim()));
    const p3 = node.p3.split(',').map((s) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    const segments = node.segments;
    lines.push(`${indent}imx::renderer::draw_bezier_quadratic(${p1.join(', ')}, ${p2.join(', ')}, ${p3.join(', ')}, ${color}, ${thickness}, ${segments});`);
}
function emitDrawPolyline(node, lines, indent) {
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    const closed = node.closed;
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}float _poly_pts[] = {${node.points}};`);
    lines.push(`${indent}${INDENT}imx::renderer::draw_polyline(_poly_pts, sizeof(_poly_pts) / (2 * sizeof(float)), ${color}, ${thickness}, ${closed});`);
    lines.push(`${indent}}`);
}
function emitDrawConvexPolyFilled(node, lines, indent) {
    const color = emitImVec4(node.color);
    lines.push(`${indent}{`);
    lines.push(`${indent}${INDENT}float _poly_pts[] = {${node.points}};`);
    lines.push(`${indent}${INDENT}imx::renderer::draw_convex_poly_filled(_poly_pts, sizeof(_poly_pts) / (2 * sizeof(float)), ${color});`);
    lines.push(`${indent}}`);
}
function emitDrawNgon(node, lines, indent) {
    const center = node.center.split(',').map((s) => emitFloat(s.trim()));
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const numSegments = node.numSegments;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_ngon(${center.join(', ')}, ${radius}, ${color}, ${numSegments}, ${thickness});`);
}
function emitDrawNgonFilled(node, lines, indent) {
    const center = node.center.split(',').map((s) => emitFloat(s.trim()));
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const numSegments = node.numSegments;
    lines.push(`${indent}imx::renderer::draw_ngon_filled(${center.join(', ')}, ${radius}, ${color}, ${numSegments});`);
}
function emitDrawTriangle(node, lines, indent) {
    const p1 = node.p1.split(',').map((s) => emitFloat(s.trim()));
    const p2 = node.p2.split(',').map((s) => emitFloat(s.trim()));
    const p3 = node.p3.split(',').map((s) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_triangle(${p1.join(', ')}, ${p2.join(', ')}, ${p3.join(', ')}, ${color}, ${filled}, ${thickness});`);
}
function emitVectorInput(node, rendererFn, cppType, lines, indent, extraArgs = '') {
    const label = asCharPtr(node.label);
    const count = node.count;
    if (node.stateVar) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}auto val = ${node.stateVar}.get();`);
        const changedVar = nextWidgetTemp(`${rendererFn}_changed`);
        const resultVar = emitBoolWidgetCall(`imx::renderer::${rendererFn}(${label}, val.data(), ${count}${extraArgs}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
    else if (node.directBind && node.valueExpr) {
        const styleVar = buildWidgetStyleVar(node.style, node.width, indent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        emitBoolWidgetCall(`imx::renderer::${rendererFn}(${label}, ${node.valueExpr}, ${count}${extraArgs}${styleArg})`, node.item, lines, indent);
    }
    else if (node.valueExpr) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildWidgetStyleVar(node.style, node.width, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}${cppType} _vec_val[${count}];`);
        lines.push(`${innerIndent}auto& _vec_src = ${node.valueExpr};`);
        lines.push(`${innerIndent}for (int i = 0; i < ${count}; ++i) _vec_val[i] = _vec_src[i];`);
        const changedVar = nextWidgetTemp(`${rendererFn}_changed`);
        const resultVar = emitBoolWidgetCall(`imx::renderer::${rendererFn}(${label}, _vec_val, ${count}${extraArgs}${styleArg})`, node.item, lines, innerIndent, changedVar);
        lines.push(`${innerIndent}if (${resultVar}) {`);
        if (node.onChangeExpr) {
            lines.push(`${innerIndent}${INDENT}${node.onChangeExpr};`);
        }
        else {
            lines.push(`${innerIndent}${INDENT}for (int i = 0; i < ${count}; ++i) _vec_src[i] = _vec_val[i];`);
        }
        lines.push(`${innerIndent}}`);
        lines.push(`${indent}}`);
    }
}
function collectEmbedKeys(nodes) {
    const keys = [];
    for (const node of nodes) {
        if (node.kind === 'image' && node.embed && node.embedKey) {
            keys.push(node.embedKey);
        }
        else if (node.kind === 'conditional') {
            keys.push(...collectEmbedKeys(node.body));
            if (node.elseBody)
                keys.push(...collectEmbedKeys(node.elseBody));
        }
        else if (node.kind === 'list_map') {
            keys.push(...collectEmbedKeys(node.body));
        }
    }
    return keys;
}
