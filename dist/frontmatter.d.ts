/**
 * Processes a single markdown file: ensures it has frontmatter with a title.
 * If frontmatter exists but has no title, injects one.
 * If no frontmatter exists, prepends it.
 */
export declare function processFrontmatter(filePath: string): void;
/**
 * Processes all markdown files in a directory recursively.
 */
export declare function processAllFrontmatter(docsDir: string): Promise<void>;
