# IMX Quick Start

## 1. Create a minimal app

Create `App.tsx`:

```tsx
export default function App() {
  return (
    <Window title="Hello">
      <Text>Hello, IMX!</Text>
    </Window>
  );
}
```

Copy `imx.d.ts` and `tsconfig.json` from `examples/hello/` into the same directory.

## 2. Build and run

```bash
# Build the compiler (first time only)
cd compiler && npm install && npm run build && cd ..

# Compile .tsx to C++
node compiler/dist/index.js App.tsx -o build/generated

# Configure and build with CMake
cmake -B build
cmake --build build

# Run
./build/hello_app
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

## Next steps

See [api-reference.md](api-reference.md) for the full component reference, style properties, and project setup details.
