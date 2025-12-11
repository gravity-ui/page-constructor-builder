import type {NavigationData, PageContent} from '@gravity-ui/page-constructor';

export interface BuilderConfig {
    /** Input directory containing YAML files */
    input: string;
    /** Output directory for built files */
    output: string;
    /** Custom CSS files to include */
    css?: string[];
    /** Custom components directory */
    components?: string;
    /** Static assets directory to copy */
    assets?: string;
    /** Theme configuration */
    theme?: 'light' | 'dark';
    /** Base URL for the site */
    baseUrl?: string;
    /** Enable minification */
    minify?: boolean;
    /** Generate source maps */
    sourceMaps?: boolean;
    /** Enable watch mode */
    watch?: boolean;
    /** Custom webpack configuration */
    webpack?: Record<string, unknown>;
    /** Navigation file path */
    navigation?: string;
    /** Favicon configuration */
    favicon?: string;
    /** Analytics configuration file path */
    analytics?: string;
}

export interface PageMetaSharing {
    /** Sharing title (for OpenGraph) */
    title?: string;
    /** Sharing description (for OpenGraph) */
    description?: string;
    /** Sharing image URL (for OpenGraph) */
    image?: string;
    /** Keywords for meta tags */
    keywords?: string[];
}

export interface PageMeta {
    /** Page title */
    title?: string;
    /** Page description */
    description?: string;
    /** Social sharing configuration */
    sharing?: PageMetaSharing;
    /** Additional meta keywords */
    keywords?: string[];
}

export interface PageConfig extends PageContent {
    /** Page meta configuration */
    meta?: PageMeta;
    /** Custom CSS for this page */
    css?: string[];
    /** Custom JavaScript for this page */
    js?: string[];
    /** Page navigation */
    navigation?: NavigationData;
}

export interface BuildResult {
    /** Number of pages built */
    pagesBuilt: number;
    /** Build time in milliseconds */
    buildTime: number;
    /** Array of error messages */
    errors: string[];
    /** Array of warning messages */
    warnings: string[];
}

export interface ComponentManifest {
    /** Component name */
    name: string;
    /** Component file path */
    path: string;
    /** Component dependencies */
    dependencies?: string[];
    /** Component styles */
    styles?: string[];
}

// Re-export types for convenience
export type {
    NavigationData,
    PageContent,
    AnalyticsEvent,
    AnalyticsContextProps,
} from '@gravity-ui/page-constructor';
