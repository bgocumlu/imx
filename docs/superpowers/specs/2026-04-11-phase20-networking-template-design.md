# Phase 20 Step 4: Networking Template

## Goal

Add a `networking` template to `imxc init` and a matching `examples/networking/` example. Demonstrates HTTP client using cpp-httplib (header-only, cross-platform) with background threading via `run_async`.

## Files generated

| File | Description |
|------|-------------|
| `src/async.h` | Same `run_async` helper from async template |
| `src/main.cpp` | GLFW/OpenGL shell, wires fetch callback with httplib + run_async |
| `src/AppState.h` | State with URL, response, loading flag, fetch callback |
| `src/App.tsx` | URL input, Fetch button, loading state, response display |
| `src/imx.d.ts` | Shared (with networking AppState) |
| `tsconfig.json` | Shared |
| `CMakeLists.txt` | Adds FetchContent for cpp-httplib |
| `.gitignore` | Shared |
| `public/` | Empty asset directory |

## `AppState.h`

```cpp
#pragma once
#include <string>
#include <functional>

struct AppState {
    std::string url = "http://jsonplaceholder.typicode.com/todos/1";
    std::string response = "";
    bool loading = false;
    std::function<void()> onFetch;
};
```

## `async.h`

Same as the async template's `async.h` — `imx::run_async<T>()`. Reused because networking needs background threads for non-blocking HTTP.

## `main.cpp`

Same GLFW/OpenGL boilerplate. Includes `<httplib.h>` and `"async.h"`. Parses the URL from `app.state.url` to extract host and path, then uses `httplib::Client` on a background thread:

```cpp
#include <httplib.h>
#include "async.h"

app.state.onFetch = [&]() {
    app.state.loading = true;
    app.state.response = "";
    std::string url = app.state.url;
    imx::run_async<std::string>(
        app.runtime,
        [url]() -> std::string {
            // Simple URL parsing: http://host/path
            auto scheme_end = url.find("://");
            if (scheme_end == std::string::npos) return "Error: invalid URL (must start with http://)";
            auto host_start = scheme_end + 3;
            auto path_start = url.find('/', host_start);
            std::string host = (path_start != std::string::npos)
                ? url.substr(0, path_start)
                : url;
            std::string path = (path_start != std::string::npos)
                ? url.substr(path_start)
                : "/";
            httplib::Client cli(host);
            cli.set_connection_timeout(5);
            cli.set_read_timeout(5);
            auto res = cli.Get(path);
            if (res) return res->body;
            return "Error: request failed";
        },
        [&](std::string body) {
            app.state.response = std::move(body);
            app.state.loading = false;
        }
    );
};
```

## `App.tsx`

```tsx
export default function App(props: AppState) {
  return (
    <DockSpace>
      <Window title="Networking Demo">
        <Column gap={8}>
          <Text>HTTP Client Example</Text>
          <Separator />
          <TextInput label="URL" value={props.url} />
          <Button title="Fetch" onPress={props.onFetch} disabled={props.loading} />
          {props.loading && <Text color={[1, 0.8, 0, 1]}>Loading...</Text>}
          {props.response !== "" && <Text wrapped={true}>{props.response}</Text>}
        </Column>
      </Window>
    </DockSpace>
  );
}
```

## CMakeLists.txt

Custom string (like persistence template), adds cpp-httplib via FetchContent:

```cmake
FetchContent_Declare(httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.18.3
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(httplib)
```

Links `httplib::httplib` in `target_link_libraries`.

For the example (`examples/networking/`), the FetchContent goes in the `if(IMX_BUILD_EXAMPLES)` block in root CMakeLists.txt.

## Cross-platform

Fully cross-platform. cpp-httplib is header-only, uses OS sockets. Plain HTTP works without OpenSSL. A comment in main.cpp explains how to enable HTTPS (`#define CPPHTTPLIB_OPENSSL_SUPPORT` + link OpenSSL).

## Example + Template

- `examples/networking/` — built first, verified locally
- `compiler/src/templates/networking.ts` — same content as template strings
- Both share identical code (except window title: "Networking Example" vs "APP_NAME")
