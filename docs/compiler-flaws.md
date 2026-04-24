# Compiler Flaws

Open compiler/codegen regressions that still need to be fixed.

## TSX component early `return null` guards are ignored

- Status: open
- Found from: `t2code` parity work on IMX `v0.6.12`
- Downstream impact: blocks strict `t3code` parity for conditional shell controls and badges.

Minimal repro:

```tsx
export function ConditionalAction(props: { state: AppState }) {
  const app = props.state;

  if (!app.enabled) {
    return null;
  }

  return <Button title="Run" onPress={app.onRun} />;
}
```

Expected generated behavior:

```cpp
if (!(*props.state).enabled) {
    return;
}
```

Actual generated behavior:

```cpp
bool _button_pressed_0 = imx::renderer::button("Run");
if (_button_pressed_0) {
    (*props.state).onRun();
}
```

Confirmed downstream examples in `t2code`:

- `src/ui/SidebarProjectPathEntry.tsx` has `if (!app.showAddProjectPathEntry) return null;`, but `build/generated/SidebarProjectPathEntry.gen.cpp` always renders the text input and Add button.
- `src/ui/ComposerStopAction.tsx` has `if (!app.canInterrupt) return null;`, but `build/generated/ComposerStopAction.gen.cpp` always renders Stop.
- `src/ui/ChatHeaderProjectBadge.tsx` has `if (!app.hasSelectedProject) return null;`, but `build/generated/ChatHeaderProjectBadge.gen.cpp` always renders the project title.
- `src/ui/SidebarThreadUpdatedAt.tsx` has `if (thread.updatedAt.length === 0) return null;`, but `build/generated/SidebarThreadUpdatedAt.gen.cpp` always renders disabled text.

This is not a C++ compile failure; it is a semantic codegen flaw. It makes source-level conditional components unsafe because the generated C++ drops the guard and emits the JSX body unconditionally.
