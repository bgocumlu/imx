#pragma once
#include <vector>
#include <functional>

struct Course {
    float credit = 3.0f;
    int grade_index = 0;
};

struct AppState {
    std::vector<Course> courses;
    float gpa = 0.0f;
    std::function<void()> onAddCourse;
    std::function<void()> onRemoveCourse;
};
