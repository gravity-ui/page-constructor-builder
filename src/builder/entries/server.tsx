import * as React from 'react';
import {renderToString} from 'react-dom/server';
import {
    NavigationData,
    PageConstructor,
    PageConstructorProvider,
} from '@gravity-ui/page-constructor';
import {ThemeProvider} from '@gravity-ui/uikit';
import {PageConfig} from '../../types';

// Import page constructor styles (these will be processed by webpack)
import '@gravity-ui/page-constructor/styles/styles.scss';
import '@gravity-ui/uikit/styles/fonts.scss';
import '@gravity-ui/uikit/styles/styles.scss';

export interface ServerRenderOptions {
    pageConfig: PageConfig;
    customComponents?: Record<string, React.ComponentType<any>>;
    theme?: string;
    navigation?: NavigationData;
    analytics?: any;
}

export function renderPageToString(options: ServerRenderOptions): string {
    const {pageConfig, customComponents = {}, theme = 'light', navigation, analytics} = options;

    const pageElement = React.createElement(
        ThemeProvider,
        {theme: theme as any},
        React.createElement(
            PageConstructorProvider,
            {
                theme: theme as any,
                isMobile: false, // Default to desktop for SSR
                ssrConfig: {isServer: true},
                analytics: analytics,
            },
            React.createElement(PageConstructor, {
                content: pageConfig,
                navigation: pageConfig.navigation || navigation,
                custom: {
                    blocks: customComponents,
                },
            }),
        ),
    );

    return renderToString(pageElement);
}

// Export for Node.js usage
export default renderPageToString;
