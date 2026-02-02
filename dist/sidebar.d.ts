export interface SidebarItem {
    label: string;
    link?: string;
    items?: SidebarItem[];
    collapsed?: boolean;
}
/**
 * Generates a Starlight sidebar configuration from the docs directory tree.
 */
export declare function generateSidebar(docsDir: string, relativeTo?: string): SidebarItem[];
