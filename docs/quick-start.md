# IMX Quick Start

## 1. Create and build

```bash
npx imxc init myapp
cd myapp
cmake -B build
cmake --build build --config Release
```

This creates a minimal app with `src/App.tsx`, `src/imx.d.ts`, `main.cpp`, `tsconfig.json`, and `CMakeLists.txt`.

You can inspect the CLI the same way you would a traditional command-line tool:

```bash
npx imxc --help
npx imxc init --help
npx imxc --version
```

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

Watch mode always prints the chosen root component. It prefers `src/App.tsx`, then `App.tsx`, then the first `.tsx` file alphabetically. Manual compilation still uses the first positional `.tsx` input as the root.

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

The first positional `.tsx` file is the root component for explicit compile commands.

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

Declared `number` props compile to C++ `float` consistently, including inline props, top-level local `interface` declarations, and `imx.d.ts` interfaces.

## Custom Native Widgets

You can register existing C++ ImGui widgets and use them from TSX. Declare them in `src/imx.d.ts` so TypeScript checks props and the compiler treats them as known widgets. See the [Custom Native Widgets](api-reference.md#custom-native-widgets) section in the API reference.

## Next steps

See [api-reference.md](api-reference.md) for the full component reference, style properties, and project setup details.
