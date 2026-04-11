# Phase 20 Step 1: Interactive Template Selector

## Goal

Refactor `imxc init` to support multiple project templates with an interactive CLI selector and `--template` flag. The current init output becomes the "minimal" template. Infrastructure scales to support templates added in steps 2-8.

## File Structure

```
compiler/src/
  templates/
    index.ts       — registry, prompt helpers, shared utils (cmakeTemplate, writeProject)
    minimal.ts     — current template strings + generator function
  init.ts          — thin wrapper: imports from templates/, exports initProject/addToProject
  index.ts         — parses --template flag, calls prompts when needed
```

## Template Registry (`templates/index.ts`)

```ts
export interface TemplateInfo {
    name: string;
    description: string;
    generate: (projectDir: string, projectName: string) => void;
}
```

Each template file exports a `TemplateInfo`. The registry collects them into a `TEMPLATES` array. Adding a new template = create `templates/<name>.ts` + add one import line to `templates/index.ts`.

Shared utilities exported from `templates/index.ts`:
- `cmakeTemplate(projectName, repoUrl)` — generates CMakeLists.txt content (used by all templates)
- `promptTemplateName()` — interactive menu using `node:readline`
- `promptProjectName()` — prompts for project name
- `TEMPLATES` array — the registry
- Common template strings shared across templates (IMX_DTS, TSCONFIG, GITIGNORE, APP_TSX) can be exported for reuse

## Interactive Menu

Uses `node:readline` from Node.js standard library (no external deps). Wraps `rl.question` in a Promise for async usage.

```
Select a template:

  1. minimal — Bare ImGui app with struct binding

Template (number or name):
```

Accepts either a number (1-based index) or a template name string. Invalid input prints an error and exits.

## CLI Argument Handling (`index.ts`)

The `init` subcommand uses `parseArgs` on `process.argv.slice(3)` with:
- `allowPositionals: true` — first positional is the project directory
- `options: { template: { type: 'string', short: 't' } }`

| Command | Behavior |
|---------|----------|
| `imxc init` | prompt for name, then prompt for template |
| `imxc init my_app` | prompt for template |
| `imxc init my_app --template=minimal` | no prompts |
| `imxc init .` | use current dir name, prompt for template |
| `imxc init . -t minimal` | no prompts, scaffold in current dir |

Top-level await is supported (ESM, `"type": "module"`).

## What Moves Where

| Content | From | To |
|---------|------|----|
| MAIN_CPP, APPSTATE_H | `init.ts` | `templates/minimal.ts` |
| APP_TSX, IMX_DTS, TSCONFIG, GITIGNORE | `init.ts` | `templates/index.ts` (shared) |
| `cmakeTemplate()` | `init.ts` | `templates/index.ts` (shared) |
| Prompt functions | (new) | `templates/index.ts` |
| `initProject()` | `init.ts` | `init.ts` (thin dispatcher) |
| `addToProject()` | `init.ts` | `init.ts` (unchanged) |

## `initProject` Becomes a Dispatcher

```ts
export function initProject(projectDir: string, projectName?: string, templateName?: string): void {
    const name = projectName ?? path.basename(projectDir);
    const template = templateName ?? 'minimal';
    const entry = TEMPLATES.find(t => t.name === template);
    if (!entry) {
        console.error(`Error: unknown template "${template}". Available: ${TEMPLATES.map(t => t.name).join(', ')}`);
        process.exit(1);
    }
    entry.generate(projectDir, name);
}
```

## What Doesn't Change

- `addToProject()` — untouched, template-independent
- All template string content — identical text, just relocated to `templates/minimal.ts`
- `watch` and build commands in `index.ts` — untouched
- No new npm dependencies

## Testing

- `npm run build` in `compiler/` must succeed
- Existing compiler tests (`npx vitest run`) must pass
- Manual: `node dist/index.js init test_project --template=minimal` produces same output as before
- Manual: `node dist/index.js init test_project` shows interactive menu
- Manual: `node dist/index.js init` prompts for name then template
