#include "hand_written_app.h"
#include <reimgui/renderer.h>

void hand_written_app_render(reimgui::RenderContext& ctx) {
    auto name = ctx.use_state<std::string>("Berkay", 0);
    auto enabled = ctx.use_state<bool>(true, 1);
    auto count = ctx.use_state<int>(0, 2);

    reimgui::renderer::begin_window("Hello");

    reimgui::Style col_style;
    col_style.gap = 8.0F;
    reimgui::renderer::begin_column(col_style);

    reimgui::renderer::text("Hello %s", name.get().c_str());

    auto& name_buf = ctx.get_buffer(0);
    name_buf.sync_from(name.get());
    if (reimgui::renderer::text_input("##name", name_buf)) {
        name.set(name_buf.value());
    }

    {
        bool enabled_val = enabled.get();
        if (reimgui::renderer::checkbox("Enabled", &enabled_val)) {
            enabled.set(enabled_val);
        }
    }

    reimgui::Style row_style;
    row_style.gap = 8.0F;
    reimgui::renderer::begin_row(row_style);
    if (reimgui::renderer::button("Increment")) {
        count.set(count.get() + 1);
    }
    reimgui::renderer::text("Count: %d", count.get());
    reimgui::renderer::end_row();

    if (enabled.get()) {
        reimgui::renderer::text("Status: active");
    }

    reimgui::renderer::end_column();
    reimgui::renderer::end_window();
}

void hand_written_render_root(reimgui::Runtime& runtime) {
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 3, 1);
    hand_written_app_render(ctx);
    ctx.end_instance();
    runtime.end_frame();
}
