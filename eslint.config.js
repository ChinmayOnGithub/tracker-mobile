const expoConfig = require('eslint-config-expo/flat')
const { defineConfig } = require('eslint/config')

module.exports = defineConfig([
  expoConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  {
    ignores: [
      '.expo/**',
      'node_modules/**',
      '.template-source/**',
      '.agents/**',
      'dist/**',
      'web-build/**',
      'assets/**',
    ],
  },
])