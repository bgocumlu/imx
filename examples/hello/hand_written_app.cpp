#include "hand_written_app.h"
#include <imx/renderer.h>

void hand_written_app_render(imx::RenderContext& ctx) {
    auto name = ctx.use_state<std::string>("Berkay", 0);
    auto enabled = ctx.use_state<bool>(true, 1);
    auto count = ctx.use_state<int>(0, 2);

    imx::renderer::begin_window("Hello");

    imx::Style col_style;
    col_style.gap = 8.0F;
    imx::renderer::begin_column(col_style);

    imx::renderer::text("Hello %s", name.get().c_str());

    auto& name_buf = ctx.get_buffer(0);
    name_buf.sync_from(name.get());
    if (imx::renderer::text_input("##name", name_buf)) {
        name.set(name_buf.value());
    }

    {
        bool enabled_val = enabled.get();
        if (imx::renderer::checkbox("Enabled", &enabled_val)) {
            enabled.set(enabled_val);
        }
    }

    imx::Style row_style;
    row_style.gap = 8.0F;
    imx::renderer::begin_row(row_style);
    if (imx::renderer::button("Increment")) {
        count.set(count.get() + 1);
    }
    imx::renderer::text("Count: %d", count.get());
    imx::renderer::end_row();

    if (enabled.get()) {
        imx::renderer::text("Status: active");
    }

    imx::renderer::end_column();
    imx::renderer::end_window();
}

void hand_written_render_root(imx::Runtime& runtime) {
    auto& ctx = runtime.begin_frame();
    ctx.begin_instance("App", 0, 3, 1);
    hand_written_app_render(ctx);
    ctx.end_instance();
    runtime.end_frame();
}
