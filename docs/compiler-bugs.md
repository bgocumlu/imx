# Compiler Bugs

Patterns that should work but produce invalid C++. Fix the compiler, don't work around them.

## 1. Numeric text interpolation in child components

```tsx
<Text>Count: {props.data.count}</Text>
```
Generates `(*props.data).count.c_str()` — calls `.c_str()` on int/float. Root components correctly use `%g` format. Child component emitter path is wrong.

## 2. Individual scalar props lose C++ type info

```tsx
<MyComponent speed={props.speed} />
```
`speed` is `float` in C++ but generates `int* speed` in child Props struct. Compiler sees TypeScript `number` and defaults to `int` instead of resolving the actual type from the parent struct.

## 3. MultiSelect bound prop detection without directBind

```tsx
<MultiSelect onSelectionChange={() => props.data.apply_selection(0)}>
  <Selectable selected={props.data.ms_selected[0]} selectionIndex={0} />
</MultiSelect>
```
`data` generates as value copy instead of pointer. `detectBoundProps` only checks directBind widgets (SliderFloat without onChange). Should detect struct field access in callbacks and expressions too.

## 4. Left-click context menus on interactive items

```tsx
<Button title="Click me" onPress={() => {}} />
<ContextMenu mouseButton="left">
  <MenuItem label="Action" onPress={() => {}} />
</ContextMenu>
```
Left-click never opens the menu. Right-click context menus work. Renderer passes correct flag (`0` = left) but interactive items consume the click first.

## 5. Non-root component imports

```tsx
// Phase12.tsx imports Phase12Nested.tsx
import { Phase12Nested } from './Phase12Nested';
```
Generated `Phase12.gen.cpp` doesn't include `Phase12Nested.gen.h`. Import `#include` generation only runs for the root component.

## 6. useState variable name collisions

```tsx
const [val, setVal] = useState(50.0);
<SliderFloat label="X" value={val} onChange={setVal} min={0} max={100} />
```
Compiler generates `float val = val.get()` — local shadows the state variable. Compiler should namespace generated locals to avoid collisions.
