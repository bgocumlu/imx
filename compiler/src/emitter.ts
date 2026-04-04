import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType, SourceLoc,
    IRBeginContainer, IREndContainer, IRText, IRButton, IRTextInput,
    IRCheckbox, IRSeparator, IRConditional, IRListMap, IRCustomComponent,
    IRBeginPopup, IREndPopup, IROpenPopup, IRMenuItem,
    IRSliderFloat, IRSliderInt, IRDragFloat, IRDragInt, IRCombo,
    IRInputInt, IRInputFloat, IRColorEdit, IRListBox, IRProgressBar, IRTooltip,
    IRDockLayout, IRDockSplit, IRDockPanel, IRNativeWidget,
    IRBulletText, IRLabelText,
    IRSelectable, IRRadio,
    IRInputTextMultiline, IRColorPicker,
    IRPlotLines, IRPlotHistogram,
    IRImage,
} from './ir.js';

const INDENT = '    ';
let currentCompName = '';

function emitLocComment(loc: SourceLoc | undefined, tag: string, lines: string[], indent: string): void {
    if (loc) {
        lines.push(`${indent}// ${loc.file}:${loc.line} <${tag}>`);
    }
}

function cppType(t: IRType): string {
    switch (t) {
        case 'int': return 'int';
        case 'float': return 'float';
        case 'bool': return 'bool';
        case 'string': return 'std::string';
        case 'color': return 'std::array<float, 4>';
    }
}

function cppPropType(t: IRType | 'callback'): string {
    if (t === 'callback') return 'std::function<void()>';
    return cppType(t);
}

/**
 * Ensure a string expression is a const char*.
 * String literals (quoted) are already const char*.
 * Expressions like props.title (std::string) need .c_str().
 */
function asCharPtr(expr: string): string {
    // Already a string literal — "hello" is const char*
    if (expr.startsWith('"')) return expr;
    // Already has .c_str()
    if (expr.endsWith('.c_str()')) return expr;
    // Expression — assume std::string, add .c_str()
    return `${expr}.c_str()`;
}

function emitImVec4(arrayStr: string): string {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return v.includes('.') ? `${v}f` : `${v}.0f`;
    });
    return `ImVec4(${parts.join(', ')})`;
}

function emitFloat(val: string): string {
    return val.includes('.') ? `${val}f` : `${val}.0f`;
}

function findDockLayout(nodes: IRNode[]): IRDockLayout | null {
    for (const node of nodes) {
        if (node.kind === 'dock_layout') return node;
    }
    return null;
}

function emitDockSetupFunction(layout: IRDockLayout, compName: string, lines: string[]): void {
    lines.push(`void ${compName}_setup_dock_layout(ImGuiID dockspace_id) {`);
    lines.push(`${INDENT}ImGui::DockBuilderRemoveNode(dockspace_id);`);
    lines.push(`${INDENT}ImGui::DockBuilderAddNode(dockspace_id, ImGuiDockNodeFlags_None);`);
    lines.push(`${INDENT}ImGui::DockBuilderSetNodeSize(dockspace_id, ImGui::GetMainViewport()->WorkSize);`);
    lines.push('');

    let counter = 0;
    function emitDockNode(node: IRDockSplit | IRDockPanel, parentVar: string): void {
        if (node.kind === 'dock_panel') {
            for (const title of node.windows) {
                lines.push(`${INDENT}ImGui::DockBuilderDockWindow(${title}, ${parentVar});`);
            }
        } else {
            const dirRaw = node.direction.replace(/"/g, '');
            const dir = dirRaw === 'horizontal' ? 'ImGuiDir_Left' : 'ImGuiDir_Up';
            const sizeF = emitFloat(node.size);
            const firstVar = `dock_${counter++}`;
            const secondVar = `dock_${counter++}`;
            lines.push(`${INDENT}ImGuiID ${firstVar}, ${secondVar};`);
            lines.push(`${INDENT}ImGui::DockBuilderSplitNode(${parentVar}, ${dir}, ${sizeF}, &${firstVar}, &${secondVar});`);
            if (node.children.length >= 1) emitDockNode(node.children[0], firstVar);
            if (node.children.length >= 2) emitDockNode(node.children[1], secondVar);
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
export function emitComponentHeader(comp: IRComponent, sourceFile?: string): string {
    const lines: string[] = [];

    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    lines.push('#pragma once');
    lines.push('#include <imx/runtime.h>');
    lines.push('#include <imx/renderer.h>');
    lines.push('#include <functional>');
    lines.push('#include <string>');
    lines.push('');

    // Props struct
    lines.push(`struct ${comp.name}Props {`);
    for (const p of comp.params) {
        lines.push(`${INDENT}${cppPropType(p.type)} ${p.name};`);
    }
    lines.push('};');
    lines.push('');

    // Function forward declaration
    lines.push(`void ${comp.name}_render(imx::RenderContext& ctx, const ${comp.name}Props& props);`);
    lines.push('');

    return lines.join('\n');
}

export interface ImportInfo {
    name: string;         // component name e.g. "TodoItem"
    headerFile: string;   // e.g. "TodoItem.gen.h"
}

export function emitComponent(comp: IRComponent, imports?: ImportInfo[], sourceFile?: string): string {
    const lines: string[] = [];

    // Reset counters for each component
    styleCounter = 0;
    customComponentCounter = 0;
    checkboxCounter = 0;
    comboCounter = 0;
    listBoxCounter = 0;
    nativeWidgetCounter = 0;
    plotCounter = 0;
    currentCompName = comp.name;

    const hasProps = comp.params.length > 0;
    const hasColorType = comp.stateSlots.some(s => s.type === 'color');

    // File banner
    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }

    if (hasProps) {
        // Component with props: include its own header instead of redeclaring struct
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
    } else {
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
    const propsArg = hasProps ? `, const ${comp.name}Props& props` : '';
    lines.push(`void ${comp.name}_render(imx::RenderContext& ctx${propsArg}) {`);

    // State declarations
    for (const slot of comp.stateSlots) {
        const initVal = slot.type === 'string'
            ? `std::string(${slot.initialValue})`
            : slot.type === 'color'
            ? `std::array<float, 4>${slot.initialValue}`
            : slot.initialValue;
        lines.push(`${INDENT}auto ${slot.name} = ctx.use_state<${cppType(slot.type)}>(${initVal}, ${slot.index});`);
    }

    if (comp.stateSlots.length > 0) {
        lines.push('');
    }

    // Body IR nodes
    emitNodes(comp.body, lines, 1);

    lines.push('}');
    lines.push('');

    return lines.join('\n');
}

export function emitRoot(rootName: string, stateCount: number, bufferCount: number, sourceFile?: string): string {
    const lines: string[] = [];

    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    lines.push('#include <imx/runtime.h>');
    lines.push('');
    lines.push(`void ${rootName}_render(imx::RenderContext& ctx);`);
    lines.push('');
    lines.push('namespace imx {');
    lines.push('void render_root(Runtime& runtime) {');
    lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
    lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
    lines.push(`${INDENT}${rootName}_render(ctx);`);
    lines.push(`${INDENT}ctx.end_instance();`);
    lines.push(`${INDENT}runtime.end_frame();`);
    lines.push('}');
    lines.push('} // namespace imx');
    lines.push('');

    return lines.join('\n');
}

function emitNodes(nodes: IRNode[], lines: string[], depth: number): void {
    for (const node of nodes) {
        emitNode(node, lines, depth);
    }
}

function emitNode(node: IRNode, lines: string[], depth: number): void {
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
        case 'text_input':
            emitTextInput(node, lines, indent);
            break;
        case 'checkbox':
            emitCheckbox(node, lines, indent);
            break;
        case 'separator':
            lines.push(`${indent}imx::renderer::separator();`);
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
        case 'list_box':
            emitListBox(node, lines, indent);
            break;
        case 'progress_bar':
            emitProgressBar(node, lines, indent);
            break;
        case 'tooltip':
            emitTooltip(node, lines, indent);
            break;
        case 'bullet_text':
            emitBulletText(node, lines, indent);
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
        case 'plot_lines':
            emitPlotLines(node, lines, indent);
            break;
        case 'plot_histogram':
            emitPlotHistogram(node, lines, indent);
            break;
        case 'image':
            emitImage(node, lines, indent);
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
const windowOpenStack: boolean[] = []; // tracks if begin_window used open prop

/**
 * Build a Style variable from a raw style expression string for self-closing components.
 * Handles JS-like object literals: { width: 300, height: 100 } -> imx::Style with assignments.
 * Returns the variable name, or null if no style.
 */
function buildStyleVar(styleExpr: string | undefined, indent: string, lines: string[]): string | null {
    if (!styleExpr) return null;

    // Check if it looks like an object literal: { key: value, ... }
    const trimmed = styleExpr.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1).trim();
        if (!inner) return null;

        const varName = `style_${styleCounter++}`;
        lines.push(`${indent}imx::Style ${varName};`);

        // Parse key: value pairs
        const pairs = inner.split(',').map(s => s.trim()).filter(s => s.length > 0);
        for (const pair of pairs) {
            const colonIdx = pair.indexOf(':');
            if (colonIdx === -1) continue;
            const key = pair.substring(0, colonIdx).trim();
            const val = pair.substring(colonIdx + 1).trim();

            // Map camelCase to snake_case
            const cppKey = key === 'paddingHorizontal' ? 'padding_horizontal'
                : key === 'paddingVertical' ? 'padding_vertical'
                : key === 'minWidth' ? 'min_width'
                : key === 'minHeight' ? 'min_height'
                : key;

            const floatVal = val.includes('.') ? `${val}F` : `${val}.0F`;
            lines.push(`${indent}${varName}.${cppKey} = ${floatVal};`);
        }
        return varName;
    }

    // Already a variable name or expression — return as-is
    return styleExpr;
}

function buildStyleBlock(node: IRBeginContainer, indent: string, lines: string[]): string | null {
    // Check for style-related props (gap, padding, width, height, etc.)
    const styleProps: Record<string, string> = {};
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

    // Also check node.style (explicit style prop)
    const explicitStyle = node.style ?? node.props['style'];
    if (explicitStyle) {
        return explicitStyle;
    }

    if (Object.keys(styleProps).length === 0) {
        return null;
    }

    // Generate MSVC-compatible style construction
    const varName = `style_${styleCounter++}`;
    lines.push(`${indent}imx::Style ${varName};`);
    for (const [key, val] of Object.entries(styleProps)) {
        // Ensure the value is a float literal (e.g., 8 -> 8.0F, 8.5 -> 8.5F)
        const floatVal = val.includes('.') ? `${val}F` : `${val}.0F`;
        lines.push(`${indent}${varName}.${key} = ${floatVal};`);
    }
    return varName;
}

function emitBeginContainer(node: IRBeginContainer, lines: string[], indent: string): void {
    emitLocComment(node.loc, node.tag, lines, indent);
    switch (node.tag) {
        case 'Window': {
            const title = asCharPtr(node.props['title'] ?? '""');
            const flagParts: string[] = [];
            if (node.props['noTitleBar'] === 'true') flagParts.push('ImGuiWindowFlags_NoTitleBar');
            if (node.props['noResize'] === 'true') flagParts.push('ImGuiWindowFlags_NoResize');
            if (node.props['noMove'] === 'true') flagParts.push('ImGuiWindowFlags_NoMove');
            if (node.props['noCollapse'] === 'true') flagParts.push('ImGuiWindowFlags_NoCollapse');
            if (node.props['noDocking'] === 'true') flagParts.push('ImGuiWindowFlags_NoDocking');
            if (node.props['noScrollbar'] === 'true') flagParts.push('ImGuiWindowFlags_NoScrollbar');
            const flags = flagParts.length > 0 ? flagParts.join(' | ') : '0';

            const openExpr = node.props['open'];
            const onCloseExpr = node.props['onClose'];
            if (openExpr) {
                windowOpenStack.push(true);
                lines.push(`${indent}{`);
                lines.push(`${indent}    bool win_open = ${openExpr};`);
                lines.push(`${indent}    imx::renderer::begin_window(${title}, ${flags}, &win_open);`);
                if (onCloseExpr) {
                    lines.push(`${indent}    if (!win_open) { ${onCloseExpr}; }`);
                }
            } else {
                windowOpenStack.push(false);
                lines.push(`${indent}imx::renderer::begin_window(${title}, ${flags});`);
            }
            break;
        }
        case 'Row': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_row(${style});`);
            } else {
                lines.push(`${indent}imx::renderer::begin_row();`);
            }
            break;
        }
        case 'Column': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_column(${style});`);
            } else {
                lines.push(`${indent}imx::renderer::begin_column();`);
            }
            break;
        }
        case 'View': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_view(${style});`);
            } else {
                lines.push(`${indent}imx::renderer::begin_view();`);
            }
            break;
        }
        case 'DockSpace': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}imx::renderer::begin_dockspace(${style});`);
            } else {
                lines.push(`${indent}imx::renderer::begin_dockspace();`);
            }
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
        case 'Table': {
            const columnsRaw = node.props['columns'] ?? '';
            const columnNames = columnsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0);
            const count = columnNames.length;
            const varName = `table_cols_${styleCounter++}`;
            lines.push(`${indent}const char* ${varName}[] = {${columnNames.join(', ')}};`);
            lines.push(`${indent}if (imx::renderer::begin_table("##table", ${count}, ${varName})) {`);
            break;
        }
        case 'TableRow': {
            lines.push(`${indent}imx::renderer::begin_table_row();`);
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
        case 'TreeNode': {
            const label = asCharPtr(node.props['label'] ?? '""');
            lines.push(`${indent}if (imx::renderer::begin_tree_node(${label})) {`);
            break;
        }
        case 'CollapsingHeader': {
            const label = asCharPtr(node.props['label'] ?? '""');
            lines.push(`${indent}if (imx::renderer::begin_collapsing_header(${label})) {`);
            break;
        }
        case 'Theme': {
            const preset = asCharPtr(node.props['preset'] ?? '"dark"');
            const varName = `theme_${styleCounter++}`;
            lines.push(`${indent}imx::ThemeConfig ${varName};`);
            if (node.props['accentColor']) {
                lines.push(`${indent}${varName}.accent_color = ${emitImVec4(node.props['accentColor'])};`);
            }
            if (node.props['windowBg']) {
                lines.push(`${indent}${varName}.window_bg = ${emitImVec4(node.props['windowBg'])};`);
            }
            if (node.props['textColor']) {
                lines.push(`${indent}${varName}.text_color = ${emitImVec4(node.props['textColor'])};`);
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
            const openExpr = node.props['open'];
            const onCloseExpr = node.props['onClose'];
            if (openExpr) {
                windowOpenStack.push(true);
                lines.push(`${indent}{`);
                lines.push(`${indent}    bool modal_open = true;`);
                lines.push(`${indent}    if (imx::renderer::begin_modal(${title}, ${openExpr}, &modal_open)) {`);
                if (onCloseExpr) {
                    // Extract lambda body: [&]() { body } -> body
                    const lambdaMatch = onCloseExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\s*\}$/);
                    if (lambdaMatch) {
                        lines.push(`${indent}    if (!modal_open) { ${lambdaMatch[1]} }`);
                    } else {
                        lines.push(`${indent}    if (!modal_open) { ${onCloseExpr}; }`);
                    }
                }
            } else {
                windowOpenStack.push(false);
                lines.push(`${indent}if (imx::renderer::begin_modal(${title}, true, nullptr)) {`);
            }
            break;
        }
        case 'DockLayout':
        case 'DockSplit':
        case 'DockPanel':
            break;
    }
}

function emitEndContainer(node: IREndContainer, lines: string[], indent: string): void {
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
        case 'DockSpace':
            lines.push(`${indent}imx::renderer::end_dockspace();`);
            break;
        case 'MenuBar':
            lines.push(`${indent}imx::renderer::end_menu_bar();`);
            lines.push(`${indent}}`);
            break;
        case 'Menu':
            lines.push(`${indent}imx::renderer::end_menu();`);
            lines.push(`${indent}}`);
            break;
        case 'Table':
            lines.push(`${indent}imx::renderer::end_table();`);
            lines.push(`${indent}}`);
            break;
        case 'TableRow':
            lines.push(`${indent}imx::renderer::end_table_row();`);
            break;
        case 'TabBar':
            lines.push(`${indent}imx::renderer::end_tab_bar();`);
            lines.push(`${indent}}`);
            break;
        case 'TabItem':
            lines.push(`${indent}imx::renderer::end_tab_item();`);
            lines.push(`${indent}}`);
            break;
        case 'TreeNode':
            lines.push(`${indent}imx::renderer::end_tree_node();`);
            lines.push(`${indent}}`);
            break;
        case 'CollapsingHeader':
            lines.push(`${indent}imx::renderer::end_collapsing_header();`);
            lines.push(`${indent}}`);
            break;
        case 'Theme':
            lines.push(`${indent}imx::renderer::end_theme();`);
            break;
        case 'Modal': {
            lines.push(`${indent}imx::renderer::end_modal();`);
            lines.push(`${indent}}`); // close the if (begin_modal) block
            const hadOpen = windowOpenStack.pop() ?? false;
            if (hadOpen) {
                lines.push(`${indent}}`); // close the { bool modal_open scope
            }
            break;
        }
        case 'DockLayout':
        case 'DockSplit':
        case 'DockPanel':
            break;
    }
}

function emitText(node: IRText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Text', lines, indent);
    if (node.args.length === 0) {
        lines.push(`${indent}imx::renderer::text(${JSON.stringify(node.format)});`);
    } else {
        const argsStr = node.args.join(', ');
        lines.push(`${indent}imx::renderer::text(${JSON.stringify(node.format)}, ${argsStr});`);
    }
}

function emitButton(node: IRButton, lines: string[], indent: string, depth: number): void {
    emitLocComment(node.loc, 'Button', lines, indent);
    const title = asCharPtr(node.title);
    if (node.action.length === 0) {
        lines.push(`${indent}imx::renderer::button(${title});`);
    } else {
        lines.push(`${indent}if (imx::renderer::button(${title})) {`);
        for (const stmt of node.action) {
            lines.push(`${indent}${INDENT}${stmt}`);
        }
        lines.push(`${indent}}`);
    }
}

function emitMenuItem(node: IRMenuItem, lines: string[], indent: string, depth: number): void {
    emitLocComment(node.loc, 'MenuItem', lines, indent);
    const label = asCharPtr(node.label);
    const shortcut = node.shortcut ? asCharPtr(node.shortcut) : undefined;
    if (node.action.length === 0) {
        if (shortcut) {
            lines.push(`${indent}imx::renderer::menu_item(${label}, ${shortcut});`);
        } else {
            lines.push(`${indent}imx::renderer::menu_item(${label});`);
        }
    } else {
        if (shortcut) {
            lines.push(`${indent}if (imx::renderer::menu_item(${label}, ${shortcut})) {`);
        } else {
            lines.push(`${indent}if (imx::renderer::menu_item(${label})) {`);
        }
        for (const stmt of node.action) {
            lines.push(`${indent}    ${stmt}`);
        }
        lines.push(`${indent}}`);
    }
}

function emitTextInput(node: IRTextInput, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'TextInput', lines, indent);
    const label = asCharPtr(node.label && node.label !== '""' ? node.label : `"##textinput_${node.bufferIndex}"`);

    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${node.stateVar}.get());`);
        lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${label}, buf)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(buf.value());`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}auto& buf_${node.bufferIndex} = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}imx::renderer::text_input(${label}, buf_${node.bufferIndex});`);
    }
}

function emitCheckbox(node: IRCheckbox, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Checkbox', lines, indent);
    const label = asCharPtr(node.label && node.label !== '""' ? node.label : `"##checkbox_${checkboxCounter}"`);
    checkboxCounter++;

    if (node.stateVar) {
        // State-bound case
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}bool val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::checkbox(${label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        // Props-bound / expression-bound case
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}bool val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::checkbox(${label}, &val)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}imx::renderer::checkbox(${label}, nullptr);`);
    }
}

function emitConditional(node: IRConditional, lines: string[], indent: string, depth: number): void {
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

function emitListMap(node: IRListMap, lines: string[], indent: string, depth: number): void {
    if (node.loc) {
        lines.push(`${indent}// ${node.loc.file}:${node.loc.line} .map()`);
    }
    lines.push(`${indent}for (size_t i = 0; i < ${node.array}.size(); i++) {`);
    lines.push(`${indent}${INDENT}auto& ${node.itemVar} = ${node.array}[i];`);
    lines.push(`${indent}${INDENT}ctx.begin_instance("${node.componentName}", i, ${node.stateCount}, ${node.bufferCount});`);
    emitNodes(node.body, lines, depth + 2);
    lines.push(`${indent}${INDENT}ctx.end_instance();`);
    lines.push(`${indent}}`);
}

function emitCustomComponent(node: IRCustomComponent, lines: string[], indent: string): void {
    emitLocComment(node.loc, node.name, lines, indent);
    const instanceIndex = customComponentCounter++;
    const propsEntries = Object.entries(node.props);

    lines.push(`${indent}ctx.begin_instance("${node.name}", ${instanceIndex}, ${node.stateCount}, ${node.bufferCount});`);

    if (propsEntries.length > 0) {
        // MSVC-compatible: use variable-based prop assignment instead of designated initializers
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}${node.name}Props p;`);
        for (const [k, v] of propsEntries) {
            lines.push(`${indent}${INDENT}p.${k} = ${v};`);
        }
        lines.push(`${indent}${INDENT}${node.name}_render(ctx, p);`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}${node.name}_render(ctx);`);
    }

    lines.push(`${indent}ctx.end_instance();`);
}

function emitNativeWidget(node: IRNativeWidget, lines: string[], indent: string): void {
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

function ensureFloatLiteral(val: string): string {
    // If already has 'f' suffix or '.', leave as-is
    if (val.endsWith('f') || val.endsWith('F') || val.includes('.')) return val;
    // Append .0f to make it a float literal
    return `${val}.0f`;
}

function emitSliderFloat(node: IRSliderFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'SliderFloat', lines, indent);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_float(${node.label}, &val, ${min}, ${max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_float(${node.label}, &val, ${min}, ${max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitSliderInt(node: IRSliderInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'SliderInt', lines, indent);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_int(${node.label}, &val, ${node.min}, ${node.max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_int(${node.label}, &val, ${node.min}, ${node.max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitDragFloat(node: IRDragFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DragFloat', lines, indent);
    const speed = ensureFloatLiteral(node.speed);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_float(${node.label}, &val, ${speed})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_float(${node.label}, &val, ${speed})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitDragInt(node: IRDragInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DragInt', lines, indent);
    const speed = ensureFloatLiteral(node.speed);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_int(${node.label}, &val, ${speed})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_int(${node.label}, &val, ${speed})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitCombo(node: IRCombo, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Combo', lines, indent);
    const itemsList = node.items.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const count = itemsList.length;
    const varName = `combo_items_${comboCounter++}`;

    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::combo(${node.label}, &val, ${varName}, ${count})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::combo(${node.label}, &val, ${varName}, ${count})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitInputInt(node: IRInputInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputInt', lines, indent);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_int(${node.label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_int(${node.label}, &val)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitInputFloat(node: IRInputFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputFloat', lines, indent);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_float(${node.label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_float(${node.label}, &val)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitColorEdit(node: IRColorEdit, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ColorEdit', lines, indent);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_edit(${node.label}, val.data())) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitListBox(node: IRListBox, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ListBox', lines, indent);
    const itemsList = node.items.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const count = itemsList.length;
    const varName = `listbox_items_${listBoxCounter++}`;

    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::list_box(${node.label}, &val, ${varName}, ${count})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::list_box(${node.label}, &val, ${varName}, ${count})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitProgressBar(node: IRProgressBar, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ProgressBar', lines, indent);
    if (node.overlay) {
        lines.push(`${indent}imx::renderer::progress_bar(${node.value}, ${node.overlay});`);
    } else {
        lines.push(`${indent}imx::renderer::progress_bar(${node.value});`);
    }
}

function emitTooltip(node: IRTooltip, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Tooltip', lines, indent);
    lines.push(`${indent}imx::renderer::tooltip(${node.text});`);
}

function emitBulletText(node: IRBulletText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'BulletText', lines, indent);
    if (node.args.length === 0) {
        lines.push(`${indent}imx::renderer::bullet_text("${node.format}");`);
    } else {
        const fmtArgs = node.args.map(a => {
            if (a.startsWith('"')) return a;
            return `std::to_string(${a}).c_str()`;
        }).join(', ');
        lines.push(`${indent}imx::renderer::bullet_text("${node.format}", ${fmtArgs});`);
    }
}

function emitLabelText(node: IRLabelText, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'LabelText', lines, indent);
    lines.push(`${indent}imx::renderer::label_text(${asCharPtr(node.label)}, ${asCharPtr(node.value)});`);
}

function emitSelectable(node: IRSelectable, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Selectable', lines, indent);
    const label = asCharPtr(node.label);
    if (node.action.length > 0) {
        lines.push(`${indent}if (imx::renderer::selectable(${label}, ${node.selected})) {`);
        for (const stmt of node.action) {
            lines.push(`${indent}${INDENT}${stmt}`);
        }
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}imx::renderer::selectable(${label}, ${node.selected});`);
    }
}

function emitRadio(node: IRRadio, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Radio', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::radio(${label}, &val, ${node.index})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::radio(${label}, &val, ${node.index})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitInputTextMultiline(node: IRInputTextMultiline, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputTextMultiline', lines, indent);
    lines.push(`${indent}{`);
    const innerIndent = indent + INDENT;
    const styleVar = buildStyleVar(node.style, innerIndent, lines);
    lines.push(`${innerIndent}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
    if (node.stateVar) {
        lines.push(`${innerIndent}buf.sync_from(${node.stateVar}.get());`);
    }
    const styleArg = styleVar ? `, ${styleVar}` : '';
    lines.push(`${innerIndent}if (imx::renderer::text_input_multiline(${node.label}, buf${styleArg})) {`);
    if (node.stateVar) {
        lines.push(`${innerIndent}${INDENT}${node.stateVar}.set(buf.value());`);
    }
    lines.push(`${innerIndent}}`);
    lines.push(`${indent}}`);
}

function emitColorPicker(node: IRColorPicker, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ColorPicker', lines, indent);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_picker(${node.label}, val.data())) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitPlotLines(node: IRPlotLines, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'PlotLines', lines, indent);
    const idx = plotCounter++;
    const varName = `_plot_${idx}`;
    const values = node.values.split(',').map(v => ensureFloatLiteral(v.trim()));
    const count = values.length;
    lines.push(`${indent}{`);
    const innerIndent = indent + INDENT;
    const styleVar = buildStyleVar(node.style, innerIndent, lines);
    lines.push(`${innerIndent}float ${varName}[] = {${values.join(', ')}};`);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    const styleArg = styleVar ? `, ${styleVar}` : '';
    lines.push(`${innerIndent}imx::renderer::plot_lines(${node.label}, ${varName}, ${count}${overlay}${styleArg});`);
    lines.push(`${indent}}`);
}

function emitPlotHistogram(node: IRPlotHistogram, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'PlotHistogram', lines, indent);
    const idx = plotCounter++;
    const varName = `_plot_${idx}`;
    const values = node.values.split(',').map(v => ensureFloatLiteral(v.trim()));
    const count = values.length;
    lines.push(`${indent}{`);
    const innerIndent = indent + INDENT;
    const styleVar = buildStyleVar(node.style, innerIndent, lines);
    lines.push(`${innerIndent}float ${varName}[] = {${values.join(', ')}};`);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    const styleArg = styleVar ? `, ${styleVar}` : '';
    lines.push(`${innerIndent}imx::renderer::plot_histogram(${node.label}, ${varName}, ${count}${overlay}${styleArg});`);
    lines.push(`${indent}}`);
}

function emitImage(node: IRImage, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Image', lines, indent);
    const width = node.width ? ensureFloatLiteral(node.width) : '0';
    const height = node.height ? ensureFloatLiteral(node.height) : '0';

    if (node.embed && node.embedKey) {
        // Embedded mode: reference the data from the .embed.h header
        lines.push(`${indent}imx::renderer::image_embedded("${node.embedKey}", ${node.embedKey}_data, ${node.embedKey}_size, ${width}, ${height});`);
    } else {
        // File mode: pass the path string
        lines.push(`${indent}imx::renderer::image(${node.src}, ${width}, ${height});`);
    }
}

function collectEmbedKeys(nodes: IRNode[]): string[] {
    const keys: string[] = [];
    for (const node of nodes) {
        if (node.kind === 'image' && node.embed && node.embedKey) {
            keys.push(node.embedKey);
        } else if (node.kind === 'conditional') {
            keys.push(...collectEmbedKeys(node.body));
            if (node.elseBody) keys.push(...collectEmbedKeys(node.elseBody));
        } else if (node.kind === 'list_map') {
            keys.push(...collectEmbedKeys(node.body));
        }
    }
    return keys;
}
