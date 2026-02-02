/**
 * Rewrites relative links in README.md that point into the docs folder.
 * e.g. "docs/guide.md" -> "/guide/"
 *      "./docs/contributing.md" -> "/contributing/"
 *
 * @param content - The README.md content
 * @param docsFolder - The docs folder name (e.g. "docs")
 * @param basePath - The site base path (e.g. "/repo-name")
 */
export declare function rewriteReadmeLinks(content: string, docsFolder: string, basePath: string): Promise<string>;
