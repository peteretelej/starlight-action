/**
 * Runs the Astro build and verifies output.
 * Returns the path to the build output directory.
 */
export declare function buildSite(projectDir: string): Promise<string>;
/**
 * Uploads the build output as a GitHub Pages artifact.
 * Creates an uncompressed tar archive matching the format expected by
 * actions/upload-pages-artifact and actions/deploy-pages.
 */
export declare function uploadArtifact(distDir: string): Promise<void>;
