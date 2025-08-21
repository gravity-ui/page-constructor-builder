#!/usr/bin/env node

import {Command} from 'commander';
import * as fs from 'fs-extra';
import * as YAML from 'yaml';
import {PageBuilder} from './builder/PageBuilder';
import {BuilderConfig} from './types';

const program = new Command();

program
    .name('page-builder')
    .description('Build static pages from YAML configurations using @gravity-ui/page-constructor')
    .version(require('../package.json').version);

program
    .command('build')
    .description('Build pages from YAML configurations')
    .option('-i, --input <path>', 'Input directory containing YAML files', './pages')
    .option('-o, --output <path>', 'Output directory for built files', './dist')
    .option('-c, --config <path>', 'Configuration file path', './page-builder.config.yml')
    .option('--css <files...>', 'Custom CSS files to include')
    .option('--components <path>', 'Custom components directory')
    .option('--navigation <path>', 'Navigation file path')
    .option('--theme <theme>', 'Theme (light|dark)', 'light')
    .option('--base-url <url>', 'Base URL for the site')
    .option('--minify', 'Enable minification')
    .option('--source-maps', 'Generate source maps')
    .option('--watch', 'Enable watch mode')
    .action(async (options) => {
        try {
            const config = await loadConfig(options);
            const builder = new PageBuilder(config);

            console.log('🚀 Building pages...');
            console.log(`📁 Input: ${config.input}`);
            console.log(`📁 Output: ${config.output}`);

            const result = await builder.build();

            if (result.errors.length > 0) {
                console.error('❌ Build completed with errors:');
                result.errors.forEach((error) => console.error(`  - ${error}`));
            }

            if (result.warnings.length > 0) {
                console.warn('⚠️  Build completed with warnings:');
                result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
            }

            if (result.errors.length === 0) {
                console.log(`✅ Build completed successfully!`);
                console.log(`📄 Pages built: ${result.pagesBuilt}`);
                console.log(`⏱️  Build time: ${result.buildTime}ms`);
            }

            if (config.watch) {
                console.log('👀 Starting watch mode...');
                await builder.watch();
            }
        } catch (error) {
            console.error('❌ Build failed:', error);
            process.exit(1);
        }
    });

/**
 * Load configuration from file and command line options
 */
async function loadConfig(options: any): Promise<BuilderConfig> {
    let config: Partial<BuilderConfig> = {};

    // Load from config file if it exists
    if (await fs.pathExists(options.config)) {
        const configContent = await fs.readFile(options.config, 'utf-8');
        config = YAML.parse(configContent);
    }

    // Override with command line options
    const finalConfig: BuilderConfig = {
        input: options.input || config.input || './pages',
        output: options.output || config.output || './dist',
        css: options.css || config.css || [],
        components: options.components || config.components,
        assets: options.assets || config.assets,
        theme: options.theme || config.theme || 'light',
        baseUrl: options.baseUrl || config.baseUrl || '',
        minify: options.minify || config.minify || false,
        sourceMaps: options.sourceMaps || config.sourceMaps || false,
        watch: options.watch || config.watch || false,
        webpack: config.webpack,
        navigation: options.navigation || config.navigation,
        favicon: options.favicon || config.favicon,
    };

    return finalConfig;
}

program.parse();
