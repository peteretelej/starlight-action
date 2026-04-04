export interface ScaffoldOptions {
    astroVersion?: string;
    starlightVersion?: string;
}
/**
 * Scaffolds a temporary Starlight project with dependencies installed.
 * Returns the path to the project directory.
 */
export declare function scaffoldProject(theme?: string, options?: ScaffoldOptions): Promise<string>;
