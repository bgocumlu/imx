const ITEM_INTERACTION_PROPS = {
    onHover: { type: 'callback', required: false },
    onActive: { type: 'callback', required: false },
    onFocused: { type: 'callback', required: false },
    onClicked: { type: 'callback', required: false },
    onDoubleClicked: { type: 'callback', required: false },
    tooltip: { type: 'string', required: false },
    autoFocus: { type: 'boolean', required: false },
    scrollToHere: { type: 'boolean', required: false },
    cursor: { type: 'string', required: false },
};
function withItemInteractionProps(props) {
    return { ...props, ...ITEM_INTERACTION_PROPS };
}
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
            noBackground: { type: 'boolean', required: false },
            alwaysAutoResize: { type: 'boolean', required: false },
            noNavFocus: { type: 'boolean', required: false },
            noNav: { type: 'boolean', required: false },
            noDecoration: { type: 'boolean', required: false },
            noInputs: { type: 'boolean', required: false },
            noScrollWithMouse: { type: 'boolean', required: false },
            horizontalScrollbar: { type: 'boolean', required: false },
            alwaysVerticalScrollbar: { type: 'boolean', required: false },
            alwaysHorizontalScrollbar: { type: 'boolean', required: false },
            x: { type: 'number', required: false },
            y: { type: 'number', required: false },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            forcePosition: { type: 'boolean', required: false },
            forceSize: { type: 'boolean', required: false },
            minWidth: { type: 'number', required: false },
            minHeight: { type: 'number', required: false },
            maxWidth: { type: 'number', required: false },
            maxHeight: { type: 'number', required: false },
            bgAlpha: { type: 'number', required: false },
            noViewport: { type: 'boolean', required: false },
            viewportAlwaysOnTop: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    View: {
        props: { style: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    Indent: {
        props: { width: { type: 'number', required: false } },
        hasChildren: true, isContainer: true,
    },
    TextWrap: {
        props: { width: { type: 'number', required: true } },
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
        props: {
            color: { type: 'number', required: false },
            disabled: { type: 'boolean', required: false },
            wrapped: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: false,
    },
    Button: {
        props: withItemInteractionProps({
            title: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
            disabled: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    TextInput: {
        props: withItemInteractionProps({
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            label: { type: 'string', required: false },
            placeholder: { type: 'string', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    Checkbox: {
        props: withItemInteractionProps({
            value: { type: 'boolean', required: true },
            onChange: { type: 'callback', required: false },
            label: { type: 'string', required: false },
            style: { type: 'style', required: false },
        }),
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
    MainMenuBar: {
        props: {},
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
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            onPress: { type: 'callback', required: false },
            shortcut: { type: 'string', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    Table: {
        props: {
            columns: { type: 'string', required: true },
            sortable: { type: 'boolean', required: false },
            onSort: { type: 'callback', required: false },
            hideable: { type: 'boolean', required: false },
            multiSortable: { type: 'boolean', required: false },
            noClip: { type: 'boolean', required: false },
            padOuterX: { type: 'boolean', required: false },
            scrollX: { type: 'boolean', required: false },
            scrollY: { type: 'boolean', required: false },
            noBorders: { type: 'boolean', required: false },
            noRowBg: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    TableRow: {
        props: { bgColor: { type: 'style', required: false } },
        hasChildren: true, isContainer: true,
    },
    TableCell: {
        props: {
            columnIndex: { type: 'number', required: false },
            bgColor: { type: 'style', required: false },
        },
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
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            defaultOpen: { type: 'boolean', required: false },
            forceOpen: { type: 'boolean', required: false },
            openOnArrow: { type: 'boolean', required: false },
            openOnDoubleClick: { type: 'boolean', required: false },
            leaf: { type: 'boolean', required: false },
            bullet: { type: 'boolean', required: false },
            noTreePushOnOpen: { type: 'boolean', required: false },
        }),
        hasChildren: true, isContainer: true,
    },
    CollapsingHeader: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            defaultOpen: { type: 'boolean', required: false },
            forceOpen: { type: 'boolean', required: false },
            closable: { type: 'boolean', required: false },
            onClose: { type: 'callback', required: false },
        }),
        hasChildren: true, isContainer: true,
    },
    SliderFloat: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderInt: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragFloat: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragInt: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    Combo: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: false },
            onChange: { type: 'callback', required: false },
            items: { type: 'string', required: false },
            preview: { type: 'string', required: false },
            noArrowButton: { type: 'boolean', required: false },
            noPreview: { type: 'boolean', required: false },
            heightSmall: { type: 'boolean', required: false },
            heightLarge: { type: 'boolean', required: false },
            heightRegular: { type: 'boolean', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: true, isContainer: true,
    },
    InputInt: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputFloat: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    ColorEdit: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    ListBox: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: false },
            onChange: { type: 'callback', required: false },
            items: { type: 'string', required: false },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: true, isContainer: true,
    },
    ProgressBar: {
        props: {
            value: { type: 'number', required: true },
            overlay: { type: 'string', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Spacing: {
        props: {},
        hasChildren: false, isContainer: false,
    },
    Dummy: {
        props: {
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    SameLine: {
        props: {
            offset: { type: 'number', required: false },
            spacing: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    NewLine: {
        props: {},
        hasChildren: false, isContainer: false,
    },
    Cursor: {
        props: {
            x: { type: 'number', required: true },
            y: { type: 'number', required: true },
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
    Bullet: {
        props: { style: { type: 'style', required: false } },
        hasChildren: false, isContainer: false,
    },
    LabelText: {
        props: {
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    Selectable: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            selected: { type: 'boolean', required: false },
            onSelect: { type: 'callback', required: false },
            selectionIndex: { type: 'number', required: false },
            spanAllColumns: { type: 'boolean', required: false },
            allowDoubleClick: { type: 'boolean', required: false },
            dontClosePopups: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    Radio: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            index: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputTextMultiline: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    ColorEdit3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    ColorPicker: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    ColorPicker3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
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
            noTitleBar: { type: 'boolean', required: false },
            noResize: { type: 'boolean', required: false },
            noMove: { type: 'boolean', required: false },
            noScrollbar: { type: 'boolean', required: false },
            noCollapse: { type: 'boolean', required: false },
            alwaysAutoResize: { type: 'boolean', required: false },
            noBackground: { type: 'boolean', required: false },
            horizontalScrollbar: { type: 'boolean', required: false },
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
            backgroundColor: { type: 'style', required: false },
            textColor: { type: 'style', required: false },
            borderColor: { type: 'style', required: false },
            surfaceColor: { type: 'style', required: false },
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
    StyleVar: {
        props: {
            alpha: { type: 'number', required: false },
            windowPadding: { type: 'style', required: false },
            windowRounding: { type: 'number', required: false },
            framePadding: { type: 'style', required: false },
            frameRounding: { type: 'number', required: false },
            frameBorderSize: { type: 'number', required: false },
            itemSpacing: { type: 'style', required: false },
            itemInnerSpacing: { type: 'style', required: false },
            indentSpacing: { type: 'number', required: false },
            cellPadding: { type: 'style', required: false },
            tabRounding: { type: 'number', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    DragDropSource: {
        props: {
            type: { type: 'string', required: true },
            payload: { type: 'number', required: true },
        },
        hasChildren: true, isContainer: true,
    },
    DragDropTarget: {
        props: {
            type: { type: 'string', required: true },
            onDrop: { type: 'callback', required: true },
        },
        hasChildren: true, isContainer: true,
    },
    Canvas: {
        props: {
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    DrawLine: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawRect: {
        props: {
            min: { type: 'style', required: true },
            max: { type: 'style', required: true },
            color: { type: 'style', required: true },
            filled: { type: 'boolean', required: false },
            thickness: { type: 'number', required: false },
            rounding: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawCircle: {
        props: {
            center: { type: 'style', required: true },
            radius: { type: 'number', required: true },
            color: { type: 'style', required: true },
            filled: { type: 'boolean', required: false },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawText: {
        props: {
            pos: { type: 'style', required: true },
            text: { type: 'string', required: true },
            color: { type: 'style', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    DrawBezierCubic: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            p3: { type: 'style', required: true },
            p4: { type: 'style', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
            segments: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawBezierQuadratic: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            p3: { type: 'style', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
            segments: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawPolyline: {
        props: {
            points: { type: 'string', required: true },
            color: { type: 'style', required: true },
            thickness: { type: 'number', required: false },
            closed: { type: 'boolean', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawConvexPolyFilled: {
        props: {
            points: { type: 'string', required: true },
            color: { type: 'style', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    DrawNgon: {
        props: {
            center: { type: 'style', required: true },
            radius: { type: 'number', required: true },
            color: { type: 'style', required: true },
            numSegments: { type: 'number', required: true },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    DrawNgonFilled: {
        props: {
            center: { type: 'style', required: true },
            radius: { type: 'number', required: true },
            color: { type: 'style', required: true },
            numSegments: { type: 'number', required: true },
        },
        hasChildren: false, isContainer: false,
    },
    DrawTriangle: {
        props: {
            p1: { type: 'style', required: true },
            p2: { type: 'style', required: true },
            p3: { type: 'style', required: true },
            color: { type: 'style', required: true },
            filled: { type: 'boolean', required: false },
            thickness: { type: 'number', required: false },
        },
        hasChildren: false, isContainer: false,
    },
    Disabled: {
        props: {
            disabled: { type: 'boolean', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    Child: {
        props: {
            id: { type: 'string', required: true },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            border: { type: 'boolean', required: false },
            style: { type: 'style', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    Font: {
        props: {
            name: { type: 'string', required: true },
            src: { type: 'string', required: false },
            size: { type: 'number', required: false },
            embed: { type: 'boolean', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    InputFloat2: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputFloat3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputFloat4: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputInt2: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputInt3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    InputInt4: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragFloat2: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragFloat3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragFloat4: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragInt2: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragInt3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    DragInt4: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            speed: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SmallButton: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
        }),
        hasChildren: false, isContainer: false,
    },
    ArrowButton: {
        props: withItemInteractionProps({
            id: { type: 'string', required: true },
            direction: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
        }),
        hasChildren: false, isContainer: false,
    },
    InvisibleButton: {
        props: withItemInteractionProps({
            id: { type: 'string', required: true },
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            onPress: { type: 'callback', required: true },
        }),
        hasChildren: false, isContainer: false,
    },
    ImageButton: {
        props: withItemInteractionProps({
            id: { type: 'string', required: true },
            src: { type: 'string', required: true },
            width: { type: 'number', required: false },
            height: { type: 'number', required: false },
            onPress: { type: 'callback', required: true },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderFloat2: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderFloat3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderFloat4: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderInt2: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderInt3: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderInt4: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'string', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    VSliderFloat: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    VSliderInt: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            width: { type: 'number', required: true },
            height: { type: 'number', required: true },
            min: { type: 'number', required: true },
            max: { type: 'number', required: true },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    SliderAngle: {
        props: withItemInteractionProps({
            label: { type: 'string', required: true },
            value: { type: 'number', required: true },
            onChange: { type: 'callback', required: false },
            min: { type: 'number', required: false },
            max: { type: 'number', required: false },
            width: { type: 'number', required: false },
            style: { type: 'style', required: false },
        }),
        hasChildren: false, isContainer: false,
    },
    ContextMenu: {
        props: {
            id: { type: 'string', required: false },
            target: { type: 'string', required: false },
            mouseButton: { type: 'string', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    MultiSelect: {
        props: {
            singleSelect: { type: 'boolean', required: false },
            noSelectAll: { type: 'boolean', required: false },
            noRangeSelect: { type: 'boolean', required: false },
            noAutoSelect: { type: 'boolean', required: false },
            noAutoClear: { type: 'boolean', required: false },
            boxSelect: { type: 'boolean', required: false },
            boxSelect2d: { type: 'boolean', required: false },
            boxSelectNoScroll: { type: 'boolean', required: false },
            clearOnClickVoid: { type: 'boolean', required: false },
            selectionSize: { type: 'number', required: false },
            itemsCount: { type: 'number', required: false },
            onSelectionChange: { type: 'callback', required: false },
        },
        hasChildren: true, isContainer: true,
    },
    Shortcut: {
        props: {
            keys: { type: 'string', required: true },
            onPress: { type: 'callback', required: true },
        },
        hasChildren: false, isContainer: false,
    },
};
export function isHostComponent(name) {
    return name in HOST_COMPONENTS;
}
