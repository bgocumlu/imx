# IMX Quick Start

## 1. Create and build

```bash
npx imxc init myapp
cd myapp
cmake -B build
cmake --build build --config Release
```

This creates a minimal app with `App.tsx`, `main.cpp`, `tsconfig.json`, `imx.d.ts`, and `CMakeLists.txt`.

To start with additional features, pick a template:

```bash
npx imxc init myapp --template=persistence
npx imxc init myapp --template=async,networking
npx imxc templates   # list all available templates
```

## 2. File watcher

Recompile `.tsx` on save (optionally rebuild the C++ project):

```bash
npx imxc watch src -o build/generated
npx imxc watch src -o build/generated --build "cmake --build build"
```

## 3. Add a custom component

Create `Counter.tsx`:

```tsx
export function Counter(props: { label: string }) {
  const [count, setCount] = useState(0);

  return (
    <Row gap={8}>
      <Text>{props.label}: {count}</Text>
      <Button title="+" onPress={() => setCount(count + 1)} />
      <Button title="-" onPress={() => setCount(count - 1)} />
    </Row>
  );
}
```

Import and use it in `App.tsx`:

```tsx
import { Counter } from './Counter';

export default function App() {
  return (
    <Window title="Hello">
      <Column gap={8}>
        <Text>Hello, IMX!</Text>
        <Counter label="Apples" />
        <Counter label="Oranges" />
      </Column>
    </Window>
  );
}
```

Compile both files together:

```bash
node compiler/dist/index.js App.tsx Counter.tsx -o build/generated
```

## 4. Using state

Declare state at the top of your component, like React's `useState`:

```tsx
export default function App() {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  return (
    <Window title="Form">
      <Column gap={4}>
        <TextInput value={name} onChange={setName} label="Name" />
        <Checkbox value={agreed} onChange={setAgreed} label="I agree" />
        {agreed && <Text>Welcome, {name}!</Text>}
      </Column>
    </Window>
  );
}
```

Supported types: `number`, `string`, `boolean`, `number[]` (for ColorEdit RGBA).

## Custom Native Widgets

You can register existing C++ ImGui widgets and use them from TSX. See the [Custom Native Widgets](api-reference.md#custom-native-widgets) section in the API reference.

## Next steps

See [api-reference.md](api-reference.md) for the full component reference, style properties, and project setup details.
