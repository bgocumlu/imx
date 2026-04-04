import ts from 'typescript';
import { HOST_COMPONENTS, isHostComponent } from './components.js';
import type { ParsedFile, ParseError } from './parser.js';
import { extractImports } from './parser.js';

export interface ValidationResult {
    errors: ParseError[];
    customComponents: Map<string, string>;
    useStateCalls: UseStateInfo[];
}

export interface UseStateInfo {
    name: string;
    setter: string;
    initializer: ts.Expression;
    index: number;
}

function err(sf: ts.SourceFile, node: ts.Node, msg: string): ParseError {
    const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart());
    return { file: sf.fileName, line: line + 1, col: character + 1, message: msg };
}

export function validate(parsed: ParsedFile): ValidationResult {
    const errors: ParseError[] = [];
    const sf = parsed.sourceFile;
    const func = parsed.component;
    const customComponents = extractImports(sf);
    const useStateCalls: UseStateInfo[] = [];

    if (!func || !func.body) return { errors, customComponents, useStateCalls };

    let slotIndex = 0;
    for (const stmt of func.body.statements) {
        if (ts.isVariableStatement(stmt)) {
            for (const decl of stmt.declarationList.declarations) {
                if (isUseStateCall(decl)) {
                    const info = extractUseState(decl, slotIndex, sf, errors);
                    if (info) { useStateCalls.push(info); slotIndex++; }
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

function isUseStateCall(decl: ts.VariableDeclaration): boolean {
    if (!decl.initializer || !ts.isCallExpression(decl.initializer)) return false;
    const callee = decl.initializer.expression;
    return ts.isIdentifier(callee) && callee.text === 'useState';
}

function extractUseState(decl: ts.VariableDeclaration, index: number, sf: ts.SourceFile, errors: ParseError[]): UseStateInfo | null {
    const call = decl.initializer as ts.CallExpression;
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

function validateExpression(node: ts.Node, sf: ts.SourceFile, customComponents: Map<string, string>, errors: ParseError[]): void {
    if (ts.isJsxElement(node)) {
        validateJsxElement(node, sf, customComponents, errors);
    } else if (ts.isJsxSelfClosingElement(node)) {
        validateJsxTag(node.tagName, node, sf, customComponents, errors);
        validateJsxAttributes(node.attributes, node.tagName, sf, errors);
    } else if (ts.isJsxFragment(node)) {
        for (const child of node.children) validateExpression(child, sf, customComponents, errors);
    } else if (ts.isParenthesizedExpression(node)) {
        validateExpression(node.expression, sf, customComponents, errors);
    } else if (ts.isConditionalExpression(node)) {
        validateExpression(node.whenTrue, sf, customComponents, errors);
        validateExpression(node.whenFalse, sf, customComponents, errors);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        validateExpression(node.right, sf, customComponents, errors);
    } else if (ts.isJsxExpression(node) && node.expression) {
        validateExpression(node.expression, sf, customComponents, errors);
    } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'map') {
        const callback = node.arguments[0];
        if (callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) {
            if (ts.isBlock(callback.body)) {
                const ret = callback.body.statements.find(ts.isReturnStatement);
                if (ret?.expression) validateExpression(ret.expression, sf, customComponents, errors);
            } else if (callback.body) {
                validateExpression(callback.body as ts.Expression, sf, customComponents, errors);
            }
        }
    }
}

function validateJsxElement(node: ts.JsxElement, sf: ts.SourceFile, customComponents: Map<string, string>, errors: ParseError[]): void {
    validateJsxTag(node.openingElement.tagName, node, sf, customComponents, errors);
    validateJsxAttributes(node.openingElement.attributes, node.openingElement.tagName, sf, errors);
    for (const child of node.children) validateExpression(child, sf, customComponents, errors);
}

function validateJsxTag(tagName: ts.JsxTagNameExpression, node: ts.Node, sf: ts.SourceFile, customComponents: Map<string, string>, errors: ParseError[]): void {
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;
    if (!isHostComponent(name) && !customComponents.has(name)) {
        errors.push(err(sf, node, `Unknown component: <${name}>`));
    }
}

function validateJsxAttributes(attrs: ts.JsxAttributes, tagName: ts.JsxTagNameExpression, sf: ts.SourceFile, errors: ParseError[]): void {
    if (!ts.isIdentifier(tagName)) return;
    const name = tagName.text;
    const def = HOST_COMPONENTS[name];
    if (!def) return;
    const presentProps = new Set<string>();
    for (const attr of attrs.properties) {
        if (ts.isJsxAttribute(attr) && attr.name && ts.isIdentifier(attr.name)) presentProps.add(attr.name.text);
    }
    for (const [propName, propDef] of Object.entries(def.props)) {
        if (propDef.required && !presentProps.has(propName)) {
            errors.push(err(sf, attrs, `<${name}> requires prop '${propName}'`));
        }
    }
}
