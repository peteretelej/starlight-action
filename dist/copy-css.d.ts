export interface CopyCssOptions {
    customCssInput?: string;
    workspaceDir: string;
    projectDir: string;
}
export interface CopyCssResult {
    configPaths: string[];
}
/**
 * Writes the action's built-in stylesheet into the project and returns its
 * config-relative path. Loaded before user CSS so custom_css can override it.
 */
export declare function writeBuiltinCss(projectDir: string): string[];
/**
 * Parses comma-separated CSS file paths, validates them, copies them into the
 * scaffolded Starlight project, and returns config-relative paths.
 */
export declare function copyCss(options: CopyCssOptions): Promise<CopyCssResult>;
