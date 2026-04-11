import ts from 'typescript';
import { HOST_COMPONENTS, isHostComponent } from './components.js';
import { extractImports } from './parser.js';
function err(sf, node, msg) {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
    return { file: sf.fileName, line: line + 1, col: character + 1, message: msg };
}
function warn(sf, node, msg) {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
    return { file: sf.fileName, line: line + 1, col: character + 1, message: msg, severity: 'warning' };
}
export function validate(parsed) {
    const errors = [];
    const warnings = [];
    const sf = parsed.sourceFile;
    const func = parsed.component;
    const customComponents = extractImports(sf);
    const useStateCalls = [];
    if (!func || !func.body)
        return { errors, warnings, customComponents, useStateCalls };
    let slotIndex = 0;
    for (const stmt of func.body.statements) {
        if (ts.isVariableStatement(stmt)) {
            for (const decl of stmt.declarationList.declarations) {
                if (isUseStateCall(decl)) {
                    const info = extractUseState(decl, slotIndex, sf, errors);
                    if (info) {
                        useStateCalls.push(info);
                        slotIndex++;
                    }
                }
            }
        }
    }
    const returnStmt = func.body.statements.find(ts.isReturnStatement);
    if (returnStmt && returnStmt.expression) {
        validateExpression(returnStmt.expression, sf, customComponents, errors, warnings);
    }
    return { errors, warnings, customComponents, useStateCalls };
}
function isUseStateCall(decl) {
    if (!decl.initializer || !ts.isCallExpression(decl.initializer))
        return false;
    const callee = decl.initializer.expression;
    return ts.isIdentifier(callee) && callee.text === 'useState';
}
function extractUseState(decl, index, sf, errors) {
    const call = decl.initializer;
    if (!ts.isArrayBindingPattern(decl.name)) {
        errors.push(err(sf, decl, 'useState must use array destructuring'));
        return null;
    }
    const elements = decl.name.elements;
    if (elements.length !== 2) {
        errors.push(err(sf, decl, 'useState destructuring must have exactly 2 elements'));
        return null;
    }
    const nameEl = elements[0], setterEl = elements[1];
    if (!ts.isBindingElement(nameEl) || !ts.isIdentifier(nameEl.name)) {
        errors.push(err(sf, nameEl, 'First useState element must be an identifier'));
        return null;
    }
    if (!ts.isBindingElement(setterEl) || !ts.isIdentifier(setterEl.name)) {
        errors.push(err(sf, setterEl, 'Second useState element must be an identifier'));
        return null;
    }
    if (call.arguments.length !== 1) {
        errors.push(err(sf, call, 'useState requires exactly 1 argument'));
        return null;
    }
    return { name: nameEl.name.text, setter: setterEl.name.text, initializer: call.arguments[0], index };
}
function validateExpression(node, sf, customComponents, errors, warnings) {
    if (ts.isJsxElement(node)) {
        validateJsxElement(node, sf, customComponents, errors, warnings);
    }
    else if (ts.isJsxSelfClosingElement(node)) {
        validateJsxTag(node.tagName, node, sf, customComponents, warnings);
        validateJsxAttributes(node.attributes, node.tagName, sf, errors);
    }
    else if (ts.isJsxFragment(node)) {
        for (const child of node.children)
            validateExpression(child, sf, customComponents, errors, warnings);
    }
    else if (ts.isParenthesizedExpression(node)) {
        validateExpression(node.expression, sf, customComponents, errors, warnings);
    }
    else if (ts.isConditionalExpression(node)) {
        validateExpression(node.whenTrue, sf, customComponents, errors, warnings);
        validateExpression(node.whenFalse, sf, customComponents, errors, warnings);
    }
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        validateExpression(node.right, sf, customComponents, errors, warnings);
    }
    else if (ts.isJsxExpression(node) && node.expression) {
        validateExpression(node.expression, sf, customComponents, errors, warnings);
    }
    else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map') {
        const callback = node.arguments[0];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
            let mapBody;
            if (ts.isBlock(callback.body)) {
                const ret = callback.body.statements.find(ts.isReturnStatement);
                mapBody = ret?.expression;
            }
            else if (callback.body) {
                mapBody = callback.body;
            }
            if (mapBody) {
                validateExpression(mapBody, sf, customComponents, errors, warnings);
                if (!hasIDWrapper(mapBody)) {
                    warnings.push(warn(sf, node, 'Items in .map() should be wrapped in <ID scope={i}> to avoid ImGui ID conflicts'));
                }
            }
        }
    }
}
// Components that handle their own ID scoping (no <ID> wrapper needed in .map())
const SELF_SCOPED_COMPONENTS = new Set(['ID', 'TableRow', 'TabItem']);
function hasIDWrapper(expr) {
    if (ts.isParenthesizedExpression(expr))
        return hasIDWrapper(expr.expression);
    if (ts.isJsxElement(expr) && ts.isIdentifier(expr.openingElement.tagName) && SELF_SCOPED_COMPONENTS.has(expr.openingElement.tagName.text))
        return true;
    if (ts.isJsxSelfClosingElement(expr) && ts.isIdentifier(expr.tagName) && SELF_SCOPED_COMPONENTS.has(expr.tagName.text))
        return true;
    return false;
}
function validateJsxElement(node, sf, customComponents, errors, warnings) {
    validateJsxTag(node.openingElement.tagName, node, sf, customComponents, warnings);
    validateJsxAttributes(node.openingElement.attributes, node.openingElement.tagName, sf, errors);
    for (const child of node.children)
        validateExpression(child, sf, customComponents, errors, warnings);
}
function validateJsxTag(tagName, node, sf, customComponents, warnings) {
    if (!ts.isIdentifier(tagName))
        return;
    const name = tagName.text;
    // Skip lowercase tags (intrinsic HTML-like elements)
    if (name[0] === name[0].toLowerCase())
        return;
    // Known host component or imported custom component — fine
    if (isHostComponent(name) || customComponents.has(name))
        return;
    // Unknown uppercase component — warn (may be a native C++ widget)
    warnings.push(warn(sf, node, `Unknown component '<${name}>' -- will be treated as a native C++ widget. If this is intentional, you can ignore this warning.`));
}
function validateJsxAttributes(attrs, tagName, sf, errors) {
    if (!ts.isIdentifier(tagName))
        return;
    const name = tagName.text;
    const def = HOST_COMPONENTS[name];
    if (!def)
        return;
    const presentProps = new Set();
    for (const attr of attrs.properties) {
        if (ts.isJsxAttribute(attr) && attr.name && ts.isIdentifier(attr.name))
            presentProps.add(attr.name.text);
    }
    for (const [propName, propDef] of Object.entries(def.props)) {
        if (propDef.required && !presentProps.has(propName)) {
            errors.push(err(sf, attrs, `<${name}> requires prop '${propName}'`));
        }
    }
}
