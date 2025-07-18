import {PageBuilder} from '../builder/PageBuilder';
import {BuilderConfig} from '../types';

describe('PageBuilder', () => {
    const mockConfig: BuilderConfig = {
        input: './test-pages',
        output: './test-dist',
        theme: 'light',
        minify: false,
        watch: false,
    };

    let pageBuilder: PageBuilder;

    beforeEach(() => {
        pageBuilder = new PageBuilder(mockConfig);
    });

    describe('constructor', () => {
        it('should create a PageBuilder instance', () => {
            expect(pageBuilder).toBeInstanceOf(PageBuilder);
        });

        it('should store the provided configuration', () => {
            expect(pageBuilder['config']).toEqual(mockConfig);
        });
    });

    describe('build', () => {
        it('should return a BuildResult object', async () => {
            const result = await pageBuilder.build();

            expect(result).toHaveProperty('pagesBuilt');
            expect(result).toHaveProperty('buildTime');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('warnings');

            expect(typeof result.pagesBuilt).toBe('number');
            expect(typeof result.buildTime).toBe('number');
            expect(Array.isArray(result.errors)).toBe(true);
            expect(Array.isArray(result.warnings)).toBe(true);
        });
    });
});
