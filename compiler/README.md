# imxc

Compiler for IMX. Compiles React-like `.tsx` to native Dear ImGui C++ apps.

## Usage

```bash
npx imxc --help
npx imxc --version

npx imxc init myapp
cd myapp
cmake -B build
cmake --build build --config Release

npx imxc add

imxc App.tsx -o build/generated

imxc watch src -o build/generated

npx imxc templates
```

## Common Commands

```bash
# Help
npx imxc --help
npx imxc init --help
npx imxc watch --help

# Scaffold a project
npx imxc init myapp --template=minimal
npx imxc init myapp --template=async,persistence

# Add IMX to an existing project
npx imxc add

# Compile TSX manually
imxc src/App.tsx src/Counter.tsx -o build/generated

# Watch and optionally rebuild
imxc watch src -o build/generated
imxc watch src -o build/generated --build "cmake --build build"

# List built-in templates
npx imxc templates
```

## Notes

- `imxc watch` prefers `src/App.tsx` as the app entrypoint when present.
- TypeScript `number` props generate C++ `float`.
- Declare custom native widgets in `src/imx.d.ts` for type checking.

## Features

~98 components, 5-prop theme system, custom C++ widgets, canvas drawing, drag-drop.

Requires: Node.js, CMake 3.25+, C++20 compiler.

[GitHub](https://github.com/bgocumlu/imx) | [API Reference](https://github.com/bgocumlu/imx/blob/main/docs/api-reference.md)
