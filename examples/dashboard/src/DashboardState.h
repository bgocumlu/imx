#pragma once
#include <functional>
#include <string>
#include <vector>

struct LogEntry {
    std::string timestamp;
    std::string level;
    std::string message;
};

struct DashboardState {
    // Metrics
    float cpuUsage = 0.0f;
    float memoryUsage = 0.0f;
    int activeConnections = 0;
    int requestsPerSec = 0;

    // Charts
    std::vector<float> cpuHistory = {};
    std::vector<float> memHistory = {};
    std::vector<float> requestHistory = {};

    // Table
    std::vector<LogEntry> logs = {};

    // Actions
    std::function<void()> onRefresh;
    std::function<void()> onClearLogs;
};
