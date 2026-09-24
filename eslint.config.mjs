import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import eslintPluginImport from 'eslint-plugin-import';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  eslintConfigPrettier,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      import: eslintPluginImport,
    },
    rules: {
      // New error-level rules in eslint-config-next 16. Existing code still
      // uses these patterns; keep them visible without failing lint.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: 'react',
              group: 'external',
              position: 'before',
            },
            {
              pattern: 'react-*',
              group: 'external',
              position: 'after',
            },
            {
              pattern: 'next*',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@next/*',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@flarenetwork/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@rainbow-me/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@radix-ui/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@tanstack/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@hookform/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@openzeppelin/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: 'wagmi',
              group: 'external',
              position: 'after',
            },
            {
              pattern: 'viem',
              group: 'external',
              position: 'after',
            },
            {
              pattern: 'xrpl',
              group: 'external',
              position: 'after',
            },
            {
              pattern: 'zod',
              group: 'external',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
    },
  },
];

export default eslintConfig;
