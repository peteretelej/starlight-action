export interface CopyDocsOptions {
    docsPath: string;
    projectDir: string;
    readme: boolean;
    workspaceDir: string;
    logoPath?: string;
}
/**
 * Copies documentation files into the Starlight project.
 */
export declare function copyDocs(options: CopyDocsOptions): void;
