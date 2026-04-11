import * as fs from 'node:fs';
import * as path from 'node:path';
import { TEMPLATES, APP_TSX, buildImxDts, TSCONFIG } from './templates/index.js';
import './templates/minimal.js';
import './templates/async.js';
import './templates/persistence.js';
import './templates/networking.js';
export function addToProject(projectDir) {
    const srcDir = path.join(projectDir, 'src');
    if (fs.existsSync(path.join(srcDir, 'App.tsx'))) {
        console.error(`Error: ${srcDir}/App.tsx already exists. Aborting.`);
        process.exit(1);
    }
    fs.mkdirSync(srcDir, { recursive: true });
    const publicDir = path.join(projectDir, 'public');
    fs.mkdirSync(publicDir, { recursive: true });
    // Write TSX source files only — no CMakeLists.txt or main.cpp
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), APP_TSX);
    fs.writeFileSync(path.join(srcDir, 'imx.d.ts'), buildImxDts(`interface AppState {
    count: number;
    speed: number;
    onIncrement: () => void;
}`));
    fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), TSCONFIG);
    console.log(`imxc: added IMX sources to project`);
    console.log('');
    console.log('  Created:');
    console.log(`    src/App.tsx            — your root component`);
    console.log(`    src/imx.d.ts           — type definitions for IDE support`);
    console.log(`    tsconfig.json          — TypeScript config`);
    console.log(`    public/                — static assets (copied to exe directory)`);
    console.log('');
    console.log('  Add to your CMakeLists.txt:');
    console.log('');
    console.log('    # --- IMX integration ---');
    console.log('    include(FetchContent)');
    console.log('    FetchContent_Declare(imx');
    console.log('        GIT_REPOSITORY https://github.com/bgocumlu/imx.git');
    console.log('        GIT_TAG main');
    console.log('    )');
    console.log('    FetchContent_MakeAvailable(imx)');
    console.log('    include(ImxCompile)');
    console.log('');
    console.log('    imx_compile_tsx(GENERATED');
    console.log('        SOURCES src/App.tsx');
    console.log('        OUTPUT_DIR ${CMAKE_BINARY_DIR}/generated');
    console.log('    )');
    console.log('');
    console.log('    # Add ${GENERATED} to your target sources:');
    console.log('    target_sources(your_app PRIVATE ${GENERATED})');
    console.log('    target_link_libraries(your_app PRIVATE imx::renderer)');
    console.log('    target_include_directories(your_app PRIVATE ${CMAKE_BINARY_DIR}/generated)');
    console.log('');
    console.log('    # Copy assets to exe directory:');
    console.log('    add_custom_command(TARGET your_app POST_BUILD');
    console.log('        COMMAND ${CMAKE_COMMAND} -E copy_directory');
    console.log('            ${CMAKE_CURRENT_SOURCE_DIR}/public $<TARGET_FILE_DIR:your_app>');
    console.log('    )');
    console.log('');
    console.log('  Then add the IMX render call to your main loop:');
    console.log('');
    console.log('    #include <imx/runtime.h>');
    console.log('    imx::Runtime runtime;');
    console.log('    // In your frame loop, between NewFrame() and Render():');
    console.log('    imx::render_root(runtime);');
}
export function initProject(projectDir, projectName, templateName) {
    const name = projectName ?? path.basename(projectDir);
    const tpl = templateName ?? 'minimal';
    const entry = TEMPLATES.find(t => t.name === tpl);
    if (!entry) {
        console.error(`Error: unknown template "${tpl}". Available: ${TEMPLATES.map(t => t.name).join(', ')}`);
        process.exit(1);
    }
    entry.generate(projectDir, name);
}
