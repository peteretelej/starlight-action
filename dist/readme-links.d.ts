/**
 * Rewrites relative links in README.md that point into the docs folder.
 * e.g. "docs/guide.md" -> "/guide/"
 *      "./docs/contributing.md" -> "/contributing/"
 *
 * When repoRoot and repoUrl are provided, links to other files that exist in
 * the repository (LICENSE, CONTRIBUTING.md, source examples) are rewritten to
 * GitHub blob URLs, since relative paths on the built site would 404.
 *
 * @param content - The README.md content
 * @param docsFolder - The docs folder name (e.g. "docs")
 * @param basePath - The site base path (e.g. "/repo-name")
 * @param options - Repo context for rewriting links to repo files
 */
export interface RewriteReadmeOptions {
    /** Absolute path to the repository root (the workspace). */
    repoRoot?: string;
    /** Repository URL, e.g. https://github.com/owner/repo */
    repoUrl?: string;
}
export declare function rewriteReadmeLinks(content: string, docsFolder: string, basePath: string, options?: RewriteReadmeOptions): Promise<string>;
