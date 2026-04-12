import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { compile } from './compile.js';
import { addToProject, initProject } from './init.js';
import { TEMPLATES, promptProjectName, promptTemplateName } from './templates/index.js';
import { startWatch } from './watch.js';

type WriteFn = (text: string) => void;

export interface CliDeps {
    compile: typeof compile;
    initProject: typeof initProject;
    addToProject: typeof addToProject;
    startWatch: typeof startWatch;
    promptProjectName: typeof promptProjectName;
    promptTemplateName: typeof promptTemplateName;
    templates: typeof TEMPLATES;
    version: string;
    stdout: WriteFn;
    stderr: WriteFn;
}

const defaultDeps: CliDeps = {
    compile,
    initProject,
    addToProject,
    startWatch,
    promptProjectName,
    promptTemplateName,
    templates: TEMPLATES,
    version: JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8')).version as string,
    stdout: text => process.stdout.write(text),
    stderr: text => process.stderr.write(text),
};

function isHelpFlag(arg: string | undefined): boolean {
    return arg === '--help' || arg === '-h';
}

function isVersionFlag(arg: string | undefined): boolean {
    return arg === '--version' || arg === '-v';
}

function templateList(templates: typeof TEMPLATES): string {
    return templates.map(t => `  ${t.name} - ${t.description}`).join('\n');
}

function mainHelp(templates: typeof TEMPLATES): string {
    return [
        'imxc - compile IMX .tsx into native Dear ImGui C++.',
        '',
        'Usage:',
        '  imxc <input.tsx ...> -o <output-dir>',
        '  imxc init [project-dir] [--template=<name[,name,...]>]',
        '  imxc add [project-dir]',
        '  imxc watch <dir> -o <output-dir> [--build <cmd>]',
        '  imxc templates',
        '  imxc help [command]',
        '  imxc --version',
        '',
        'Notes:',
        '  Root component in explicit builds is the first .tsx input you pass.',
        '  Watch mode chooses the root in this order: src/App.tsx, App.tsx, then first file alphabetically.',
        '  Declare native widgets in src/imx.d.ts to enable typing and suppress unknown-component warnings.',
        '',
        'Templates:',
        templateList(templates),
        '',
        'First project:',
        '  npx imxc init myapp --template=minimal',
        '  cd myapp',
        '  cmake -B build',
        '  cmake --build build',
        '',
    ].join('\n');
}

function initHelp(templates: typeof TEMPLATES): string {
    return [
        'Usage: imxc init [project-dir] [--template=<name[,name,...]>]',
        '',
        'Creates a new IMX project scaffold.',
        'If no project dir is provided, imxc prompts for one.',
        'If no template is provided, imxc opens the interactive template selector.',
        '',
        'Available templates:',
        templateList(templates),
        '',
        'Examples:',
        '  imxc init myapp',
        '  imxc init myapp --template=minimal',
        '  imxc init myapp --template=async,persistence',
        '',
    ].join('\n');
}

function addHelp(): string {
    return [
        'Usage: imxc add [project-dir]',
        '',
        'Adds IMX compiler integration to an existing CMake project.',
        'Defaults to the current directory when no project dir is provided.',
        '',
    ].join('\n');
}

function watchHelp(): string {
    return [
        'Usage: imxc watch <dir> -o <output-dir> [--build <cmd>]',
        '',
        'Watches a directory recursively for .tsx changes and recompiles on change.',
        'Root selection order is: src/App.tsx, App.tsx, then first file alphabetically.',
        'If --build is provided, imxc runs the build command after each successful compile.',
        '',
        'Examples:',
        '  imxc watch src -o build/generated',
        '  imxc watch src -o build/generated --build "cmake --build build"',
        '',
    ].join('\n');
}

function templatesHelp(templates: typeof TEMPLATES): string {
    return [
        'Usage: imxc templates',
        '',
        'Lists all built-in project templates.',
        '',
        'Templates:',
        templateList(templates),
        '',
    ].join('\n');
}

function helpText(command: string | undefined, templates: typeof TEMPLATES): string {
    switch (command) {
        case 'init': return initHelp(templates);
        case 'add': return addHelp();
        case 'watch': return watchHelp();
        case 'templates': return templatesHelp(templates);
        default: return mainHelp(templates);
    }
}

function formatParseError(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string') {
        return (error as { message: string }).message;
    }
    return 'Invalid command line arguments.';
}

function asOptionalString(value: string | boolean | Array<string | boolean> | undefined): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function safeParseArgs<T extends Parameters<typeof parseArgs>[0]>(
    config: T,
    deps: CliDeps,
    help: string,
): ReturnType<typeof parseArgs> | null {
    try {
        return parseArgs(config);
    } catch (error) {
        deps.stderr(`imxc: ${formatParseError(error)}\n\n${help}`);
        return null;
    }
}

export async function runCli(argv: string[], deps: CliDeps = defaultDeps): Promise<number> {
    const [command, ...rest] = argv;

    if (!command) {
        deps.stdout(mainHelp(deps.templates));
        return 0;
    }

    if (isHelpFlag(command)) {
        deps.stdout(mainHelp(deps.templates));
        return 0;
    }

    if (isVersionFlag(command)) {
        deps.stdout(`${deps.version}\n`);
        return 0;
    }

    if (command === 'help') {
        deps.stdout(helpText(rest[0], deps.templates));
        return 0;
    }

    if (command === 'templates') {
        if (isHelpFlag(rest[0])) {
            deps.stdout(templatesHelp(deps.templates));
        } else if (rest.length > 0) {
            deps.stderr(`imxc: templates does not accept additional arguments.\n\n${templatesHelp(deps.templates)}`);
            return 1;
        } else {
            deps.stdout(`Available templates:\n\n${templateList(deps.templates)}\n\nUse "imxc init <project-dir> --template=<name[,name,...]>" to scaffold one.\n`);
        }
        return 0;
    }

    if (command === 'init') {
        if (isHelpFlag(rest[0])) {
            deps.stdout(initHelp(deps.templates));
            return 0;
        }

        const parsed = safeParseArgs({
            args: rest,
            allowPositionals: true,
            options: { template: { type: 'string', short: 't' } },
        }, deps, initHelp(deps.templates));
        if (!parsed) return 1;

        let dir = parsed.positionals[0];
        if (!dir) {
            dir = await deps.promptProjectName();
        }
        const absDir = path.resolve(dir);
        const templateName = asOptionalString(parsed.values.template) ?? await deps.promptTemplateName();
        deps.initProject(absDir, path.basename(absDir), templateName);
        return 0;
    }

    if (command === 'add') {
        if (isHelpFlag(rest[0])) {
            deps.stdout(addHelp());
            return 0;
        }
        const parsed = safeParseArgs({
            args: rest,
            allowPositionals: true,
            options: {},
        }, deps, addHelp());
        if (!parsed) return 1;
        const dir = parsed.positionals[0] ?? '.';
        deps.addToProject(path.resolve(dir));
        return 0;
    }

    if (command === 'watch') {
        if (isHelpFlag(rest[0])) {
            deps.stdout(watchHelp());
            return 0;
        }
        if (!rest[0]) {
            deps.stderr(`imxc: missing watch directory.\n\n${watchHelp()}`);
            return 1;
        }
        const watchDir = rest[0];
        const parsed = safeParseArgs({
            args: rest.slice(1),
            allowPositionals: false,
            options: {
                output: { type: 'string', short: 'o' },
                build: { type: 'string', short: 'b' },
            },
        }, deps, watchHelp());
        if (!parsed) return 1;

        const outputDir = asOptionalString(parsed.values.output) ?? '.';
        const buildCmd = asOptionalString(parsed.values.build);
        deps.startWatch(path.resolve(watchDir), path.resolve(outputDir), buildCmd);
        return 0;
    }

    if (command.startsWith('-')) {
        deps.stderr(`imxc: unknown option '${command}'.\n\n${mainHelp(deps.templates)}`);
        return 1;
    }

    const parsed = safeParseArgs({
        args: argv,
        allowPositionals: true,
        options: { output: { type: 'string', short: 'o' } },
    }, deps, mainHelp(deps.templates));
    if (!parsed) return 1;

    if (parsed.positionals.length === 0) {
        deps.stderr(`imxc: no input .tsx files provided.\n\n${mainHelp(deps.templates)}`);
        return 1;
    }

    const outputDir = asOptionalString(parsed.values.output) ?? '.';
    const result = deps.compile(parsed.positionals, outputDir);
    if (result.warnings.length > 0) {
        result.warnings.forEach(w => deps.stderr(w + '\n'));
    }
    if (!result.success) {
        result.errors.forEach(e => deps.stderr(e + '\n'));
        return 1;
    }

    deps.stdout(`imxc: ${result.componentCount} component(s) compiled successfully.\n`);
    return 0;
}
