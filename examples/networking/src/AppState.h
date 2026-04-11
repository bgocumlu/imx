#pragma once
#include <string>
#include <functional>

struct AppState {
    std::string url = "http://jsonplaceholder.typicode.com/todos/1";
    std::string response = "";
    bool loading = false;
    std::function<void()> onFetch;
};
