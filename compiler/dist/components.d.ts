export type PropType = 'string' | 'number' | 'boolean' | 'callback' | 'style';
export interface PropDef {
    type: PropType;
    required: boolean;
}
export interface HostComponentDef {
    props: Record<string, PropDef>;
    hasChildren: boolean;
    isContainer: boolean;
}
export declare const HOST_COMPONENTS: Record<string, HostComponentDef>;
export declare function isHostComponent(name: string): boolean;
