// 導入手順: npm i -D eslint@^9 typescript-eslint@^8 globals && npm run lint
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'dist-server', 'node_modules', 'prisma/migrations', 'generated'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      // 既存コードに多いため当面は警告に留める(新規コードでは使わない)
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
)
