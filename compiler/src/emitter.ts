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
let currentBoundProps: Set<string> = new Set();
let allBoundProps: Map<string, Set<string>> = new Map();

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

/**
 * For directBind emitters: if the valueExpr references a bound prop (pointer),
 * return &*expr for bound props (C++ identity: &*ptr == ptr, and the *
 * blocks the post-processing regex lookbehind from dereferencing again).
 * Otherwise, emit &expr.
 */
function emitDirectBindPtr(valueExpr: string): string {
    const propName = valueExpr.startsWith('props.') ? valueExpr.slice(6).split('.')[0].split('[')[0] : '';
    if (currentBoundProps.has(propName)) {
        return `&*${valueExpr}`;  // already a pointer; &* is identity, * blocks regex lookbehind
    }
    return `&${valueExpr}`;
}

function emitImVec4(arrayStr: string): string {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return v.includes('.') ? `${v}f` : `${v}.0f`;
    });
    return `ImVec4(${parts.join(', ')})`;
}

function emitImVec2(arrayStr: string): string {
    const parts = arrayStr.split(',').map(s => {
        const v = s.trim();
        return v.includes('.') ? `${v}f` : `${v}.0f`;
    });
    return `ImVec2(${parts.join(', ')})`;
}

function emitFloat(val: string): string {
    return val.includes('.') ? `${val}F` : `${val}.0F`;
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
export function emitComponentHeader(comp: IRComponent, sourceFile?: string, boundProps?: Set<string>): string {
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
        if (boundProps && boundProps.has(p.name)) {
            lines.push(`${INDENT}${cppPropType(p.type)}* ${p.name} = nullptr;`);
        } else {
            lines.push(`${INDENT}${cppPropType(p.type)} ${p.name};`);
        }
    }
    lines.push('};');
    lines.push('');

    // Function forward declaration
    lines.push(`void ${comp.name}_render(imx::RenderContext& ctx, ${comp.name}Props& props);`);
    lines.push('');

    return lines.join('\n');
}

export interface ImportInfo {
    name: string;         // component name e.g. "TodoItem"
    headerFile: string;   // e.g. "TodoItem.gen.h"
}

export function emitComponent(comp: IRComponent, imports?: ImportInfo[], sourceFile?: string, boundProps?: Set<string>, boundPropsMap?: Map<string, Set<string>>): string {
    const lines: string[] = [];

    // Reset counters for each component
    styleCounter = 0;
    customComponentCounter = 0;
    checkboxCounter = 0;
    comboCounter = 0;
    listBoxCounter = 0;
    nativeWidgetCounter = 0;
    plotCounter = 0;
    dragDropSourceStack.length = 0;
    dragDropTargetStack.length = 0;
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
        } else {
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
    const propsArg = propsTypeName ? `, ${propsTypeName}& props` : '';
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

    // Post-processing: dereference bound prop reads in expressions
    if (currentBoundProps.size > 0) {
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].trimStart().startsWith('//')) continue;
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

export function emitRoot(rootName: string, stateCount: number, bufferCount: number, sourceFile?: string, propsType?: string, namedPropsType?: boolean): string {
    const lines: string[] = [];

    if (sourceFile) {
        lines.push(`// Generated from ${sourceFile} by imxc`);
    }
    lines.push('#include <imx/runtime.h>');

    if (propsType) {
        if (namedPropsType) {
            // Named interface type (e.g. AppState defined in user code).
            // Include the user header so the template specialization sees the full type.
            lines.push(`#include "${propsType}.h"`);
            lines.push('');
            lines.push(`void ${rootName}_render(imx::RenderContext& ctx, ${propsType}& props);`);
        } else {
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
        } else {
            lines.push(`void render_root(Runtime& runtime, ${propsType}& state) {`);
        }
        lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
        lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
        lines.push(`${INDENT}${rootName}_render(ctx, state);`);
        lines.push(`${INDENT}ctx.end_instance();`);
        lines.push(`${INDENT}runtime.end_frame();`);
        lines.push('}');
        lines.push('} // namespace imx');
    } else {
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
    }

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
const modalOnCloseStack: (string | null)[] = []; // tracks modal onClose expressions
const dragDropSourceStack: Record<string, string>[] = [];
const dragDropTargetStack: Record<string, string>[] = [];

/**
 * Build a Style variable from a raw style expression string for self-closing components.
 * Handles JS-like object literals: { width: 300, height: 100 } -> imx::Style with assignments.
 * Returns the variable name, or null if no style.
 */
/**
 * Split a comma-separated list of key:value pairs in a style object literal,
 * respecting brackets so that array values like [0.1, 0.1, 0.1, 1.0] are not split.
 */
function splitStylePairs(inner: string): string[] {
    const pairs: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < inner.length; i++) {
        const ch = inner[i];
        if (ch === '[' || ch === '(') depth++;
        else if (ch === ']' || ch === ')') depth--;
        else if (ch === ',' && depth === 0) {
            const piece = inner.substring(start, i).trim();
            if (piece) pairs.push(piece);
            start = i + 1;
        }
    }
    const last = inner.substring(start).trim();
    if (last) pairs.push(last);
    return pairs;
}

function buildStyleVar(styleExpr: string | undefined, indent: string, lines: string[]): string | null {
    if (!styleExpr) return null;

    // Check if it looks like an object literal: { key: value, ... }
    const trimmed = styleExpr.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const inner = trimmed.slice(1, -1).trim();
        if (!inner) return null;

        const varName = `style_${styleCounter++}`;
        lines.push(`${indent}imx::Style ${varName};`);

        // Parse key: value pairs (bracket-aware to handle array values)
        const pairs = splitStylePairs(inner);
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
                : key === 'backgroundColor' ? 'background_color'
                : key === 'textColor' ? 'text_color'
                : key === 'fontSize' ? 'font_size'
                : key;

            // ImVec4 fields (color arrays)
            if (cppKey === 'background_color' || cppKey === 'text_color') {
                // val is like [r, g, b, a] — convert to ImVec4(r, g, b, a)
                const arrInner = val.trim().replace(/^\[/, '').replace(/\]$/, '');
                const components = arrInner.split(',').map(c => {
                    const s = c.trim();
                    return s.includes('.') ? `${s}f` : `${s}.0f`;
                });
                lines.push(`${indent}${varName}.${cppKey} = ImVec4(${components.join(', ')});`);
            } else {
                const floatVal = val.includes('.') ? `${val}F` : `${val}.0F`;
                lines.push(`${indent}${varName}.${cppKey} = ${floatVal};`);
            }
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
            const hasMenuBar = node.props['hasMenuBar'] === 'true';
            if (hasMenuBar) {
                lines.push(`${indent}imx::renderer::begin_dockspace(${style ?? '{}'}, true);`);
            } else if (style) {
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
            const style = buildStyleVar(node.style, indent, lines);
            const scrollY = node.props['scrollY'] === 'true';
            const noBorders = node.props['noBorders'] === 'true';
            const noRowBg = node.props['noRowBg'] === 'true';
            lines.push(`${indent}const char* ${varName}[] = {${columnNames.join(', ')}};`);
            const styleArg = style ?? '{}';
            if (scrollY || noBorders || noRowBg) {
                lines.push(`${indent}if (imx::renderer::begin_table("##table", ${count}, ${varName}, ${styleArg}, ${scrollY}, ${noBorders}, ${noRowBg})) {`);
            } else if (style) {
                lines.push(`${indent}if (imx::renderer::begin_table("##table", ${count}, ${varName}, ${styleArg})) {`);
            } else {
                lines.push(`${indent}if (imx::renderer::begin_table("##table", ${count}, ${varName})) {`);
            }
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
            const openExpr = node.props['open'];
            const onCloseExpr = node.props['onClose'];
            if (openExpr) {
                windowOpenStack.push(true);
                // Extract onClose body for use in end emitter
                let onCloseBody: string | null = null;
                if (onCloseExpr) {
                    const lambdaMatch = onCloseExpr.match(/^\[&\]\(\)\s*\{\s*(.*?)\s*\}$/);
                    onCloseBody = lambdaMatch ? lambdaMatch[1] : `${onCloseExpr};`;
                }
                modalOnCloseStack.push(onCloseBody);
                lines.push(`${indent}{`);
                lines.push(`${indent}    bool modal_closed = false;`);
                lines.push(`${indent}    if (imx::renderer::begin_modal(${title}, ${openExpr}, &modal_closed)) {`);
            } else {
                windowOpenStack.push(false);
                modalOnCloseStack.push(null);
                lines.push(`${indent}if (imx::renderer::begin_modal(${title}, true, nullptr)) {`);
            }
            break;
        }
        case 'StyleColor': {
            const varName = `sc_${styleCounter++}`;
            lines.push(`${indent}imx::StyleColorOverrides ${varName};`);
            const colorProps: [string, string][] = [
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
            const floatProps: [string, string][] = [
                ['alpha', 'alpha'], ['windowRounding', 'window_rounding'],
                ['frameRounding', 'frame_rounding'], ['frameBorderSize', 'frame_border_size'],
                ['indentSpacing', 'indent_spacing'], ['tabRounding', 'tab_rounding'],
            ];
            for (const [tsName, cppName] of floatProps) {
                if (node.props[tsName]) {
                    lines.push(`${indent}${varName}.${cppName} = ${emitFloat(node.props[tsName])};`);
                }
            }
            const vec2Props: [string, string][] = [
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
            } else {
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
            } else {
                lines.push(`${indent}imx::renderer::begin_canvas(${width}, ${height});`);
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
            const onCloseBody = modalOnCloseStack.pop() ?? null;
            if (hadOpen && onCloseBody) {
                // Check modal_closed OUTSIDE the if(begin_modal) block,
                // because BeginPopupModal returns false when X is clicked
                // (it calls EndPopup internally).
                lines.push(`${indent}if (modal_closed) { ${onCloseBody} }`);
                lines.push(`${indent}}`); // close the { bool modal_closed scope
            } else if (hadOpen) {
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
                const bodyCode = parts.slice(2).join('|');  // rejoin in case body contained |
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
    const disabledArg = node.disabled ? ', {}, true' : '';
    if (node.action.length === 0) {
        lines.push(`${indent}imx::renderer::button(${title}${disabledArg});`);
    } else {
        lines.push(`${indent}if (imx::renderer::button(${title}${disabledArg})) {`);
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
    } else if (node.directBind && node.valueExpr) {
        const propName = node.valueExpr.startsWith('props.') ? node.valueExpr.slice(6).split('.')[0].split('[')[0] : '';
        const isBound = currentBoundProps.has(propName);
        const readExpr = isBound ? `(*${node.valueExpr})` : node.valueExpr;
        const writeExpr = isBound ? `(*${node.valueExpr})` : node.valueExpr;
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${readExpr});`);
        lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${label}, buf)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${writeExpr} = buf.value();`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${node.valueExpr});`);
        lines.push(`${indent}${INDENT}if (imx::renderer::text_input(${label}, buf)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
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
    } else if (node.directBind && node.valueExpr) {
        // Direct pointer binding — no temp variable
        lines.push(`${indent}imx::renderer::checkbox(${label}, ${emitDirectBindPtr(node.valueExpr)});`);
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
    const idx = node.internalIndexVar;
    lines.push(`${indent}for (size_t ${idx} = 0; ${idx} < ${node.array}.size(); ${idx}++) {`);
    lines.push(`${indent}${INDENT}auto& ${node.itemVar} = ${node.array}[${idx}];`);
    lines.push(`${indent}${INDENT}size_t ${node.indexVar} = ${idx};`);
    lines.push(`${indent}${INDENT}ctx.begin_instance("${node.componentName}", (int)${idx}, ${node.stateCount}, ${node.bufferCount});`);
    emitNodes(node.body, lines, depth + 2);
    lines.push(`${indent}${INDENT}ctx.end_instance();`);
    lines.push(`${indent}}`);
}

function emitCustomComponent(node: IRCustomComponent, lines: string[], indent: string): void {
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
                lines.push(`${indent}${INDENT}p.${k} = &${v};`);
            } else {
                lines.push(`${indent}${INDENT}p.${k} = ${v};`);
            }
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
    const label = asCharPtr(node.label);
    const min = ensureFloatLiteral(node.min);
    const max = ensureFloatLiteral(node.max);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_float(${label}, &val, ${min}, ${max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        // Direct pointer binding
        lines.push(`${indent}imx::renderer::slider_float(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${min}, ${max});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_float(${label}, &val, ${min}, ${max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitSliderInt(node: IRSliderInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'SliderInt', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_int(${label}, &val, ${node.min}, ${node.max})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::slider_int(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${node.min}, ${node.max});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::slider_int(${label}, &val, ${node.min}, ${node.max})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitDragFloat(node: IRDragFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DragFloat', lines, indent);
    const label = asCharPtr(node.label);
    const speed = ensureFloatLiteral(node.speed);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_float(${label}, &val, ${speed})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::drag_float(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${speed});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_float(${label}, &val, ${speed})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitDragInt(node: IRDragInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'DragInt', lines, indent);
    const label = asCharPtr(node.label);
    const speed = ensureFloatLiteral(node.speed);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_int(${label}, &val, ${speed})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::drag_int(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${speed});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::drag_int(${label}, &val, ${speed})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitCombo(node: IRCombo, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'Combo', lines, indent);
    const label = asCharPtr(node.label);
    const itemsList = node.items.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const count = itemsList.length;
    const varName = `combo_items_${comboCounter++}`;

    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::combo(${label}, &val, ${varName}, ${count})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}imx::renderer::combo(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${varName}, ${count});`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::combo(${label}, &val, ${varName}, ${count})) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitInputInt(node: IRInputInt, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputInt', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_int(${label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::input_int(${label}, ${emitDirectBindPtr(node.valueExpr)});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_int(${label}, &val)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitInputFloat(node: IRInputFloat, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'InputFloat', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_float(${label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::input_float(${label}, ${emitDirectBindPtr(node.valueExpr)});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}float val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::input_float(${label}, &val)) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitColorEdit(node: IRColorEdit, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ColorEdit', lines, indent);
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_edit(${label}, val.data())) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        const propName = node.valueExpr.startsWith('props.') ? node.valueExpr.slice(6).split('.')[0].split('[')[0] : '';
        const isBound = currentBoundProps.has(propName);
        const dataExpr = isBound ? `(${node.valueExpr})->data()` : `${node.valueExpr}.data()`;
        lines.push(`${indent}imx::renderer::color_edit(${label}, ${dataExpr});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_edit(${label}, val.data())) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitListBox(node: IRListBox, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'ListBox', lines, indent);
    const label = asCharPtr(node.label);
    const itemsList = node.items.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const count = itemsList.length;
    const varName = `listbox_items_${listBoxCounter++}`;

    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::list_box(${label}, &val, ${varName}, ${count})) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}imx::renderer::list_box(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${varName}, ${count});`);
        lines.push(`${indent}}`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}const char* ${varName}[] = {${itemsList.join(', ')}};`);
        lines.push(`${indent}${INDENT}int val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::list_box(${label}, &val, ${varName}, ${count})) {`);
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
    } else if (node.directBind && node.valueExpr) {
        lines.push(`${indent}imx::renderer::radio(${label}, ${emitDirectBindPtr(node.valueExpr)}, ${node.index});`);
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
    const label = asCharPtr(node.label);
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_picker(${label}, val.data())) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else if (node.directBind && node.valueExpr) {
        const propName = node.valueExpr.startsWith('props.') ? node.valueExpr.slice(6).split('.')[0].split('[')[0] : '';
        const isBound = currentBoundProps.has(propName);
        const dataExpr = isBound ? `(${node.valueExpr})->data()` : `${node.valueExpr}.data()`;
        lines.push(`${indent}imx::renderer::color_picker(${label}, ${dataExpr});`);
    } else if (node.valueExpr !== undefined) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto val = ${node.valueExpr};`);
        lines.push(`${indent}${INDENT}if (imx::renderer::color_picker(${label}, val.data())) {`);
        if (node.onChangeExpr) {
            lines.push(`${indent}${INDENT}${INDENT}${node.onChangeExpr};`);
        }
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    }
}

function emitPlotLines(node: IRPlotLines, lines: string[], indent: string): void {
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
    } else {
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

function emitPlotHistogram(node: IRPlotHistogram, lines: string[], indent: string): void {
    emitLocComment(node.loc, 'PlotHistogram', lines, indent);
    const overlay = node.overlay ? `, ${node.overlay}` : ', nullptr';
    if (node.values.includes('.') || /^[a-zA-Z_]\w*$/.test(node.values)) {
        lines.push(`${indent}{`);
        const innerIndent = indent + INDENT;
        const styleVar = buildStyleVar(node.style, innerIndent, lines);
        const styleArg = styleVar ? `, ${styleVar}` : '';
        lines.push(`${innerIndent}imx::renderer::plot_histogram(${node.label}, ${node.values}.data(), static_cast<int>(${node.values}.size())${overlay}${styleArg});`);
        lines.push(`${indent}}`);
    } else {
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

function emitDrawLine(node: any, lines: string[], indent: string): void {
    const p1Parts = node.p1.split(',').map((s: string) => emitFloat(s.trim()));
    const p2Parts = node.p2.split(',').map((s: string) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_line(${p1Parts.join(', ')}, ${p2Parts.join(', ')}, ${color}, ${thickness});`);
}

function emitDrawRect(node: any, lines: string[], indent: string): void {
    const minParts = node.min.split(',').map((s: string) => emitFloat(s.trim()));
    const maxParts = node.max.split(',').map((s: string) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    const rounding = emitFloat(node.rounding);
    lines.push(`${indent}imx::renderer::draw_rect(${minParts.join(', ')}, ${maxParts.join(', ')}, ${color}, ${filled}, ${thickness}, ${rounding});`);
}

function emitDrawCircle(node: any, lines: string[], indent: string): void {
    const centerParts = node.center.split(',').map((s: string) => emitFloat(s.trim()));
    const radius = emitFloat(node.radius);
    const color = emitImVec4(node.color);
    const filled = node.filled;
    const thickness = emitFloat(node.thickness);
    lines.push(`${indent}imx::renderer::draw_circle(${centerParts.join(', ')}, ${radius}, ${color}, ${filled}, ${thickness});`);
}

function emitDrawText(node: any, lines: string[], indent: string): void {
    const posParts = node.pos.split(',').map((s: string) => emitFloat(s.trim()));
    const color = emitImVec4(node.color);
    const text = asCharPtr(node.text);
    lines.push(`${indent}imx::renderer::draw_text(${posParts.join(', ')}, ${color}, ${text});`);
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
