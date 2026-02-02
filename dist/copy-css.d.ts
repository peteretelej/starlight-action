export interface CopyCssOptions {
    customCssInput?: string;
    workspaceDir: string;
    projectDir: string;
}
export interface CopyCssResult {
    configPaths: string[];
}
/**
 * Parses comma-separated CSS file paths, validates them, copies them into the
 * scaffolded Starlight project, and returns config-relative paths.
 */
export declare function copyCss(options: CopyCssOptions): Promise<CopyCssResult>;
