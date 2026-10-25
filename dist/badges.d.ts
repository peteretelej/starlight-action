/**
 * Rewrites badge-only paragraphs (README-style rows of linked badge images)
 * as paragraphs with the readme-badges class so they can be laid out with
 * spacing instead of clumping together inline.
 */
export declare function polishBadgeRows(content: string): Promise<string>;
/**
 * Applies badge-row polish to all markdown files in a directory recursively.
 */
export declare function polishAllBadgeRows(docsDir: string): Promise<void>;
