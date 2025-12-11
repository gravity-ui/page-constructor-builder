import * as React from 'react';
import {hydrateRoot} from 'react-dom/client';
import {
    NavigationData,
    PageConstructor,
    PageConstructorProvider,
} from '@gravity-ui/page-constructor';
import {ThemeProvider} from '@gravity-ui/uikit';
import {PageConfig} from '../../types';

// Import page constructor styles
import '@gravity-ui/page-constructor/styles/styles.scss';
import '@gravity-ui/uikit/styles/fonts.scss';
import '@gravity-ui/uikit/styles/styles.scss';

export interface ClientRenderOptions {
    pageConfig: PageConfig;
    customComponents?: Record<string, React.ComponentType<any>>;
    theme?: string;
    navigation?: NavigationData;
    analytics?: any;
}

export function hydratePageConstructor(options: ClientRenderOptions): void {
    const {pageConfig, customComponents = {}, theme = 'light', navigation, analytics} = options;

    const pageElement = React.createElement(
        ThemeProvider,
        {theme: theme as any},
        React.createElement(
            PageConstructorProvider,
            {
                theme: theme as any,
                isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent,
                ),
                ssrConfig: {isServer: false},
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

    const rootElement = document.getElementById('root');
    if (rootElement) {
        hydrateRoot(rootElement, pageElement);
        console.log('Page Constructor hydrated successfully');
    } else {
        console.error('Root element not found');
    }
}

// Make available globally for template usage
declare global {
    interface Window {
        hydratePageConstructor: typeof hydratePageConstructor;
    }
}

window.hydratePageConstructor = hydratePageConstructor;
