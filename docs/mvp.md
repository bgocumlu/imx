# IMX MVP

## 1. MVP Goal

The MVP exists to prove the core proposition:

`React-Native-like source can compile into a native Dear ImGui app without a JS runtime.`

The MVP should not attempt to cover all of Dear ImGui. It should establish the programming model, the compiler path, and a small but real native runtime.

## 2. Success Criteria

The MVP is successful if it can build a small editor-like application with:

- one main window
- nested layout containers
- text rendering
- buttons
- text input
- checkbox input
- one list rendered from an array
- one conditional section
- one popup or modal
- basic local state via `useState`

## 3. Authoring Surface

The MVP source language should support:

- function components
- TSX-like syntax in `.igx` source files
- props
- children
- fragments
- conditional rendering
- array mapping
- `useState`

Not required in the MVP:

- `useEffect`
- context
- refs
- memoization
- class components

## 4. Core Components

The MVP component set should be:

- `Window`
- `View`
- `Row`
- `Column`
- `Text`
- `Button`
- `TextInput`
- `Checkbox`
- `Separator`
- `Popup`

Optional if implementation remains clean:

- `ScrollView`
- `MenuBar`

## 5. Required Props

### `Window`

- `title: string`
- `children`

Optional:

- `open?: boolean`
- `style?: Style`

### `View`

- `children`

Optional:

- `style?: Style`

### `Row`

- `children`

Optional:

- `gap?: number`
- `style?: Style`

### `Column`

- `children`

Optional:

- `gap?: number`
- `style?: Style`

### `Text`

- `children`

Optional:

- `style?: TextStyle`

### `Button`

- `title: string`
- `onPress: () => void`

Optional:

- `disabled?: boolean`

### `TextInput`

- `value: string`
- `onChange: (next: string) => void`

Optional:

- `label?: string`
- `placeholder?: string`

### `Checkbox`

- `value: boolean`
- `onChange: (next: boolean) => void`

Optional:

- `label?: string`

### `Popup`

Optional:

- `open?: boolean`
- `children`

The exact popup API may change, but the MVP needs one way to express transient overlays.

## 6. Style Scope

The MVP style system should be intentionally small.

Allowed style properties:

- `padding`
- `paddingHorizontal`
- `paddingVertical`
- `margin`
- `gap`
- `width`
- `height`
- `minWidth`
- `minHeight`
- `backgroundColor`
- `textColor`
- `fontSize`

The MVP should not attempt:

- CSS cascade
- selectors
- flexbox parity
- percentage-based responsive layout
- absolute positioning system

## 7. State Scope

The MVP state model should only support:

- `useState(initialValue)`

It should compile into:

- native component instance state slots
- direct callback updates
- full root invalidation on update

## 8. Compiler Scope

The MVP compiler should:

- parse `.igx` TSX-like source
- validate supported components and props
- lower to generated C++
- emit a root render function callable from the existing native loop

Out of scope for MVP:

- source maps
- hot reload
- native IR interpreter
- advanced optimization passes

The MVP editor story should be:

- `.igx` files associated with TSX or TypeScript React syntax highlighting
- no custom editor extension required for initial development

## 9. Runtime Scope

The MVP native runtime should include:

- component instance tracking
- `useState` storage
- callback binding
- a simple render context

It should avoid:

- complex scheduler design
- async effect system
- retained native widget model

The MVP should be implemented as library-style modules:

- `imx_runtime`
- `imx_renderer_imgui`
- a minimal `imx_codegen`

## 10. Example MVP App

The MVP should be able to express something like:

```tsx
function App() {
  const [name, setName] = useState("Berkay");
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(0);

  return (
    <Window title="Hello">
      <Column gap={8} style={{ padding: 12 }}>
        <Text>Hello {name}</Text>
        <TextInput value={name} onChange={setName} />
        <Checkbox label="Enabled" value={enabled} onChange={setEnabled} />
        <Row gap={8}>
          <Button title="Increment" onPress={() => setCount(count + 1)} />
          <Text>Count: {count}</Text>
        </Row>
        {enabled && <Text>Status: active</Text>}
      </Column>
    </Window>
  );
}
```

## 11. Technical Fit with Current Repo

The MVP should integrate with the existing Dear ImGui + GLFW + OpenGL frame loop in [main.cpp](C:\Users\Berkay\Downloads\imx\main.cpp).

The replacement target is the hardcoded sample UI, not the low-level backend initialization.

Recommended MVP repo shape:

- `include/imx/`
- `runtime/`
- `renderer/`
- `compiler/`
- `examples/hello/`

## 12. Explicitly Deferred

These are intentionally deferred until after the MVP proves the model:

- `DockSpace`
- `MenuBar`
- `Table`
- `TreeNode`
- `TabBar`
- `ColorEdit`
- `SliderFloat`
- drag and drop
- advanced style scoping
- animations
- multi-window navigation abstractions
- hot reload
- generated project templates
