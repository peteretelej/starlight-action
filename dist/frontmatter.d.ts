/**
 * Processes a single markdown file: ensures it has frontmatter with a title.
 * If frontmatter exists but has no title, injects one.
 * If no frontmatter exists, prepends it.
 * When the title comes from a leading # heading, the heading is removed from
 * the body since Starlight already renders the title as the page h1.
 */
export declare function processFrontmatter(filePath: string): void;
/**
 * Processes all markdown files in a directory recursively.
 */
export declare function processAllFrontmatter(docsDir: string): Promise<void>;
