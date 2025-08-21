import * as fs from 'fs-extra';
import * as path from 'path';
import {glob} from 'glob';
import * as YAML from 'yaml';
import {BuildResult, BuilderConfig, ComponentManifest, NavigationData, PageConfig} from '../types';
import {WebpackBuilder} from './WebpackBuilder';
import {TemplateRenderer} from './TemplateRenderer';

export class PageBuilder {
    private config: BuilderConfig;
    private webpackBuilder: WebpackBuilder;
    private templateRenderer: TemplateRenderer;

    constructor(config: BuilderConfig) {
        this.config = config;
        this.webpackBuilder = new WebpackBuilder(config);
        this.templateRenderer = new TemplateRenderer(config);
    }

    /**
     * Build all pages from YAML configurations
     * @returns Promise that resolves to build result
     */
    async build(): Promise<BuildResult> {
        const startTime = Date.now();
        const result: BuildResult = {
            pagesBuilt: 0,
            buildTime: 0,
            errors: [],
            warnings: [],
        };

        try {
            // Ensure output directory exists
            await fs.ensureDir(this.config.output);

            // Copy static assets if specified
            if (this.config.assets) {
                await this.copyStaticAssets();
            }

            // Copy favicon if specified
            await this.copyFavicon();

            // Find all YAML files
            const yamlFiles = await this.findYamlFiles();

            if (yamlFiles.length === 0) {
                result.warnings.push('No YAML files found in input directory');
                return result;
            }

            // Load custom components if specified
            const componentManifest = await this.loadComponents();

            // Build webpack bundle with components and styles
            await this.webpackBuilder.build(componentManifest);

            // Get generated CSS files
            const generatedCSSFiles = this.webpackBuilder.getGeneratedCSSFiles();

            // Process each YAML file
            for (const yamlFile of yamlFiles) {
                try {
                    await this.buildPage(yamlFile, componentManifest, generatedCSSFiles);
                    result.pagesBuilt++;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    result.errors.push(`Error building ${yamlFile}: ${errorMessage}`);
                }
            }

            // Clean up server-side artifacts after SSG is complete
            // Server assets are only needed during the build process for SSR
            // and should not be included in the final static output
            if (result.errors.length === 0) {
                await this.cleanupServerBundle();
            }

            result.buildTime = Date.now() - startTime;
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Build failed: ${errorMessage}`);
            result.buildTime = Date.now() - startTime;
            return result;
        }
    }

    /**
     * Start watch mode for development
     * @returns Promise that resolves when watch mode is started
     */
    async watch(): Promise<void> {
        if (!this.config.watch) {
            return;
        }

        const chokidar = await import('chokidar');

        const watchPaths = [
            path.join(this.config.input, '**/*.{yml,yaml}'),
            ...(this.config.components ? [path.join(this.config.components, '**/*')] : []),
            ...(this.config.css || []),
            ...(this.config.assets ? [path.join(this.config.assets, '**/*')] : []),
            ...(this.config.navigation ? [this.config.navigation] : []),
        ];

        const watcher = chokidar.watch(watchPaths);

        watcher.on('change', async (filePath: string) => {
            console.log(`File changed: ${filePath}`);
            try {
                await this.build();
                console.log('Rebuild completed');
            } catch (error) {
                console.error('Rebuild failed:', error);
            }
        });

        console.log('Watching for changes...');
    }

    /**
     * Find all YAML files in the input directory
     * @returns Promise that resolves to array of YAML file paths
     */
    private async findYamlFiles(): Promise<string[]> {
        const pattern = path.join(this.config.input, '**/*.{yml,yaml}');
        return glob(pattern);
    }

    /**
     * Load custom components from components directory
     * @returns Promise that resolves to component manifest array
     */
    private async loadComponents(): Promise<ComponentManifest[]> {
        if (!this.config.components) {
            return [];
        }

        const componentsDir = this.config.components;
        if (!(await fs.pathExists(componentsDir))) {
            return [];
        }

        const componentFiles = await glob(path.join(componentsDir, '**/*.{ts,tsx,js,jsx}'));
        const manifest: ComponentManifest[] = [];

        for (const file of componentFiles) {
            const name = path.basename(file, path.extname(file));

            manifest.push({
                name,
                path: file,
                dependencies: await this.extractDependencies(file),
                styles: await this.findComponentStyles(file),
            });
        }

        return manifest;
    }

    /**
     * Extract dependencies from a component file
     * @param filePath - Path to the component file
     * @returns Promise that resolves to array of dependency names
     */
    private async extractDependencies(filePath: string): Promise<string[]> {
        const content = await fs.readFile(filePath, 'utf-8');
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        const dependencies: string[] = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            dependencies.push(match[1]);
        }

        return dependencies;
    }

    /**
     * Find CSS/SCSS files associated with a component
     * @param filePath - Path to the component file
     * @returns Promise that resolves to array of style file paths
     */
    private async findComponentStyles(filePath: string): Promise<string[]> {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, path.extname(filePath));
        const styleFiles = [
            path.join(dir, `${name}.css`),
            path.join(dir, `${name}.scss`),
            path.join(dir, `${name}.sass`),
        ];

        const existingStyles: string[] = [];
        for (const styleFile of styleFiles) {
            if (await fs.pathExists(styleFile)) {
                existingStyles.push(styleFile);
            }
        }

        return existingStyles;
    }

    /**
     * Build a single page from YAML configuration
     * @param yamlFile - Path to the YAML file
     * @param componentManifest - Array of component manifests
     * @param generatedCSSFiles - Array of generated CSS file paths
     * @returns Promise that resolves when page is built
     */
    private async buildPage(
        yamlFile: string,
        componentManifest: ComponentManifest[],
        generatedCSSFiles: string[] = [],
    ): Promise<void> {
        // Read and parse YAML
        const yamlContent = await fs.readFile(yamlFile, 'utf-8');
        const pageConfig: PageConfig = YAML.parse(yamlContent);

        // Generate output filename from YAML file path
        const relativePath = path.relative(this.config.input, yamlFile);
        const outputName = path.basename(relativePath, path.extname(relativePath));
        const outputPath = path.join(this.config.output, `${outputName}.html`);

        // Load navigation file
        const navigationFile = this.config.navigation;
        let navigation: NavigationData | undefined;
        if (navigationFile) {
            const navigationContent = await fs.readFile(navigationFile, 'utf-8');
            navigation = YAML.parse(navigationContent);
        }

        // Render the page with SSR
        const html = await this.templateRenderer.render(
            pageConfig,
            navigation,
            componentManifest,
            generatedCSSFiles,
            outputName,
        );

        // Write the HTML file
        await fs.writeFile(outputPath, html, 'utf-8');
    }

    /**
     * Copy static assets from assets directory to output directory
     * @returns Promise that resolves when assets are copied
     */
    private async copyStaticAssets(): Promise<void> {
        if (!this.config.assets) {
            return;
        }

        const assetsDir = this.config.assets;
        if (!(await fs.pathExists(assetsDir))) {
            console.warn(`Assets directory not found: ${assetsDir}`);
            return;
        }

        const outputAssetsDir = path.join(this.config.output, 'assets');

        // Copy all files from assets directory to output/assets
        await fs.copy(assetsDir, outputAssetsDir, {
            overwrite: true,
            filter: (src) => {
                // Filter out common development files
                const basename = path.basename(src);
                return (
                    !basename.startsWith('.') &&
                    !basename.includes('node_modules') &&
                    !basename.includes('dist')
                );
            },
        });

        console.log(`Copied assets from ${assetsDir} to ${outputAssetsDir}`);
    }

    /**
     * Copy favicon file to output directory if configured
     * @returns Promise that resolves when favicon is copied
     */
    private async copyFavicon(): Promise<void> {
        if (!this.config.favicon) {
            return;
        }

        const faviconPath = this.config.favicon;

        // Skip copying if it's an external URL
        if (faviconPath.startsWith('http://') || faviconPath.startsWith('https://')) {
            return;
        }

        // Determine source path - check if it's relative to assets directory
        let sourcePath: string;
        if (path.isAbsolute(faviconPath)) {
            sourcePath = faviconPath;
        } else if (
            this.config.assets &&
            (await fs.pathExists(path.join(this.config.assets, faviconPath)))
        ) {
            // Favicon is in assets directory
            sourcePath = path.join(this.config.assets, faviconPath);
        } else if (await fs.pathExists(faviconPath)) {
            // Favicon path is relative to project root
            sourcePath = faviconPath;
        } else {
            console.warn(`Favicon file not found: ${faviconPath}`);
            return;
        }

        // Determine output path
        const faviconFilename = path.basename(sourcePath);
        const outputPath = path.join(this.config.output, 'assets', faviconFilename);

        // Ensure output directory exists
        await fs.ensureDir(path.dirname(outputPath));

        // Copy favicon file
        await fs.copy(sourcePath, outputPath, {overwrite: true});

        console.log(`Copied favicon from ${sourcePath} to ${outputPath}`);
    }

    /**
     * Clean up all server-side bundle files after SSG is complete.
     * This removes all server assets including the main server.js file and source maps.
     */
    private async cleanupServerBundle(): Promise<void> {
        // Get all server bundle assets from webpack builder
        const serverAssets = this.webpackBuilder.getServerBundleAssets();

        let removedCount = 0;
        const errors: string[] = [];

        for (const assetPath of serverAssets) {
            try {
                if (await fs.pathExists(assetPath)) {
                    await fs.unlink(assetPath);
                    removedCount++;
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                errors.push(`Failed to remove ${assetPath}: ${errorMessage}`);
            }
        }

        if (removedCount > 0) {
            console.log(`✓ Cleaned up ${removedCount} server bundle files`);
        }

        if (errors.length > 0) {
            console.warn('Warnings during server bundle cleanup:');
            errors.forEach((error) => console.warn(`  - ${error}`));
        }
    }
}
