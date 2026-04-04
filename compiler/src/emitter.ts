import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType,
    IRBeginContainer, IREndContainer, IRText, IRButton, IRTextInput,
    IRCheckbox, IRSeparator, IRConditional, IRListMap, IRCustomComponent,
    IRBeginPopup, IREndPopup, IROpenPopup,
} from './ir.js';

const INDENT = '    ';

function cppType(t: IRType): string {
    switch (t) {
        case 'int': return 'int';
        case 'float': return 'float';
        case 'bool': return 'bool';
        case 'string': return 'std::string';
    }
}

function cppPropType(t: IRType | 'callback'): string {
    if (t === 'callback') return 'std::function<void()>';
    return cppType(t);
}

export function emitComponent(comp: IRComponent): string {
    const lines: string[] = [];

    // Headers
    lines.push('#include <reimgui/runtime.h>');
    lines.push('#include <reimgui/renderer.h>');
    lines.push('');

    // Props struct if component has params
    const hasProps = comp.params.length > 0;
    if (hasProps) {
        lines.push(`struct ${comp.name}Props {`);
        for (const p of comp.params) {
            lines.push(`${INDENT}${cppPropType(p.type)} ${p.name};`);
        }
        lines.push('};');
        lines.push('');
    }

    // Function signature
    const propsArg = hasProps ? `, const ${comp.name}Props& props` : '';
    lines.push(`void ${comp.name}_render(reimgui::RenderContext& ctx${propsArg}) {`);

    // State declarations
    for (const slot of comp.stateSlots) {
        const initVal = slot.type === 'string'
            ? `std::string(${slot.initialValue})`
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

export function emitRoot(rootName: string, stateCount: number, bufferCount: number): string {
    const lines: string[] = [];

    lines.push('#include <reimgui/runtime.h>');
    lines.push('');
    lines.push(`void ${rootName}_render(reimgui::RenderContext& ctx);`);
    lines.push('');
    lines.push('namespace reimgui {');
    lines.push('void render_root(Runtime& runtime) {');
    lines.push(`${INDENT}auto& ctx = runtime.begin_frame();`);
    lines.push(`${INDENT}ctx.begin_instance("${rootName}", 0, ${stateCount}, ${bufferCount});`);
    lines.push(`${INDENT}${rootName}_render(ctx);`);
    lines.push(`${INDENT}ctx.end_instance();`);
    lines.push(`${INDENT}runtime.end_frame();`);
    lines.push('}');
    lines.push('} // namespace reimgui');
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
            lines.push(`${indent}reimgui::renderer::separator();`);
            break;
        case 'begin_popup':
            lines.push(`${indent}if (reimgui::renderer::begin_popup(${node.id})) {`);
            break;
        case 'end_popup':
            lines.push(`${indent}reimgui::renderer::end_popup();`);
            lines.push(`${indent}}`);
            break;
        case 'open_popup':
            lines.push(`${indent}reimgui::renderer::open_popup(${node.id});`);
            break;
        case 'conditional':
            emitConditional(node, lines, indent, depth);
            break;
        case 'list_map':
            emitListMap(node, lines, indent, depth);
            break;
        case 'custom_component':
            emitCustomComponent(node, lines, indent);
            break;
    }
}

let styleCounter = 0;

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
    lines.push(`${indent}reimgui::Style ${varName};`);
    for (const [key, val] of Object.entries(styleProps)) {
        // Ensure the value is a float literal (e.g., 8 -> 8.0F, 8.5 -> 8.5F)
        const floatVal = val.includes('.') ? `${val}F` : `${val}.0F`;
        lines.push(`${indent}${varName}.${key} = ${floatVal};`);
    }
    return varName;
}

function emitBeginContainer(node: IRBeginContainer, lines: string[], indent: string): void {
    switch (node.tag) {
        case 'Window': {
            const title = node.props['title'] ?? '""';
            lines.push(`${indent}reimgui::renderer::begin_window(${title});`);
            break;
        }
        case 'Row': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}reimgui::renderer::begin_row(${style});`);
            } else {
                lines.push(`${indent}reimgui::renderer::begin_row();`);
            }
            break;
        }
        case 'Column': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}reimgui::renderer::begin_column(${style});`);
            } else {
                lines.push(`${indent}reimgui::renderer::begin_column();`);
            }
            break;
        }
        case 'View': {
            const style = buildStyleBlock(node, indent, lines);
            if (style) {
                lines.push(`${indent}reimgui::renderer::begin_view(${style});`);
            } else {
                lines.push(`${indent}reimgui::renderer::begin_view();`);
            }
            break;
        }
    }
}

function emitEndContainer(node: IREndContainer, lines: string[], indent: string): void {
    switch (node.tag) {
        case 'Window':
            lines.push(`${indent}reimgui::renderer::end_window();`);
            break;
        case 'Row':
            lines.push(`${indent}reimgui::renderer::end_row();`);
            break;
        case 'Column':
            lines.push(`${indent}reimgui::renderer::end_column();`);
            break;
        case 'View':
            lines.push(`${indent}reimgui::renderer::end_view();`);
            break;
    }
}

function emitText(node: IRText, lines: string[], indent: string): void {
    if (node.args.length === 0) {
        lines.push(`${indent}reimgui::renderer::text(${JSON.stringify(node.format)});`);
    } else {
        const argsStr = node.args.join(', ');
        lines.push(`${indent}reimgui::renderer::text(${JSON.stringify(node.format)}, ${argsStr});`);
    }
}

function emitButton(node: IRButton, lines: string[], indent: string, depth: number): void {
    if (node.action.length === 0) {
        lines.push(`${indent}reimgui::renderer::button(${node.title});`);
    } else {
        lines.push(`${indent}if (reimgui::renderer::button(${node.title})) {`);
        for (const stmt of node.action) {
            lines.push(`${indent}${INDENT}${stmt}`);
        }
        lines.push(`${indent}}`);
    }
}

function emitTextInput(node: IRTextInput, lines: string[], indent: string): void {
    const label = node.label && node.label !== '""' ? node.label : `"##textinput_${node.bufferIndex}"`;
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}auto& buf = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}${INDENT}buf.sync_from(${node.stateVar}.get());`);
        lines.push(`${indent}${INDENT}if (reimgui::renderer::text_input(${label}, buf)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(buf.value());`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}auto& buf_${node.bufferIndex} = ctx.get_buffer(${node.bufferIndex});`);
        lines.push(`${indent}reimgui::renderer::text_input(${label}, buf_${node.bufferIndex});`);
    }
}

function emitCheckbox(node: IRCheckbox, lines: string[], indent: string): void {
    if (node.stateVar) {
        lines.push(`${indent}{`);
        lines.push(`${indent}${INDENT}bool val = ${node.stateVar}.get();`);
        lines.push(`${indent}${INDENT}if (reimgui::renderer::checkbox(${node.label}, &val)) {`);
        lines.push(`${indent}${INDENT}${INDENT}${node.stateVar}.set(val);`);
        lines.push(`${indent}${INDENT}}`);
        lines.push(`${indent}}`);
    } else {
        lines.push(`${indent}reimgui::renderer::checkbox(${node.label}, nullptr);`);
    }
}

function emitConditional(node: IRConditional, lines: string[], indent: string, depth: number): void {
    lines.push(`${indent}if (${node.condition}) {`);
    emitNodes(node.body, lines, depth + 1);
    if (node.elseBody && node.elseBody.length > 0) {
        lines.push(`${indent}} else {`);
        emitNodes(node.elseBody, lines, depth + 1);
    }
    lines.push(`${indent}}`);
}

function emitListMap(node: IRListMap, lines: string[], indent: string, depth: number): void {
    lines.push(`${indent}for (size_t i = 0; i < ${node.array}.size(); i++) {`);
    lines.push(`${indent}${INDENT}auto& ${node.itemVar} = ${node.array}[i];`);
    lines.push(`${indent}${INDENT}ctx.begin_instance("${node.componentName}", i, ${node.stateCount}, ${node.bufferCount});`);
    emitNodes(node.body, lines, depth + 2);
    lines.push(`${indent}${INDENT}ctx.end_instance();`);
    lines.push(`${indent}}`);
}

function emitCustomComponent(node: IRCustomComponent, lines: string[], indent: string): void {
    const propsEntries = Object.entries(node.props);
    if (propsEntries.length > 0) {
        const propsStr = propsEntries.map(([k, v]) => `.${k} = ${v}`).join(', ');
        lines.push(`${indent}ctx.begin_instance("${node.name}", 0, ${node.stateCount}, ${node.bufferCount});`);
        lines.push(`${indent}${node.name}_render(ctx, {${propsStr}});`);
        lines.push(`${indent}ctx.end_instance();`);
    } else {
        lines.push(`${indent}ctx.begin_instance("${node.name}", 0, ${node.stateCount}, ${node.bufferCount});`);
        lines.push(`${indent}${node.name}_render(ctx);`);
        lines.push(`${indent}ctx.end_instance();`);
    }
}
