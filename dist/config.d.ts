export interface StarlightActionInputs {
    title: string;
    description: string;
    base: string;
    site: string;
    logo?: string;
    configPath?: string;
    customCssPaths?: string[];
    theme?: string;
    themePlugin?: string;
    themeOptions?: string;
}
/**
 * Builds the import statement and plugin call for a Starlight theme package.
 */
export declare function buildThemeImport(theme: string, themePlugin: string, themeOptions?: string): {
    importStatement: string;
    pluginCall: string;
};
/**
 * Generates the astro.config.mjs content and writes it to the project directory.
 */
export declare function generateConfig(projectDir: string, inputs: StarlightActionInputs): void;
