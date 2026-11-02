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
      // 全角スペースを文字列・テンプレート・JSX テキストで使っている(意図的)
      'no-irregular-whitespace': ['error', { skipStrings: true, skipTemplates: true, skipJSXText: true, skipComments: true }],
      // sessionStorage / 音声 / JSON 解析など、失敗しても無視してよい箇所の空 catch は許可
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
)
