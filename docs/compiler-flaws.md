# Compiler Flaws

Open compiler/codegen regressions that still need to be fixed.

## Dynamic `disabled` expressions are dropped on `Button`

- Status: open
- Affected versions: observed in `v0.6.7`
- Repro app: `C:\Users\Berkay\Downloads\t2code`

### Repro

```tsx
<Button title="Send" onPress={props.onSend} disabled={!props.canSend} />
```

### Observed lowering/codegen

The generated C++ omits the disabled argument entirely:

```cpp
bool _button_pressed = imx::renderer::button("Send");
if (_button_pressed) {
    props.onSend();
}
```

This leaves the button interactive even when `disabled={...}` evaluates to `true`.

### Expected codegen

The generated call should preserve the dynamic boolean expression and pass the disabled flag through to the renderer, e.g.:

```cpp
bool _button_pressed = imx::renderer::button("Send", {}, !props.canSend);
```

### Notes

- The public API documents `Button.disabled` in `docs/api-reference.md`.
- The current lowering path only recognizes `disabled` when the lowered attribute string is literally `"true"`, so expression-based booleans such as `disabled={!props.canSend}` are silently treated as unset.
- `t2code` relies on dynamic disabled state across approval, send, git, checkpoint, and terminal actions, so this is a real downstream correctness issue rather than a cosmetic mismatch.
