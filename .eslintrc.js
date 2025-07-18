module.exports = {
    extends: [
        '@gravity-ui/eslint-config',
        '@gravity-ui/eslint-config/client',
        '@gravity-ui/eslint-config/prettier',
    ],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    env: {
        node: true,
        es6: true,
    },
    rules: {
        // Add custom rules if needed
    },
};
