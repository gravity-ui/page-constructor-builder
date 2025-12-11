import * as path from 'path';
import * as fs from 'fs-extra';
import webpack from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import {AnalyticsContextProps, BuilderConfig, ComponentManifest} from '../types';

export class WebpackBuilder {
    private config: BuilderConfig;
    private generatedAssets: string[] = [];
    private serverBundleAssets: string[] = [];

    constructor(config: BuilderConfig) {
        this.config = config;
    }

    /**
     * Build both client and server bundles
     * @param componentManifest - Array of component manifests
     * @param analyticsConfig - Analytics configuration
     * @returns Promise that resolves when build is complete
     */
    async build(
        componentManifest: ComponentManifest[],
        analyticsConfig?: AnalyticsContextProps,
    ): Promise<void> {
        // Create temporary entry files for both client and server
        const clientEntryPath = await this.createClientEntry(componentManifest, analyticsConfig);
        const serverEntryPath = await this.createServerEntry(componentManifest, analyticsConfig);

        try {
            // Build client bundle
            const clientConfig = this.createClientWebpackConfig(clientEntryPath);
            await this.runWebpack(clientConfig);

            // Build server bundle
            const serverConfig = this.createServerWebpackConfig(serverEntryPath);
            await this.runWebpack(serverConfig);

            console.log('✓ Client and server bundles built successfully');
        } finally {
            // Clean up temporary files
            await Promise.all([
                fs
                    .pathExists(clientEntryPath)
                    .then((exists) => (exists ? fs.remove(clientEntryPath) : Promise.resolve())),
                fs
                    .pathExists(serverEntryPath)
                    .then((exists) => (exists ? fs.remove(serverEntryPath) : Promise.resolve())),
            ]);
        }
    }

    /**
     * Get list of generated CSS files
     * @returns Array of CSS file paths
     */
    getGeneratedCSSFiles(): string[] {
        return this.generatedAssets;
    }

    /**
     * Get list of all server bundle assets that should be cleaned up after SSG
     * @returns Array of server bundle file paths
     */
    getServerBundleAssets(): string[] {
        return this.serverBundleAssets;
    }

    /**
     * Create client entry file that includes all components and styles
     * @param componentManifest - Array of component manifests
     * @returns Promise that resolves to the entry file path
     */
    private async createClientEntry(
        componentManifest: ComponentManifest[],
        analyticsConfig?: AnalyticsContextProps,
    ): Promise<string> {
        const entryPath = path.join(this.getPackageRoot(), 'temp-client-entry.tsx');

        const entryContent = `
// Client entry for Page Constructor
import {hydratePageConstructor} from '${path.resolve(__dirname, 'entries/client')}';

// Page Constructor core styles (force ESM imports)
import '@gravity-ui/page-constructor/styles/styles.scss';
import '@gravity-ui/uikit/styles/fonts.scss';
import '@gravity-ui/uikit/styles/styles.scss';

// Custom CSS imports
${(this.config.css || [])
    .map((cssPath) => {
        const resolvedPath = path.resolve(cssPath);
        return `import '${resolvedPath}';`;
    })
    .join('\n')}

// Custom component imports
${componentManifest
    .map((comp) => {
        const resolvedPath = path.resolve(comp.path);
        return `import ${comp.name} from '${resolvedPath}';`;
    })
    .join('\n')}

// Component styles
${componentManifest
    .flatMap((comp) => comp.styles || [])
    .map((stylePath) => {
        const resolvedPath = path.resolve(stylePath);
        return `import '${resolvedPath}';`;
    })
    .join('\n')}

// Create custom components object
const customComponents = {
${componentManifest.map((comp) => `  '${comp.name}': ${comp.name}`).join(',\n')}
};

// Analytics configuration
const analyticsConfig = ${analyticsConfig ? this.generateAnalyticsCode(analyticsConfig) : 'undefined'};

// Make hydratePageConstructor available globally with custom components
declare global {
    interface Window {
        hydratePageConstructor: (options: {pageConfig: any, customComponents?: any, theme?: string, navigation?: any, analytics?: any}) => void;
    }
}

window.hydratePageConstructor = (options: {pageConfig: any, customComponents?: any, theme?: string, navigation?: any, analytics?: any}) => {
    hydratePageConstructor({
        pageConfig: options.pageConfig,
        customComponents: options.customComponents || customComponents,
        theme: options.theme,
        navigation: options.navigation,
        analytics: options.analytics || analyticsConfig,
    });
};

console.log('✓ Client bundle loaded with custom components:', Object.keys(customComponents));
`;

        await fs.writeFile(entryPath, entryContent);
        return entryPath;
    }

    /**
     * Create server entry file that includes all components and styles
     * @param componentManifest - Array of component manifests
     * @param analyticsConfig - Analytics configuration
     * @returns Promise that resolves to the entry file path
     */
    private async createServerEntry(
        componentManifest: ComponentManifest[],
        analyticsConfig?: AnalyticsContextProps,
    ): Promise<string> {
        const entryPath = path.join(this.getPackageRoot(), 'temp-server-entry.tsx');

        const entryContent = `
// Server entry for Page Constructor SSR
import {renderPageToString} from '${path.resolve(__dirname, 'entries/server')}';

// Custom component imports
${componentManifest
    .map((comp) => {
        const resolvedPath = path.resolve(comp.path);
        return `import ${comp.name} from '${resolvedPath}';`;
    })
    .join('\n')}

// Create custom components object
const customComponents = {
${componentManifest.map((comp) => `  '${comp.name}': ${comp.name}`).join(',\n')}
};

// Analytics configuration
const analyticsConfig = ${analyticsConfig ? this.generateAnalyticsCode(analyticsConfig) : 'undefined'};

// Export render function with custom components
export function renderPage(pageConfig: any, theme?: string, navigation?: any, analytics?: any): string {
    return renderPageToString({
        pageConfig,
        customComponents,
        theme,
        navigation,
        analytics: analytics || analyticsConfig,
    });
}

export default renderPage;
`;

        await fs.writeFile(entryPath, entryContent);
        return entryPath;
    }

    /**
     * Generate analytics configuration code that preserves functions
     * @param analyticsConfig - Analytics configuration object
     * @returns String representation of analytics config with functions
     */
    private generateAnalyticsCode(analyticsConfig: AnalyticsContextProps): string {
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
     * Get the package root directory
     * @returns Path to the package root directory
     */
    private getPackageRoot(): string {
        // Try to find package.json starting from current file location
        let currentDir = __dirname;
        while (currentDir !== path.dirname(currentDir)) {
            try {
                const packageJsonPath = path.join(currentDir, 'package.json');
                if (require('fs').existsSync(packageJsonPath)) {
                    const packageJson = require(packageJsonPath);
                    if (packageJson.name === '@gravity-ui/page-constructor-builder') {
                        return currentDir;
                    }
                }
            } catch {
                // Continue searching
            }
            currentDir = path.dirname(currentDir);
        }

        // Fallback to relative path resolution
        return path.resolve(__dirname, '../..');
    }

    /**
     * Get TypeScript loader configuration
     * @returns TypeScript loader configuration object
     */
    private getTsLoaderConfig() {
        const packageRoot = this.getPackageRoot();
        return {
            loader: 'ts-loader',
            options: {
                transpileOnly: true,
                configFile: path.join(packageRoot, 'tsconfig.json'),
                compilerOptions: {
                    declaration: false,
                    declarationMap: false,
                    sourceMap: !this.config.minify,
                },
            },
        };
    }

    /**
     * Create webpack configuration for client bundle
     * @param entryPath - Path to the client entry file
     * @returns Webpack configuration object
     */
    private createClientWebpackConfig(entryPath: string): webpack.Configuration {
        return {
            mode: this.config.minify ? 'production' : 'development',
            entry: path.resolve(entryPath),
            target: 'web',
            output: {
                path: path.resolve(this.config.output),
                filename: 'client.js',
                library: {
                    name: 'PageConstructorClient',
                    type: 'umd',
                },
                clean: false,
            },
            module: {
                rules: [
                    {
                        test: /\.(ts|tsx)$/,
                        use: this.getTsLoaderConfig(),
                        exclude: /node_modules\/(?!@gravity-ui\/page-constructor-builder)/,
                    },
                    {
                        test: /\.(js|jsx)$/,
                        exclude: /node_modules/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    [require.resolve('@babel/preset-env'), {targets: 'defaults'}],
                                    [
                                        require.resolve('@babel/preset-react'),
                                        {runtime: 'automatic'},
                                    ],
                                ],
                            },
                        },
                    },
                    {
                        test: /\.(css|scss|sass)$/,
                        use: [
                            MiniCssExtractPlugin.loader,
                            'css-loader',
                            {
                                loader: 'sass-loader',
                                options: {
                                    implementation: require('sass'),
                                },
                            },
                        ],
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg|woff|woff2|eot|ttf|otf)$/,
                        type: 'asset/resource',
                    },
                ],
            },
            resolve: {
                extensions: ['.ts', '.tsx', '.js', '.jsx'],
                mainFields: ['module', 'browser', 'main'], // Prefer ESM versions first
                conditionNames: ['import', 'module', 'browser', 'default'], // Force ESM resolution
                fallback: {
                    path: require.resolve('path-browserify'),
                    os: require.resolve('os-browserify/browser'),
                    crypto: require.resolve('crypto-browserify'),
                    stream: require.resolve('stream-browserify'),
                    buffer: require.resolve('buffer'),
                    process: require.resolve('process/browser'),
                    url: require.resolve('url/'),
                    util: require.resolve('util/'),
                    querystring: require.resolve('querystring-es3'),
                    fs: false,
                    net: false,
                    tls: false,
                },
            },
            resolveLoader: {
                modules: [path.join(this.getPackageRoot(), 'node_modules'), 'node_modules'],
            },
            plugins: [
                new webpack.ProvidePlugin({
                    process: 'process/browser',
                    Buffer: ['buffer', 'Buffer'],
                }),
                new MiniCssExtractPlugin({
                    filename: 'styles.css',
                    chunkFilename: '[id].css',
                }),
            ],
            devtool: this.config.sourceMaps ? 'source-map' : false,
        };
    }

    /**
     * Create webpack configuration for server bundle
     * @param entryPath - Path to the server entry file
     * @returns Webpack configuration object
     */
    private createServerWebpackConfig(entryPath: string): webpack.Configuration {
        return {
            mode: this.config.minify ? 'production' : 'development',
            entry: path.resolve(entryPath),
            target: 'node',
            output: {
                path: path.resolve(this.config.output),
                filename: 'server.js',
                library: {
                    type: 'commonjs2',
                },
                clean: false,
            },
            module: {
                rules: [
                    {
                        test: /\.(ts|tsx)$/,
                        use: this.getTsLoaderConfig(),
                        exclude: /node_modules\/(?!@gravity-ui\/page-constructor-builder)/,
                    },
                    {
                        test: /\.(js|jsx)$/,
                        exclude: /node_modules/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    [
                                        require.resolve('@babel/preset-env'),
                                        {targets: {node: 'current'}},
                                    ],
                                    [
                                        require.resolve('@babel/preset-react'),
                                        {runtime: 'automatic'},
                                    ],
                                ],
                            },
                        },
                    },
                    {
                        test: /\.(css|scss|sass)$/,
                        use: 'null-loader', // Ignore CSS in server bundle
                    },
                    {
                        test: /\.(png|jpe?g|gif|svg|woff|woff2|eot|ttf|otf)$/,
                        type: 'asset/resource',
                        generator: {
                            emit: false, // Don't emit assets in server bundle
                        },
                    },
                ],
            },
            resolve: {
                extensions: ['.ts', '.tsx', '.js', '.jsx'],
            },
            resolveLoader: {
                modules: [path.join(this.getPackageRoot(), 'node_modules'), 'node_modules'],
            },
            externals: {
                // Don't bundle Node.js modules
                ...Object.fromEntries(
                    require('module').builtinModules.map((mod: string) => [mod, `commonjs ${mod}`]),
                ),
            },
            devtool: this.config.sourceMaps ? 'source-map' : false,
        };
    }

    /**
     * Run webpack build using the webpack API
     * @param config - Webpack configuration object
     * @returns Promise that resolves when build is complete
     */
    private async runWebpack(config: webpack.Configuration): Promise<void> {
        return new Promise((resolve, reject) => {
            const compiler = webpack(config);

            compiler.run((err: Error | null, stats: webpack.Stats | undefined) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (stats?.hasErrors()) {
                    const errors = stats.compilation.errors
                        .map((error: {message: string}) => error.message)
                        .join('\n');
                    reject(new Error(`Webpack compilation errors:\n${errors}`));
                    return;
                }

                if (stats?.hasWarnings()) {
                    const warnings = stats.compilation.warnings
                        .map((warning: {message: string}) => warning.message)
                        .join('\n');
                    console.warn(`Webpack compilation warnings:\n${warnings}`);
                }

                // Track generated assets
                if (stats?.compilation.assets) {
                    const assetNames = Object.keys(stats.compilation.assets);

                    if (config.target === 'web') {
                        // Track CSS files for client bundle
                        this.generatedAssets = assetNames.filter((name) => name.endsWith('.css'));
                    } else if (config.target === 'node') {
                        // Track all files for server bundle (to be cleaned up later)
                        this.serverBundleAssets = assetNames.map((name) =>
                            path.resolve(this.config.output, name),
                        );
                    }
                }

                resolve();
            });
        });
    }
}
