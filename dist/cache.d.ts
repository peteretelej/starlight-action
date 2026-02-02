/**
 * Attempts to restore the npm cache before install.
 * Returns true on cache hit, false on miss. Never throws.
 */
export declare function restoreNpmCache(projectDir: string): Promise<boolean>;
/**
 * Saves the npm cache after install.
 * Warns on failure but does not throw.
 */
export declare function saveNpmCache(projectDir: string): Promise<void>;
