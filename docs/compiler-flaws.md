# Compiler Flaws

Open compiler/codegen regressions that still need to be fixed.

## 1. String concatenation inside `<Text>{...}</Text>` emits invalid double `.c_str()`

- Status: open
- Affected version: observed on `v0.6.6`
- Impact: generated C++ does not compile on MSVC

### Repro

```tsx
<Text>{"Latest turn " + props.checkpoint.latestTurnCount}</Text>
<Text>{"PR #" + props.git.currentPullRequestNumber}</Text>
```

Observed in:

- `C:\Users\Berkay\Downloads\t2code\src\App.tsx:196`
- `C:\Users\Berkay\Downloads\t2code\src\App.tsx:269`

### Actual generated output

```cpp
imx::renderer::text("%s", (std::string("Latest turn ") + std::to_string(props.checkpoint.latestTurnCount)).c_str().c_str());
imx::renderer::text("%s", (std::string("PR #") + std::to_string(props.git.currentPullRequestNumber)).c_str().c_str());
```

Observed in:

- `C:\Users\Berkay\Downloads\t2code\build\generated\App.gen.cpp:649`
- `C:\Users\Berkay\Downloads\t2code\build\generated\App.gen.cpp:915`

### Expected generated output

Either of these shapes is valid:

```cpp
imx::renderer::text("%s", (std::string("Latest turn ") + std::to_string(props.checkpoint.latestTurnCount)).c_str());
imx::renderer::text("%s", (std::string("PR #") + std::to_string(props.git.currentPullRequestNumber)).c_str());
```

or emit formatted text without constructing a temporary string:

```cpp
imx::renderer::text("Latest turn %d", props.checkpoint.latestTurnCount);
imx::renderer::text("PR #%d", props.git.currentPullRequestNumber);
```

### Why this is a compiler flaw

The docs explicitly describe text interpolation as supported:

- `docs/api-reference.md`: `<Text>Count: {n}</Text>` uses printf-style formatting
- `docs/llm-prompt-reference.md`: `<Text>Count: {props.count}</Text>` uses printf-style formatting internally

So this is not a user-authoring error. The code generator is appending `.c_str()` twice when it lowers a string-concatenation expression inside `Text` children.

### Notes

- This is separate from the new `.map()` diagnostics that require `<ID scope={i}>`; those warnings are intentional and valid.
- Do not work around this in downstream apps if the goal is compiler correctness. Fix the codegen path.
