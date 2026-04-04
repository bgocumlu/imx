export const HOST_COMPONENTS = {
    Window: {
        props: {
            title: { type: 'string', required: true },
            open: { type: 'boolean', required: false },
            onClose: { type: 'callback', required: false },
            noTitleBar: { type: 'boolean', required: false },
            noResize: { type: 'boolean', required: false },
            noMove: { type: 'boolean', required: false },
            noCollapse: { type: 'boolean', required: false },
            noDocking: { type: 'boolean', required: false },
            noScrollbar: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    View: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    Row: {
        props: { gap: { type: 'number', required: false }, style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    Column: {
        props: { gap: { type: 'number', required: false }, style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    Text: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: false,
    },
    Button: {
        props: {
            title: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
            disabled: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    TextInput: {
        props: {
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: true },
            label: { type: 'string', required: false },
            placeholder: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Checkbox: {
        props: {
            value: { type: 'boolean', required: true },
            onChange: { type: 'callback', required: true },
            label: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Separator: {
        props: {},
        hasChildren: false, isContainer: false,
    },
    Popup: {
        props: { id: { type: 'string', required: true }, style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    DockSpace: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    MenuBar: {
        props: {},
        hasChildren: true, isContainer: true,
    },
    Menu: {
        props: { label: { type: 'string', required: true } },
        hasChildren: true, isContainer: true,
    },
    MenuItem: {
        props: {
            label: { type: 'string', required: true },
            onPress: { type: 'callback', required: false },
            shortcut: { type: 'string', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Table: {
        props: { columns: { type: 'string', required: true }, style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    TableRow: {
        props: {},
        hasChildren: true, isContainer: true,
    },
    TabBar: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    TabItem: {
        props: { label: { type: 'string', required: true } },
        hasChildren: true, isContainer: true,
    },
    TreeNode: {
        props: { label: { type: 'string', required: true } },
        hasChildren: true, isContainer: true,
    },
    CollapsingHeader: {
        props: { label: { type: 'string', required: true } },
        hasChildren: true, isContainer: true,
    },
    SliderFloat: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    SliderInt: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragFloat: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DragInt: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            speed: { type: 'number', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Combo: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            items: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputInt: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputFloat: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    ColorEdit: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    ListBox: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: true },
            items: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    ProgressBar: {
        props: {
            value: { type: 'number', required: true },
            overlay: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Tooltip: {
        props: {
            text: { type: 'string', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    BulletText: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: false,
    },
    LabelText: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    Selectable: {
        props: {
            label: { type: 'string', required: true },
            selected: { type: 'boolean', required: false },
            onSelect: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Radio: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            index: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    InputTextMultiline: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    ColorPicker: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    PlotLines: {
        props: {
            label: { type: 'string', required: true },
            values: { type: 'string', required: true },
            overlay: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    PlotHistogram: {
        props: {
            label: { type: 'string', required: true },
            values: { type: 'string', required: true },
            overlay: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Modal: {
        props: {
            title: { type: 'string', required: true },
            open: { type: 'boolean', required: false },
            onClose: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    Image: {
        props: {
            src: { type: 'string', required: true },
            embed: { type: 'boolean', required: false },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DockLayout: {
        props: {},
        hasChildren: true, isContainer: true,
    },
    DockSplit: {
        props: { direction: { type: 'string', required: true }, size: { type: 'number', required: true } },
        hasChildren: true, isContainer: true,
    },
    DockPanel: {
        props: {},
        hasChildren: true, isContainer: true,
    },
    Theme: {
        props: {
            preset: { type: 'string', required: true },
            accentColor: { type: 'style', required: false },
            windowBg: { type: 'style', required: false },
            textColor: { type: 'style', required: false },
            rounding: { type: 'number', required: false },
            borderSize: { type: 'number', required: false },
            spacing: { type: 'number', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    Group: {
        props: {
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    ID: {
        props: {
            scope: { type: 'string', required: true },
        },
        hasChildren: true, isContainer: true,
    },
    StyleColor: {
        props: {
            text: { type: 'style', required: false },
            textDisabled: { type: 'style', required: false },
            windowBg: { type: 'style', required: false },
            frameBg: { type: 'style', required: false },
            frameBgHovered: { type: 'style', required: false },
            frameBgActive: { type: 'style', required: false },
            titleBg: { type: 'style', required: false },
            titleBgActive: { type: 'style', required: false },
            button: { type: 'style', required: false },
            buttonHovered: { type: 'style', required: false },
            buttonActive: { type: 'style', required: false },
            header: { type: 'style', required: false },
            headerHovered: { type: 'style', required: false },
            headerActive: { type: 'style', required: false },
            separator: { type: 'style', required: false },
            checkMark: { type: 'style', required: false },
            sliderGrab: { type: 'style', required: false },
            border: { type: 'style', required: false },
            popupBg: { type: 'style', required: false },
            tab: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
};
export function isHostComponent(name) {
    return name in HOST_COMPONENTS;
}
