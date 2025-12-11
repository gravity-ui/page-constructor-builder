import * as path from 'path';
import * as fs from 'fs-extra';
import {AnalyticsContextProps, BuilderConfig, NavigationData, PageConfig} from '../types';

export class SSRRenderer {
    private config: BuilderConfig;
    private serverModule: any = null;

    constructor(config: BuilderConfig) {
        this.config = config;
    }

    /**
     * Load the compiled server bundle
     * @returns Promise that resolves when server bundle is loaded
     */
    async loadServerBundle(): Promise<void> {
        const serverBundlePath = path.resolve(this.config.output, 'server.js');

        if (!(await fs.pathExists(serverBundlePath))) {
            throw new Error(`Server bundle not found at ${serverBundlePath}`);
        }

        // Clear require cache to ensure fresh import
        delete require.cache[serverBundlePath];

        // Load the server bundle
        this.serverModule = require(serverBundlePath);

        console.log('✓ Server bundle loaded successfully');
    }

    /**
     * Render page content to HTML string using SSR
     * @param pageConfig - Page configuration object
     * @param navigation - Navigation data object
     * @param filename - Filename for debug logging
     * @param analyticsConfig - Analytics configuration
     * @returns Promise that resolves to rendered HTML string
     */
    async renderToHTML(
        pageConfig: PageConfig,
        navigation: NavigationData | undefined,
        filename?: string,
        analyticsConfig?: AnalyticsContextProps,
    ): Promise<string> {
        if (!this.serverModule) {
            throw new Error('Server bundle not loaded. Call loadServerBundle() first.');
        }

        try {
            // Use the server bundle to render the page
            const htmlContent = this.serverModule.renderPage(
                pageConfig,
                this.config.theme || 'light',
                navigation,
                analyticsConfig,
            );

            console.log(`✓ SSR rendered page: ${filename || pageConfig.meta?.title || 'Untitled'}`);
            return htmlContent;
        } catch (error) {
            console.error('SSR rendering error:', error);

            // Return fallback content if SSR fails
            return `
                <div class="ssr-error">
                    <h2>Server-Side Rendering Error</h2>
                    <p>The page will be rendered on the client side.</p>
                    <details>
                        <summary>Error Details</summary>
                        <pre>${(error as Error).message}</pre>
                    </details>
                </div>
            `;
        }
    }
}
