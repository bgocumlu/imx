#pragma once
#include <thread>
#include <functional>
#include <imx/runtime.h>

namespace imx {

// Runs `work` on a background thread, then calls `on_done` with the result.
// Calls request_frame() so the UI wakes up to display the result.
// Replace with a thread pool if you need to limit concurrency.
template<typename T>
void run_async(Runtime& runtime, std::function<T()> work, std::function<void(T)> on_done) {
    std::thread([&runtime, work = std::move(work), on_done = std::move(on_done)]() {
        T result = work();
        on_done(std::move(result));
        runtime.request_frame();
    }).detach();
}

} // namespace imx
