export interface StarlightActionInputs {
    title: string;
    description: string;
    base: string;
    site: string;
    logo?: string;
    configPath?: string;
}
/**
 * Generates the astro.config.mjs content and writes it to the project directory.
 */
export declare function generateConfig(projectDir: string, inputs: StarlightActionInputs): void;
