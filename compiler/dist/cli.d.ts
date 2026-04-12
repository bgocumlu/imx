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
export declare function runCli(argv: string[], deps?: CliDeps): Promise<number>;
export {};
