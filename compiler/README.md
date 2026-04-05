# imxc

Compiler for IMX. Compiles React-like `.tsx` to native Dear ImGui C++ apps.

## Usage

```bash
# Scaffold a new project
npx imxc init myapp
cd myapp
cmake -B build
cmake --build build --config Release

# Add to existing CMake project
npx imxc add

# Compile TSX manually
imxc App.tsx -o build/generated

# Watch mode
imxc watch src -o build/generated
```

54 components, 5-prop theme system, custom C++ widgets, canvas drawing, drag-drop.

Requires: Node.js, CMake 3.25+, C++20 compiler.

[GitHub](https://github.com/bgocumlu/imx) | [API Reference](https://github.com/bgocumlu/imx/blob/main/docs/api-reference.md)
