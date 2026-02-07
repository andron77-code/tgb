const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const pluginPrettier = require('eslint-plugin-prettier');

module.exports = [
  // Базовая конфигурация ESLint для JavaScript
  js.configs.recommended,
  
  // Конфигурации для TypeScript
  ...tseslint.configs.recommended,
  
  {
    // Применять ко всем TypeScript файлам
    files: ['**/*.ts', '**/*.tsx'],
    
    // Плагины
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: pluginPrettier,
    },
    
    // Опции языка для TypeScript
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        // Проект для TypeScript
        project: './tsconfig.json',
        // Использовать строгую проверку типов
        tsconfigRootDir: __dirname,
      },
    },
    
    // Правила ESLint
    rules: {
      // Правила Prettier для форматирования кода
      'prettier/prettier': 'error',
      
      // Отключение конфликтующих правил Prettier
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      'comma-dangle': 'off',
      
      // Правила TypeScript
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      
      // Общие правила
      'no-console': 'off', // Разрешить console.log для разработки
      'no-debugger': 'error', // Запретить debugger в production
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  
  // Игнорировать файлы
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.min.js',
      'coverage/**',
    ],
  },
];
