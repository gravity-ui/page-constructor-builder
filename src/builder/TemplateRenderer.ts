import {
    AnalyticsContextProps,
    BuilderConfig,
    ComponentManifest,
    NavigationData,
    PageConfig,
} from '../types';
import {SSRRenderer} from './SSRRenderer';

// Import server utilities for content transformation
const {contentTransformer} = require('@gravity-ui/page-constructor/server');

export class TemplateRenderer {
    private config: BuilderConfig;
    private ssrRenderer: SSRRenderer;

    constructor(config: BuilderConfig) {
        this.config = config;
        this.ssrRenderer = new SSRRenderer(config);
    }

    /**
     * Render a page configuration to HTML with SSR
     * @param pageConfig - Page configuration object
     * @param navigation - Navigation data object
     * @param componentManifest - Array of component manifests
     * @param generatedCSSFiles - Array of generated CSS file paths
     * @param filename - Filename for debug logging
     * @param analyticsConfig - Analytics configuration
     * @returns Promise that resolves to HTML string
     */
    async render(
        pageConfig: PageConfig,
        navigation: NavigationData | undefined,
        _componentManifest: ComponentManifest[] = [],
        generatedCSSFiles: string[] = [],
        filename?: string,
        analyticsConfig?: AnalyticsContextProps,
    ): Promise<string> {
        // Load the server bundle (includes all components)
        await this.ssrRenderer.loadServerBundle();

        // Transform the page content for SSR
        const transformedPageConfig = this.transformPageContent(pageConfig, filename);

        // Pre-render the page content with SSR
        const prerenderedContent = await this.ssrRenderer.renderToHTML(
            transformedPageConfig,
            navigation,
            filename,
            analyticsConfig,
        );

        // Generate HTML with pre-rendered content and client hydration
        const html = this.generateHTML(
            transformedPageConfig,
            navigation,
            prerenderedContent,
            generatedCSSFiles,
            analyticsConfig,
        );
        return html;
    }

    /**
     * Generate complete HTML page with SSR content and client hydration
     * @param pageConfig - Page configuration object
     * @param navigation - Navigation data object
     * @param prerenderedContent - Pre-rendered HTML content from SSR
     * @param generatedCSSFiles - Array of generated CSS file paths
     * @param analyticsConfig - Analytics configuration
     * @returns Complete HTML string
     */
    private generateHTML(
        pageConfig: PageConfig,
        navigation: NavigationData | undefined,
        prerenderedContent?: string,
        generatedCSSFiles: string[] = [],
        analyticsConfig?: AnalyticsContextProps,
    ): string {
        const title = this.escapeHtml(pageConfig.meta?.title || 'Page Constructor Builder');
        const description = this.escapeHtml(pageConfig.meta?.description || '');
        const theme = this.config.theme || 'light';
        const baseUrl = this.config.baseUrl || '/';

        // Generate meta tags
        const metaTags = this.generateMetaTags(pageConfig);

        // Generate favicon tags
        const faviconTags = this.generateFaviconTags();

        // For local file usage, we need to avoid base href and use relative paths
        const baseHref = baseUrl !== '/' ? `<base href="${baseUrl}">` : '';

        return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    ${baseHref}
    
    <!-- Favicon -->
    ${faviconTags}
    
    <!-- Page Meta Tags -->
    ${metaTags}
    
    <!-- Page Constructor Styles -->
    ${generatedCSSFiles.map((css) => `<link rel="stylesheet" href="${css}">`).join('\n    ')}
    
    <!-- Custom CSS -->
    ${(pageConfig.css || []).map((css) => `<link rel="stylesheet" href="${css}">`).join('\n    ')}
    
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        
        #root {
            min-height: 100vh;
        }
        
        /* Loading indicator */
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            color: #666;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #007acc;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 12px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Error styles */
        .ssr-error {
            padding: 20px;
            margin: 20px;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            background-color: #f8d7da;
            color: #721c24;
        }
        
        .ssr-error h2 {
            margin-top: 0;
            color: #721c24;
        }
        
        .ssr-error details {
            margin-top: 10px;
        }
        
        .ssr-error pre {
            background: #fff;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }
    </style>
</head>
<body>
    <div id="root">${
        prerenderedContent ||
        `
        <div class="loading">
            <div class="loading-spinner"></div>
            Loading Page Constructor...
        </div>
    `
    }</div>
    
    <!-- Page Constructor Client Bundle -->
    <script src="client.js"></script>
    
    <script>
        // Page configuration
        const pageConfig = ${JSON.stringify(pageConfig, null, 2)};
        
        // Initialize Page Constructor when client bundle loads
        function initializePageConstructor() {
            if (typeof window.hydratePageConstructor === 'function') {
                try {
                    window.hydratePageConstructor({
                        pageConfig: pageConfig,
                        theme: '${theme}',
                        navigation: ${JSON.stringify(navigation, null, 2)},
                        analytics: ${this.generateAnalyticsCode(analyticsConfig)}
                    });
                } catch (error) {
                    console.error('Error initializing Page Constructor:', error);
                    
                    // Show error message
                    const rootElement = document.getElementById('root');
                    if (rootElement) {
                        rootElement.innerHTML = \`
                            <div class="ssr-error">
                                <h2>Error Loading Page Constructor</h2>
                                <p>\${error.message}</p>
                                <details>
                                    <summary>Debug Information</summary>
                                    <pre>\${JSON.stringify({
                                        userAgent: navigator.userAgent,
                                        pageConfig: pageConfig,
                                        error: error.message
                                    }, null, 2)}</pre>
                                </details>
                            </div>
                        \`;
                    }
                }
            } else {
                // Retry after a short delay if client bundle isn't loaded yet
                setTimeout(initializePageConstructor, 100);
            }
        }
        
        // Start initialization when page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializePageConstructor);
        } else {
            initializePageConstructor();
        }
    </script>
    
    <!-- Custom JavaScript -->
    ${(pageConfig.js || []).map((js) => `<script src="${js}"></script>`).join('\n    ')}
</body>
</html>`;
    }

    /**
     * Generate meta tags for the page
     * @param pageConfig - Page configuration object
     * @returns HTML string with meta tags
     */
    private generateMetaTags(pageConfig: PageConfig): string {
        const meta = pageConfig.meta;
        if (!meta) return '';

        const tags: string[] = [];

        // Open Graph tags
        if (meta.sharing?.title) {
            tags.push(
                `<meta property="og:title" content="${this.escapeHtml(meta.sharing.title)}">`,
            );
        }
        if (meta.sharing?.description) {
            tags.push(
                `<meta property="og:description" content="${this.escapeHtml(meta.sharing.description)}">`,
            );
        }
        if (meta.sharing?.image) {
            tags.push(
                `<meta property="og:image" content="${this.escapeHtml(meta.sharing.image)}">`,
            );
        }

        // Twitter Card tags
        if (meta.sharing?.title || meta.sharing?.description) {
            tags.push('<meta name="twitter:card" content="summary_large_image">');
            if (meta.sharing?.title) {
                tags.push(
                    `<meta name="twitter:title" content="${this.escapeHtml(meta.sharing.title)}">`,
                );
            }
            if (meta.sharing?.description) {
                tags.push(
                    `<meta name="twitter:description" content="${this.escapeHtml(meta.sharing.description)}">`,
                );
            }
            if (meta.sharing?.image) {
                tags.push(
                    `<meta name="twitter:image" content="${this.escapeHtml(meta.sharing.image)}">`,
                );
            }
        }

        // Keywords
        if (meta.keywords && meta.keywords.length > 0) {
            tags.push(`<meta name="keywords" content="${meta.keywords.join(', ')}">`);
        }

        return tags.join('\n    ');
    }

    /**
     * Generate favicon tags for the page
     * @returns HTML string with favicon tags
     */
    private generateFaviconTags(): string {
        if (!this.config.favicon) return '';

        const faviconPath = this.config.favicon;
        const tags: string[] = [];

        // Determine if it's a URL or a file path
        const isUrl = faviconPath.startsWith('http://') || faviconPath.startsWith('https://');

        if (isUrl) {
            // External URL favicon
            tags.push(`<link rel="icon" href="${this.escapeHtml(faviconPath)}">`);
        } else {
            // Local file favicon - determine the MIME type based on file extension
            const extension = faviconPath.toLowerCase().split('.').pop();
            let mimeType = 'image/x-icon'; // default for .ico files

            switch (extension) {
                case 'png':
                    mimeType = 'image/png';
                    break;
                case 'svg':
                    mimeType = 'image/svg+xml';
                    break;
                case 'jpg':
                case 'jpeg':
                    mimeType = 'image/jpeg';
                    break;
                case 'gif':
                    mimeType = 'image/gif';
                    break;
                case 'ico':
                default:
                    mimeType = 'image/x-icon';
                    break;
            }

            // For local assets, they will be copied to the assets directory
            // Use just the filename if the path includes a directory
            const faviconFilename = faviconPath.includes('/')
                ? faviconPath.split('/').pop()
                : faviconPath;
            const faviconUrl = `assets/${faviconFilename}`;

            tags.push(`<link rel="icon" type="${mimeType}" href="${this.escapeHtml(faviconUrl)}">`);

            // Add shortcut icon for older browsers
            if (extension === 'ico') {
                tags.push(`<link rel="shortcut icon" href="${this.escapeHtml(faviconUrl)}">`);
            }
        }

        return tags.join('\n    ');
    }

    /**
     * Generate analytics configuration code that preserves functions
     * @param analyticsConfig - Analytics configuration object
     * @returns String representation of analytics config with functions
     */
    private generateAnalyticsCode(analyticsConfig?: AnalyticsContextProps): string {
        if (!analyticsConfig) {
            return 'undefined';
        }

        const parts: string[] = [];

        if (analyticsConfig.sendEvents) {
            parts.push(`sendEvents: ${analyticsConfig.sendEvents.toString()}`);
        }

        if (analyticsConfig.autoEvents !== undefined) {
            parts.push(`autoEvents: ${analyticsConfig.autoEvents}`);
        }

        return `{ ${parts.join(', ')} }`;
    }

    /**
     * Escape HTML characters in a string
     * @param text - Text to escape
     * @returns Escaped text
     */
    private escapeHtml(text: string): string {
        const div = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        };
        return text.replace(/[&<>"']/g, (char) => div[char as keyof typeof div]);
    }

    /**
     * Transform page content using page constructor's contentTransformer
     * @param pageConfig - Page configuration object
     * @param filename - Filename for debug logging
     * @returns Transformed page configuration with processed markdown
     */
    private transformPageContent(pageConfig: PageConfig, filename?: string): PageConfig {
        try {
            // Transform the page content using the official transformer
            const transformedContent = contentTransformer({
                content: pageConfig,
                options: {
                    lang: 'en',
                },
            });

            console.log(
                `✓ Transformed markdown for page: ${filename || pageConfig.meta?.title || 'Untitled'}`,
            );
            return {...pageConfig, blocks: transformedContent.blocks};
        } catch (error) {
            console.warn(
                `⚠ Warning: Failed to transform content for SSR ${filename || pageConfig.meta?.title || 'Untitled'}:`,
                (error as Error).message,
            );
            return pageConfig;
        }
    }
}
