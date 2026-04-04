import ts from 'typescript';
import type { ParsedFile } from './parser.js';
import type { ValidationResult, UseStateInfo } from './validator.js';
import { HOST_COMPONENTS, isHostComponent } from './components.js';
import type {
    IRComponent, IRNode, IRStateSlot, IRPropParam, IRType, IRExpr, SourceLoc,
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

interface LoweringContext {
    stateVars: Map<string, IRStateSlot>;
    setterMap: Map<string, string>;  // setter name -> state var name
    propsParam: string | null;       // name of props parameter, if any
    bufferIndex: number;
    sourceFile: ts.SourceFile;
    customComponents: Map<string, string>;
}

function getLoc(node: ts.Node, ctx: LoweringContext): SourceLoc {
    const { line } = ctx.sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return { file: ctx.sourceFile.fileName, line: line + 1 };
}

export function lowerComponent(parsed: ParsedFile, validation: ValidationResult): IRComponent {
    const func = parsed.component!;
    const name = func.name!.text;

    // Build state slots
    const stateSlots: IRStateSlot[] = validation.useStateCalls.map(u => ({
        name: u.name,
        setter: u.setter,
        type: inferTypeFromExpr(u.initializer),
        initialValue: exprToLiteral(u.initializer),
        index: u.index,
    }));

    // Build state lookup maps
    const stateVars = new Map<string, IRStateSlot>();
    const setterMap = new Map<string, string>();
    for (const slot of stateSlots) {
        stateVars.set(slot.name, slot);
        setterMap.set(slot.setter, slot.name);
    }

    // Detect props parameter
    let propsParam: string | null = null;
    const params: IRPropParam[] = [];
    if (func.parameters.length > 0) {
        const param = func.parameters[0];
        if (ts.isIdentifier(param.name)) {
            propsParam = param.name.text;
        }
        // Extract prop types from type annotation
        if (param.type && ts.isTypeLiteralNode(param.type)) {
            for (const member of param.type.members) {
                if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
                    const propName = member.name.text;
                    const propType = inferPropType(member);
                    params.push({ name: propName, type: propType });
                }
            }
        }
    }

    const ctx: LoweringContext = {
        stateVars,
        setterMap,
        propsParam,
        bufferIndex: 0,
        sourceFile: parsed.sourceFile,
        customComponents: validation.customComponents,
    };

    // Find return statement and lower its JSX
    const body: IRNode[] = [];
    if (func.body) {
        const returnStmt = func.body.statements.find(ts.isReturnStatement);
        if (returnStmt && returnStmt.expression) {
            lowerJsxExpression(returnStmt.expression, body, ctx);
        }
    }

    return {
        name,
        stateSlots,
        bufferCount: ctx.bufferIndex,
        params,
        body,
    };
}

function inferPropType(member: ts.PropertySignature): IRType | 'callback' {
    if (!member.type) return 'string';
    if (ts.isFunctionTypeNode(member.type)) return 'callback';
    const text = member.type.getText();
    if (text === 'number') return 'int';
    if (text === 'boolean') return 'bool';
    if (text === 'string') return 'string';
    return 'string';
}

function inferTypeFromExpr(expr: ts.Expression): IRType {
    if (ts.isNumericLiteral(expr)) {
        // Use getText() to check original source text, since TS normalizes 5.0 to "5" in .text
        const rawText = expr.getText();
        return rawText.includes('.') ? 'float' : 'int';
    }
    if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return 'string';
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) return 'bool';
    if (ts.isArrayLiteralExpression(expr)) return 'color';
    // Default to int
    return 'int';
}

function exprToLiteral(expr: ts.Expression): string {
    if (ts.isNumericLiteral(expr)) {
        // Use getText() to preserve original source (e.g., "5.0" instead of "5")
        return expr.getText();
    }
    if (ts.isStringLiteral(expr)) return JSON.stringify(expr.text);
    if (expr.kind === ts.SyntaxKind.TrueKeyword) return 'true';
    if (expr.kind === ts.SyntaxKind.FalseKeyword) return 'false';
    if (ts.isArrayLiteralExpression(expr)) {
        const elements = expr.elements.map(e => {
            const text = e.getText();
            // Ensure float suffix for color array elements
            if (ts.isNumericLiteral(e)) {
                return text.includes('.') ? `${text}f` : `${text}.0f`;
            }
            return text;
        }).join(', ');
        return `{${elements}}`;
    }
    // Fallback: use text as-is
    return expr.getText();
}

/**
 * Convert a TypeScript expression to C++ code string.
 */
export function exprToCpp(node: ts.Expression, ctx: LoweringContext): string {
    // Numeric literal
    if (ts.isNumericLiteral(node)) {
        return node.text;
    }

    // String literal
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return JSON.stringify(node.text);
    }

    // Boolean literals
    if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true';
    if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';

    // Identifier
    if (ts.isIdentifier(node)) {
        const name = node.text;
        if (ctx.stateVars.has(name)) {
            return `${name}.get()`;
        }
        if (name === 'resetLayout') {
            return 'imx_reset_layout';
        }
        return name;
    }

    // Property access (e.g., props.name)
    if (ts.isPropertyAccessExpression(node)) {
        const obj = exprToCpp(node.expression, ctx);
        const prop = node.name.text;
        return `${obj}.${prop}`;
    }

    // Parenthesized expression
    if (ts.isParenthesizedExpression(node)) {
        return `(${exprToCpp(node.expression, ctx)})`;
    }

    // Binary expression
    if (ts.isBinaryExpression(node)) {
        const left = exprToCpp(node.left, ctx);
        const right = exprToCpp(node.right, ctx);
        const op = node.operatorToken.getText();
        return `${left} ${op} ${right}`;
    }

    // Prefix unary expression (e.g., !show)
    if (ts.isPrefixUnaryExpression(node)) {
        const operand = exprToCpp(node.operand, ctx);
        const opStr = node.operator === ts.SyntaxKind.ExclamationToken ? '!' :
                      node.operator === ts.SyntaxKind.MinusToken ? '-' :
                      node.operator === ts.SyntaxKind.PlusToken ? '+' : '';
        return `${opStr}${operand}`;
    }

    // Call expression
    if (ts.isCallExpression(node)) {
        const callee = node.expression;

        // Check for state setter: setCount(x) -> count.set(x)
        if (ts.isIdentifier(callee)) {
            const setterName = callee.text;
            const stateVarName = ctx.setterMap.get(setterName);
            if (stateVarName !== undefined) {
                const arg = node.arguments.length > 0 ? exprToCpp(node.arguments[0], ctx) : '';
                return `${stateVarName}.set(${arg})`;
            }
        }

        // General call expression
        const fn = exprToCpp(callee as ts.Expression, ctx);
        const args = node.arguments.map(a => exprToCpp(a as ts.Expression, ctx)).join(', ');
        return `${fn}(${args})`;
    }

    // Conditional (ternary) expression: a ? b : c
    if (ts.isConditionalExpression(node)) {
        const condition = exprToCpp(node.condition, ctx);
        const whenTrue = exprToCpp(node.whenTrue, ctx);
        const whenFalse = exprToCpp(node.whenFalse, ctx);
        return `${condition} ? ${whenTrue} : ${whenFalse}`;
    }

    // Arrow function -> C++ lambda
    if (ts.isArrowFunction(node)) {
        if (ts.isBlock(node.body)) {
            const stmts: string[] = [];
            for (const stmt of node.body.statements) {
                stmts.push(stmtToCpp(stmt, ctx));
            }
            return `[&]() { ${stmts.join(' ')} }`;
        } else {
            const bodyExpr = exprToCpp(node.body as ts.Expression, ctx);
            return `[&]() { ${bodyExpr}; }`;
        }
    }

    // Template literal
    if (ts.isTemplateExpression(node)) {
        let result = JSON.stringify(node.head.text);
        for (const span of node.templateSpans) {
            const expr = exprToCpp(span.expression, ctx);
            result = `${result} + std::to_string(${expr}) + ${JSON.stringify(span.literal.text)}`;
        }
        return result;
    }

    // Array literal: ["a", "b"] -> "\"a\", \"b\""
    if (ts.isArrayLiteralExpression(node)) {
        return node.elements.map(e => exprToCpp(e as ts.Expression, ctx)).join(', ');
    }

    // Fallback: use text representation
    return node.getText();
}

function stmtToCpp(stmt: ts.Statement, ctx: LoweringContext): string {
    if (ts.isExpressionStatement(stmt)) {
        return exprToCpp(stmt.expression, ctx) + ';';
    }
    if (ts.isReturnStatement(stmt)) {
        if (stmt.expression) {
            return 'return ' + exprToCpp(stmt.expression, ctx) + ';';
        }
        return 'return;';
    }
    return stmt.getText() + ';';
}

/**
 * Extract action statements from an arrow function callback for button onPress etc.
 */
function extractActionStatements(expr: ts.Expression, ctx: LoweringContext): string[] {
    if (ts.isArrowFunction(expr)) {
        if (ts.isBlock(expr.body)) {
            return expr.body.statements.map(s => stmtToCpp(s, ctx));
        } else {
            // Expression body: () => setCount(count + 1)
            return [exprToCpp(expr.body as ts.Expression, ctx) + ';'];
        }
    }
    // If not an arrow function, call it
    const code = exprToCpp(expr, ctx);
    // Bare identifier (not already a call) needs () to invoke
    if (ts.isIdentifier(expr)) {
        return [code + '();'];
    }
    return [code + ';'];
}

/**
 * Lower a JSX expression (possibly wrapped in parenthesized expr) into IR nodes.
 */
function lowerJsxExpression(node: ts.Node, body: IRNode[], ctx: LoweringContext): void {
    if (ts.isParenthesizedExpression(node)) {
        lowerJsxExpression(node.expression, body, ctx);
        return;
    }

    if (ts.isJsxElement(node)) {
        lowerJsxElement(node, body, ctx);
        return;
    }

    if (ts.isJsxSelfClosingElement(node)) {
        lowerJsxSelfClosing(node, body, ctx);
        return;
    }

    if (ts.isJsxFragment(node)) {
        for (const child of node.children) {
            lowerJsxChild(child, body, ctx);
        }
        return;
    }

    // Conditional: condition && <Element/>
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const condition = exprToCpp(node.left, ctx);
        const condBody: IRNode[] = [];
        lowerJsxExpression(node.right, condBody, ctx);
        body.push({ kind: 'conditional', condition, body: condBody, loc: getLoc(node, ctx) });
        return;
    }

    // Ternary: condition ? <A/> : <B/>
    if (ts.isConditionalExpression(node)) {
        const condition = exprToCpp(node.condition, ctx);
        const thenBody: IRNode[] = [];
        const elseBody: IRNode[] = [];
        lowerJsxExpression(node.whenTrue, thenBody, ctx);
        lowerJsxExpression(node.whenFalse, elseBody, ctx);
        body.push({ kind: 'conditional', condition, body: thenBody, elseBody, loc: getLoc(node, ctx) });
        return;
    }

    // items.map(item => <Comp/>)
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map') {
        lowerListMap(node, body, ctx, getLoc(node, ctx));
        return;
    }

    // JsxExpression wrapper
    if (ts.isJsxExpression(node) && node.expression) {
        lowerJsxExpression(node.expression, body, ctx);
        return;
    }
}

function lowerJsxElement(node: ts.JsxElement, body: IRNode[], ctx: LoweringContext): void {
    const tagName = node.openingElement.tagName;
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;

    if (name === 'Text') {
        lowerTextElement(node, body, ctx, getLoc(node, ctx));
        return;
    }

    if (name === 'BulletText') {
        lowerBulletTextElement(node, body, ctx, getLoc(node, ctx));
        return;
    }

    if (name === 'DockLayout') {
        body.push(lowerDockLayout(node, ctx));
        return;
    }

    if (isHostComponent(name)) {
        const def = HOST_COMPONENTS[name];
        const attrs = getAttributes(node.openingElement.attributes, ctx);

        if (def.isContainer) {
            const containerTag = name as IRBeginContainer['tag'];
            body.push({ kind: 'begin_container', tag: containerTag, props: attrs, loc: getLoc(node, ctx) });
            for (const child of node.children) {
                lowerJsxChild(child, body, ctx);
            }
            body.push({ kind: 'end_container', tag: containerTag });
            return;
        }

        // Popup
        if (name === 'Popup') {
            const id = attrs['id'] ?? '';
            body.push({ kind: 'begin_popup', id, loc: getLoc(node, ctx) });
            for (const child of node.children) {
                lowerJsxChild(child, body, ctx);
            }
            body.push({ kind: 'end_popup' });
            return;
        }
    }

    // Custom component with children - treat as container-like (not common but handle gracefully)
    if (!isHostComponent(name)) {
        if (ctx.customComponents && ctx.customComponents.has(name)) {
            lowerCustomComponent(name, node.openingElement.attributes, body, ctx, getLoc(node, ctx));
        } else {
            lowerNativeWidget(name, node.openingElement.attributes, body, ctx, getLoc(node, ctx));
        }
        return;
    }
}

function lowerJsxSelfClosing(node: ts.JsxSelfClosingElement, body: IRNode[], ctx: LoweringContext): void {
    const tagName = node.tagName;
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;

    if (!isHostComponent(name)) {
        if (ctx.customComponents && ctx.customComponents.has(name)) {
            lowerCustomComponent(name, node.attributes, body, ctx, getLoc(node, ctx));
        } else {
            lowerNativeWidget(name, node.attributes, body, ctx, getLoc(node, ctx));
        }
        return;
    }

    const attrs = getAttributes(node.attributes, ctx);
    const rawAttrs = getRawAttributes(node.attributes);

    const loc = getLoc(node, ctx);

    switch (name) {
        case 'Button':
            lowerButton(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'TextInput':
            lowerTextInput(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'Checkbox':
            lowerCheckbox(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'MenuItem':
            lowerMenuItem(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'SliderFloat':
            lowerSliderFloat(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'SliderInt':
            lowerSliderInt(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'DragFloat':
            lowerDragFloat(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'DragInt':
            lowerDragInt(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'Combo':
            lowerCombo(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'InputInt':
            lowerInputInt(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'InputFloat':
            lowerInputFloat(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'ColorEdit':
            lowerColorEdit(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'ListBox':
            lowerListBox(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'ProgressBar':
            lowerProgressBar(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'Tooltip':
            lowerTooltip(attrs, body, ctx, loc);
            break;
        case 'Separator':
            body.push({ kind: 'separator', loc });
            break;
        case 'Text':
            // Self-closing <Text /> - empty text
            body.push({ kind: 'text', format: '', args: [], loc });
            break;
        case 'BulletText':
            // Self-closing <BulletText /> - empty bullet
            body.push({ kind: 'bullet_text', format: '', args: [], loc });
            break;
        case 'LabelText':
            lowerLabelText(attrs, body, ctx, loc);
            break;
        case 'Selectable':
            lowerSelectable(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'Radio':
            lowerRadio(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'InputTextMultiline':
            lowerInputTextMultiline(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'ColorPicker':
            lowerColorPicker(attrs, rawAttrs, body, ctx, loc);
            break;
        case 'PlotLines':
            lowerPlotLines(attrs, body, ctx, loc);
            break;
        case 'PlotHistogram':
            lowerPlotHistogram(attrs, body, ctx, loc);
            break;
        case 'Image':
            lowerImage(attrs, body, ctx, loc);
            break;
        default:
            // Container self-closing (e.g., <Window title="X"/>)
            if (HOST_COMPONENTS[name]?.isContainer) {
                const containerTag = name as IRBeginContainer['tag'];
                body.push({ kind: 'begin_container', tag: containerTag, props: attrs, loc });
                body.push({ kind: 'end_container', tag: containerTag });
            }
            break;
    }
}

function lowerButton(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const title = attrs['title'] ?? '""';
    const onPressExpr = rawAttrs.get('onPress');
    let action: string[] = [];
    if (onPressExpr) {
        action = extractActionStatements(onPressExpr, ctx);
    }
    const style = attrs['style'];
    body.push({ kind: 'button', title, action, style, loc });
}

function lowerTextInput(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const bufferIndex = ctx.bufferIndex++;

    // Detect bound state variable from value prop
    let stateVar = '';
    const valueExpr = rawAttrs.get('value');
    if (valueExpr && ts.isIdentifier(valueExpr)) {
        const varName = valueExpr.text;
        if (ctx.stateVars.has(varName)) {
            stateVar = varName;
        }
    }

    const style = attrs['style'];
    body.push({ kind: 'text_input', label, bufferIndex, stateVar, style, loc });
}

function lowerCheckbox(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';

    // Detect bound state variable from value prop
    let stateVar = '';
    let valueExprStr: string | undefined;
    let onChangeExprStr: string | undefined;
    const valueExpr = rawAttrs.get('value');
    if (valueExpr && ts.isIdentifier(valueExpr)) {
        const varName = valueExpr.text;
        if (ctx.stateVars.has(varName)) {
            stateVar = varName;
        } else {
            // Non-state value (e.g., props.done passed as identifier)
            valueExprStr = exprToCpp(valueExpr, ctx);
        }
    } else if (valueExpr) {
        // Non-state value expression (e.g., props.done)
        valueExprStr = exprToCpp(valueExpr, ctx);
    }

    // If not state-bound, get onChange expression
    if (!stateVar) {
        const onChangeRaw = rawAttrs.get('onChange');
        if (onChangeRaw) {
            onChangeExprStr = exprToCpp(onChangeRaw, ctx);
            // If it's not already a lambda/call, make it a call
            if (!onChangeExprStr.startsWith('[') && !onChangeExprStr.endsWith(')')) {
                onChangeExprStr = `${onChangeExprStr}()`;
            }
        }
    }

    const style = attrs['style'];
    body.push({ kind: 'checkbox', label, stateVar, valueExpr: valueExprStr, onChangeExpr: onChangeExprStr, style, loc });
}

function lowerMenuItem(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const shortcut = attrs['shortcut'];
    const onPressExpr = rawAttrs.get('onPress');
    let action: string[] = [];
    if (onPressExpr) {
        action = extractActionStatements(onPressExpr, ctx);
    }
    body.push({ kind: 'menu_item', label, shortcut, action, loc });
}

function lowerTextElement(node: ts.JsxElement, body: IRNode[], ctx: LoweringContext, loc?: SourceLoc): void {
    let format = '';
    const args: string[] = [];

    for (const child of node.children) {
        if (ts.isJsxText(child)) {
            // Collapse whitespace (newlines, tabs, runs of spaces) into single spaces,
            // matching JSX semantics. Only fully-blank segments are dropped.
            const text = child.text.replace(/%/g, '%%').replace(/\s+/g, ' ');
            // Drop segments that are purely whitespace at the very start or end of children
            const isFirst = child === node.children[0];
            const isLast = child === node.children[node.children.length - 1];
            const trimmed = isFirst && isLast ? text.trim()
                : isFirst ? text.trimStart()
                : isLast ? text.trimEnd()
                : text;
            if (trimmed) format += trimmed;
        } else if (ts.isJsxExpression(child) && child.expression) {
            const expr = child.expression;
            const cppExpr = exprToCpp(expr, ctx);
            const exprType = inferExprType(expr, ctx);

            switch (exprType) {
                case 'int':
                    format += '%d';
                    args.push(cppExpr);
                    break;
                case 'float':
                    format += '%.2f';
                    args.push(cppExpr);
                    break;
                case 'bool':
                    format += '%s';
                    args.push(`${cppExpr} ? "true" : "false"`);
                    break;
                case 'string':
                    format += '%s';
                    // String literals and ternaries of literals are already const char*
                    if (cppExpr.startsWith('"') || isCharPtrExpression(expr)) {
                        args.push(cppExpr);
                    } else {
                        args.push(`${cppExpr}.c_str()`);
                    }
                    break;
                default:
                    format += '%s';
                    args.push(`std::to_string(${cppExpr}).c_str()`);
                    break;
            }
        }
    }

    body.push({ kind: 'text', format, args, loc });
}

/**
 * Check if an expression will produce a const char* in C++ (not std::string).
 * String literals and ternaries where both branches are string literals qualify.
 */
function isCharPtrExpression(expr: ts.Expression): boolean {
    if (ts.isStringLiteral(expr)) return true;
    if (ts.isConditionalExpression(expr)) {
        return isCharPtrExpression(expr.whenTrue) && isCharPtrExpression(expr.whenFalse);
    }
    return false;
}

function inferExprType(expr: ts.Expression, ctx: LoweringContext): IRType {
    if (ts.isNumericLiteral(expr)) {
        return expr.text.includes('.') ? 'float' : 'int';
    }
    if (ts.isStringLiteral(expr)) return 'string';
    if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) return 'bool';

    // Identifier: check state var type
    if (ts.isIdentifier(expr)) {
        const slot = ctx.stateVars.get(expr.text);
        if (slot) return slot.type;
    }

    // Property access: props.name -> look for string by default
    if (ts.isPropertyAccessExpression(expr)) {
        return 'string';
    }

    // Binary expression: infer from operands
    if (ts.isBinaryExpression(expr)) {
        const op = expr.operatorToken.kind;
        // Comparison operators return bool
        if (op === ts.SyntaxKind.EqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            op === ts.SyntaxKind.ExclamationEqualsToken || op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            op === ts.SyntaxKind.LessThanToken || op === ts.SyntaxKind.LessThanEqualsToken ||
            op === ts.SyntaxKind.GreaterThanToken || op === ts.SyntaxKind.GreaterThanEqualsToken ||
            op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
            return 'bool';
        }
        // Arithmetic: infer from left side
        return inferExprType(expr.left, ctx);
    }

    // Conditional (ternary): infer from the result branches
    if (ts.isConditionalExpression(expr)) {
        return inferExprType(expr.whenTrue, ctx);
    }

    // Call expression that is a state getter
    if (ts.isCallExpression(expr) && ts.isIdentifier(expr.expression)) {
        const name = expr.expression.text;
        if (ctx.setterMap.has(name)) {
            const stateVarName = ctx.setterMap.get(name)!;
            const slot = ctx.stateVars.get(stateVarName);
            if (slot) return slot.type;
        }
    }

    return 'int'; // default
}

function lowerListMap(node: ts.CallExpression, body: IRNode[], ctx: LoweringContext, loc?: SourceLoc): void {
    const propAccess = node.expression as ts.PropertyAccessExpression;
    const array = exprToCpp(propAccess.expression, ctx);
    const callback = node.arguments[0];

    let itemVar = 'item';
    let mapBody: IRNode[] = [];

    if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
        if (callback.parameters.length > 0 && ts.isIdentifier(callback.parameters[0].name)) {
            itemVar = callback.parameters[0].name.text;
        }
        if (ts.isBlock(callback.body)) {
            const ret = callback.body.statements.find(ts.isReturnStatement);
            if (ret?.expression) {
                lowerJsxExpression(ret.expression, mapBody, ctx);
            }
        } else if (callback.body) {
            lowerJsxExpression(callback.body as ts.Expression, mapBody, ctx);
        }
    }

    body.push({
        kind: 'list_map',
        array,
        itemVar,
        key: 'i',
        componentName: 'ListItem',
        stateCount: 0,
        bufferCount: 0,
        body: mapBody,
        loc,
    });
}

function lowerCustomComponent(name: string, attributes: ts.JsxAttributes, body: IRNode[], ctx: LoweringContext, loc?: SourceLoc): void {
    const attrs = getAttributes(attributes, ctx);
    body.push({
        kind: 'custom_component',
        name,
        props: attrs,
        stateCount: 0,
        bufferCount: 0,
        loc,
    });
}

function lowerNativeWidget(name: string, attributes: ts.JsxAttributes, body: IRNode[], ctx: LoweringContext, loc?: SourceLoc): void {
    const props: Record<string, string> = {};
    const callbackProps: Record<string, string> = {};
    const rawAttrs = getRawAttributes(attributes);

    for (const [attrName, expr] of rawAttrs) {
        if (attrName === 'key') continue;
        if (!expr) {
            props[attrName] = 'true';
            continue;
        }

        if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr)) {
            const params = expr.parameters;
            if (params.length > 0) {
                // Parameterized callback: (v: number) => setVol(v)
                const param = params[0];
                const paramName = ts.isIdentifier(param.name) ? param.name.text : '_p';
                let cppType = 'float';
                if (param.type) {
                    const typeText = param.type.getText();
                    if (typeText === 'number') cppType = 'float';
                    else if (typeText === 'boolean') cppType = 'bool';
                    else if (typeText === 'string') cppType = 'std::string';
                }
                const bodyCode = ts.isBlock(expr.body)
                    ? expr.body.statements.map(s => stmtToCpp(s, ctx)).join(' ')
                    : exprToCpp(expr.body as ts.Expression, ctx) + ';';
                callbackProps[attrName] = `[&](std::any _v) { auto ${paramName} = std::any_cast<${cppType}>(_v); ${bodyCode} }`;
            } else {
                // Void callback: () => doSomething()
                const bodyCode = ts.isBlock(expr.body)
                    ? expr.body.statements.map(s => stmtToCpp(s, ctx)).join(' ')
                    : exprToCpp(expr.body as ts.Expression, ctx) + ';';
                callbackProps[attrName] = `[&](std::any) { ${bodyCode} }`;
            }
        } else {
            props[attrName] = exprToCpp(expr, ctx);
        }
    }

    const keyAttr = rawAttrs.get('key');
    const key = keyAttr ? exprToCpp(keyAttr, ctx) : undefined;

    body.push({
        kind: 'native_widget',
        name,
        props,
        callbackProps,
        key,
        loc,
    });
}

function lowerDockLayout(node: ts.JsxElement, ctx: LoweringContext): IRDockLayout {
    const children: (IRDockSplit | IRDockPanel)[] = [];
    for (const child of node.children) {
        if (ts.isJsxElement(child)) {
            const tag = child.openingElement.tagName;
            if (ts.isIdentifier(tag)) {
                if (tag.text === 'DockSplit') children.push(lowerDockSplit(child, ctx));
                else if (tag.text === 'DockPanel') children.push(lowerDockPanel(child, ctx));
            }
        }
    }
    return { kind: 'dock_layout', children, loc: getLoc(node, ctx) };
}

function lowerDockSplit(node: ts.JsxElement, ctx: LoweringContext): IRDockSplit {
    const attrs = getAttributes(node.openingElement.attributes, ctx);
    const direction = attrs['direction'] ?? '"horizontal"';
    const size = attrs['size'] ?? '0.5';
    const children: (IRDockSplit | IRDockPanel)[] = [];
    for (const child of node.children) {
        if (ts.isJsxElement(child)) {
            const tag = child.openingElement.tagName;
            if (ts.isIdentifier(tag)) {
                if (tag.text === 'DockSplit') children.push(lowerDockSplit(child, ctx));
                else if (tag.text === 'DockPanel') children.push(lowerDockPanel(child, ctx));
            }
        }
    }
    return { kind: 'dock_split', direction, size, children };
}

function lowerDockPanel(node: ts.JsxElement, ctx: LoweringContext): IRDockPanel {
    const windows: string[] = [];
    for (const child of node.children) {
        if (ts.isJsxSelfClosingElement(child)) {
            const tag = child.tagName;
            if (ts.isIdentifier(tag) && tag.text === 'Window') {
                const attrs = getAttributes(child.attributes, ctx);
                if (attrs['title']) windows.push(attrs['title']);
            }
        }
    }
    return { kind: 'dock_panel', windows };
}

function lowerJsxChild(child: ts.JsxChild, body: IRNode[], ctx: LoweringContext): void {
    if (ts.isJsxElement(child)) {
        lowerJsxElement(child, body, ctx);
    } else if (ts.isJsxSelfClosingElement(child)) {
        lowerJsxSelfClosing(child, body, ctx);
    } else if (ts.isJsxExpression(child)) {
        if (child.expression) {
            lowerJsxExpression(child.expression, body, ctx);
        }
    } else if (ts.isJsxText(child)) {
        // Standalone text not inside <Text> — usually whitespace, skip
    }
}

function lowerBulletTextElement(node: ts.JsxElement, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    // Same logic as lowerTextElement but produces bullet_text kind
    const children = node.children;
    const parts: string[] = [];
    const args: string[] = [];
    for (const child of children) {
        if (ts.isJsxText(child)) {
            const trimmed = child.text.trim();
            if (trimmed) parts.push(trimmed.replace(/%/g, '%%'));
        } else if (ts.isJsxExpression(child) && child.expression) {
            args.push(exprToCpp(child.expression, ctx));
            parts.push('%s');
        }
    }
    const format = parts.join(' ');
    body.push({ kind: 'bullet_text', format, args, loc });
}

function lowerLabelText(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const value = attrs['value'] ?? '""';
    body.push({ kind: 'label_text', label, value, loc });
}

function lowerSelectable(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const selected = attrs['selected'] ?? 'false';
    const onSelectExpr = rawAttrs.get('onSelect');
    let action: string[] = [];
    if (onSelectExpr) {
        action = extractActionStatements(onSelectExpr, ctx);
    }
    const style = attrs['style'];
    body.push({ kind: 'selectable', label, selected, action, style, loc });
}

function lowerRadio(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const index = attrs['index'] ?? '0';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'radio', label, stateVar, valueExpr, onChangeExpr, index, style, loc });
}

function lowerInputTextMultiline(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const bufferIndex = ctx.bufferIndex++;
    let stateVar = '';
    const valueExpr = rawAttrs.get('value');
    if (valueExpr && ts.isIdentifier(valueExpr)) {
        const varName = valueExpr.text;
        if (ctx.stateVars.has(varName)) {
            stateVar = varName;
        }
    }
    const style = attrs['style'];
    body.push({ kind: 'input_text_multiline', label, bufferIndex, stateVar, style, loc });
}

function lowerColorPicker(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    let stateVar = '';
    const valueRaw = rawAttrs.get('value');
    if (valueRaw && ts.isIdentifier(valueRaw) && ctx.stateVars.has(valueRaw.text)) {
        stateVar = valueRaw.text;
    }
    body.push({ kind: 'color_picker', label, stateVar, style, loc });
}

function lowerPlotLines(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const values = attrs['values'] ?? '';
    const overlay = attrs['overlay'];
    const style = attrs['style'];
    body.push({ kind: 'plot_lines', label, values, overlay, style, loc });
}

function lowerPlotHistogram(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const values = attrs['values'] ?? '';
    const overlay = attrs['overlay'];
    const style = attrs['style'];
    body.push({ kind: 'plot_histogram', label, values, overlay, style, loc });
}

function lowerImage(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const src = attrs['src'] ?? '""';
    const embed = attrs['embed'] === 'true';
    const width = attrs['width'];
    const height = attrs['height'];

    let embedKey: string | undefined;
    if (embed) {
        // Derive key from src: strip quotes, replace non-alnum with underscore
        const rawSrc = src.replace(/^"|"$/g, '');
        embedKey = rawSrc.replace(/[^a-zA-Z0-9]/g, '_');
    }

    body.push({ kind: 'image', src, embed, embedKey, width, height, loc });
}

function getAttributes(attributes: ts.JsxAttributes, ctx: LoweringContext): Record<string, string> {
    const result: Record<string, string> = {};
    for (const attr of attributes.properties) {
        if (ts.isJsxAttribute(attr) && attr.name && ts.isIdentifier(attr.name)) {
            const name = attr.name.text;
            if (attr.initializer) {
                if (ts.isStringLiteral(attr.initializer)) {
                    result[name] = JSON.stringify(attr.initializer.text);
                } else if (ts.isJsxExpression(attr.initializer) && attr.initializer.expression) {
                    result[name] = exprToCpp(attr.initializer.expression, ctx);
                }
            } else {
                // Boolean shorthand: <X disabled /> means disabled={true}
                result[name] = 'true';
            }
        }
    }
    return result;
}

function getRawAttributes(attributes: ts.JsxAttributes): Map<string, ts.Expression | null> {
    const result = new Map<string, ts.Expression | null>();
    for (const attr of attributes.properties) {
        if (ts.isJsxAttribute(attr) && attr.name && ts.isIdentifier(attr.name)) {
            const name = attr.name.text;
            if (attr.initializer && ts.isJsxExpression(attr.initializer)) {
                result.set(name, attr.initializer.expression ?? null);
            } else if (attr.initializer && ts.isStringLiteral(attr.initializer)) {
                result.set(name, attr.initializer);
            } else {
                result.set(name, null);
            }
        }
    }
    return result;
}

function lowerValueOnChange(rawAttrs: Map<string, ts.Expression | null>, ctx: LoweringContext): { stateVar: string; valueExpr?: string; onChangeExpr?: string } {
    let stateVar = '';
    let valueExpr: string | undefined;
    let onChangeExpr: string | undefined;
    const valueRaw = rawAttrs.get('value');
    if (valueRaw && ts.isIdentifier(valueRaw) && ctx.stateVars.has(valueRaw.text)) {
        stateVar = valueRaw.text;
    } else if (valueRaw) {
        valueExpr = exprToCpp(valueRaw, ctx);
        const onChangeRaw = rawAttrs.get('onChange');
        if (onChangeRaw) {
            onChangeExpr = exprToCpp(onChangeRaw, ctx);
            if (!onChangeExpr.startsWith('[') && !onChangeExpr.endsWith(')')) {
                onChangeExpr = `${onChangeExpr}()`;
            }
        }
    }
    return { stateVar, valueExpr, onChangeExpr };
}

function lowerSliderFloat(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const min = attrs['min'] ?? '0.0f';
    const max = attrs['max'] ?? '1.0f';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'slider_float', label, stateVar, valueExpr, onChangeExpr, min, max, style, loc });
}

function lowerSliderInt(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const min = attrs['min'] ?? '0';
    const max = attrs['max'] ?? '100';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'slider_int', label, stateVar, valueExpr, onChangeExpr, min, max, style, loc });
}

function lowerDragFloat(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const speed = attrs['speed'] ?? '1.0f';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'drag_float', label, stateVar, valueExpr, onChangeExpr, speed, style, loc });
}

function lowerDragInt(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const speed = attrs['speed'] ?? '1.0f';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'drag_int', label, stateVar, valueExpr, onChangeExpr, speed, style, loc });
}

function lowerCombo(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const items = attrs['items'] ?? '';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'combo', label, stateVar, valueExpr, onChangeExpr, items, style, loc });
}

function lowerInputInt(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'input_int', label, stateVar, valueExpr, onChangeExpr, style, loc });
}

function lowerInputFloat(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'input_float', label, stateVar, valueExpr, onChangeExpr, style, loc });
}

function lowerColorEdit(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const style = attrs['style'];
    // ColorEdit only supports state-bound values
    let stateVar = '';
    const valueRaw = rawAttrs.get('value');
    if (valueRaw && ts.isIdentifier(valueRaw) && ctx.stateVars.has(valueRaw.text)) {
        stateVar = valueRaw.text;
    }
    body.push({ kind: 'color_edit', label, stateVar, style, loc });
}

function lowerListBox(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const label = attrs['label'] ?? '""';
    const items = attrs['items'] ?? '';
    const style = attrs['style'];
    const { stateVar, valueExpr, onChangeExpr } = lowerValueOnChange(rawAttrs, ctx);
    body.push({ kind: 'list_box', label, stateVar, valueExpr, onChangeExpr, items, style, loc });
}

function lowerProgressBar(attrs: Record<string, string>, rawAttrs: Map<string, ts.Expression | null>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const value = attrs['value'] ?? '0.0f';
    const overlay = attrs['overlay'];
    const style = attrs['style'];
    body.push({ kind: 'progress_bar', value, overlay, style, loc });
}

function lowerTooltip(attrs: Record<string, string>, body: IRNode[], ctx: LoweringContext, loc: SourceLoc): void {
    const text = attrs['text'] ?? '""';
    body.push({ kind: 'tooltip', text, loc });
}
