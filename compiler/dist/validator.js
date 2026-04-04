import ts from 'typescript';
import { HOST_COMPONENTS } from './components.js';
import { extractImports } from './parser.js';
function err(sf, node, msg) {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
    return { file: sf.fileName, line: line + 1, col: character + 1, message: msg };
}
export function validate(parsed) {
    const errors = [];
    const sf = parsed.sourceFile;
    const func = parsed.component;
    const customComponents = extractImports(sf);
    const useStateCalls = [];
    if (!func || !func.body)
        return { errors, customComponents, useStateCalls };
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
        validateExpression(returnStmt.expression, sf, customComponents, errors);
    }
    return { errors, customComponents, useStateCalls };
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
function validateExpression(node, sf, customComponents, errors) {
    if (ts.isJsxElement(node)) {
        validateJsxElement(node, sf, customComponents, errors);
    }
    else if (ts.isJsxSelfClosingElement(node)) {
        validateJsxTag(node.tagName, node, sf, customComponents, errors);
        validateJsxAttributes(node.attributes, node.tagName, sf, errors);
    }
    else if (ts.isJsxFragment(node)) {
        for (const child of node.children)
            validateExpression(child, sf, customComponents, errors);
    }
    else if (ts.isParenthesizedExpression(node)) {
        validateExpression(node.expression, sf, customComponents, errors);
    }
    else if (ts.isConditionalExpression(node)) {
        validateExpression(node.whenTrue, sf, customComponents, errors);
        validateExpression(node.whenFalse, sf, customComponents, errors);
    }
    else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        validateExpression(node.right, sf, customComponents, errors);
    }
    else if (ts.isJsxExpression(node) && node.expression) {
        validateExpression(node.expression, sf, customComponents, errors);
    }
    else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map') {
        const callback = node.arguments[0];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
            if (ts.isBlock(callback.body)) {
                const ret = callback.body.statements.find(ts.isReturnStatement);
                if (ret?.expression)
                    validateExpression(ret.expression, sf, customComponents, errors);
            }
            else if (callback.body) {
                validateExpression(callback.body, sf, customComponents, errors);
            }
        }
    }
}
function validateJsxElement(node, sf, customComponents, errors) {
    validateJsxTag(node.openingElement.tagName, node, sf, customComponents, errors);
    validateJsxAttributes(node.openingElement.attributes, node.openingElement.tagName, sf, errors);
    for (const child of node.children)
        validateExpression(child, sf, customComponents, errors);
}
function validateJsxTag(tagName, node, sf, customComponents, errors) {
    if (!ts.isIdentifier(tagName))
        return;
    // Host components and imported custom components are validated.
    // Unknown elements are treated as native widgets (validated by TypeScript + C++ linker).
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
