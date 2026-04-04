export type IRType = 'int' | 'float' | 'bool' | 'string';

export interface IRExpr { code: string; type: IRType; }

export interface IRComponent {
    name: string;
    stateSlots: IRStateSlot[];
    bufferCount: number;
    params: IRPropParam[];
    body: IRNode[];
}

export interface IRStateSlot {
    name: string;
    setter: string;
    type: IRType;
    initialValue: string;
    index: number;
}

export interface IRPropParam {
    name: string;
    type: IRType | 'callback';
}

export type IRNode =
    | IRBeginContainer | IREndContainer | IRText | IRButton
    | IRTextInput | IRCheckbox | IRSeparator
    | IRBeginPopup | IREndPopup | IROpenPopup
    | IRConditional | IRListMap | IRCustomComponent;

export interface IRBeginContainer {
    kind: 'begin_container';
    tag: 'Window' | 'View' | 'Row' | 'Column';
    props: Record<string, string>;
    style?: string;
}
export interface IREndContainer { kind: 'end_container'; tag: 'Window' | 'View' | 'Row' | 'Column'; }
export interface IRText { kind: 'text'; format: string; args: string[]; }
export interface IRButton { kind: 'button'; title: string; action: string[]; style?: string; }
export interface IRTextInput { kind: 'text_input'; label: string; bufferIndex: number; stateVar: string; style?: string; }
export interface IRCheckbox { kind: 'checkbox'; label: string; stateVar: string; style?: string; }
export interface IRSeparator { kind: 'separator'; }
export interface IRBeginPopup { kind: 'begin_popup'; id: string; style?: string; }
export interface IREndPopup { kind: 'end_popup'; }
export interface IROpenPopup { kind: 'open_popup'; id: string; }
export interface IRConditional { kind: 'conditional'; condition: string; body: IRNode[]; elseBody?: IRNode[]; }
export interface IRListMap { kind: 'list_map'; array: string; itemVar: string; key: string; componentName: string; stateCount: number; bufferCount: number; body: IRNode[]; }
export interface IRCustomComponent { kind: 'custom_component'; name: string; props: Record<string, string>; key?: string; stateCount: number; bufferCount: number; }
