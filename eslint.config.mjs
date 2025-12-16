import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    'tests/**', // Ignoruj testy w podstawowych regułach
  ]),
  {
    rules: {
      // ============================================
      // SPÓJNOŚĆ CUDZYSŁOWÓW I APOSTROFÓW
      // ============================================
      // Wymuszaj używanie pojedynczych apostrofów (') dla wszystkich stringów
      'quotes': ['error', 'single', {
        'avoidEscape': true, // Pozwól na escape w stringach
        'allowTemplateLiterals': true, // Pozwól na template literals
      }],

      // ============================================
      // KONKATENACJA STRINGÓW - UŻYWAJ TEMPLATE LITERALS
      // ============================================
      // Wymuszaj używanie template literals zamiast konkatenacji
      'prefer-template': 'error',
      // Zabroń konkatenacji stringów
      'no-concat': 'off', // Wyłączamy, bo prefer-template to obsługuje

      // ============================================
      // ECMASCRIPT 6
      // ============================================
      // Wymuszaj używanie const/let zamiast var
      'no-var': 'error',
      'prefer-const': 'error',
      // Wymuszaj arrow functions dla callbacków
      'prefer-arrow-callback': 'error',
      // Wymuszaj arrow functions zamiast function declarations
      // "expression" wymusza function expressions (w tym arrow functions) zamiast declarations
      'func-style': ['error', 'expression'],
      'prefer-spread': 'error',
      'prefer-rest-params': 'error',
      // Wyłączamy prefer-destructuring, bo może być zbyt restrykcyjne
      'prefer-destructuring': 'off',

      // ============================================
      // IMPORTOWANIE - SPÓJNOŚĆ I PORZĄDEK
      // ============================================
      // Wymuszaj spójny styl importów
      'import/order': ['error', {
        'groups': [
          'builtin',    // Node.js built-in modules
          'external',    // External libraries
          'internal',   // Internal modules (z @/)
          'parent',     // Parent imports
          'sibling',    // Sibling imports
          'index',       // Index imports
        ],
        'pathGroups': [
          {
            'pattern': '@/**',
            'group': 'internal',
            'position': 'before',
          },
        ],
        'pathGroupsExcludedImportTypes': ['builtin'],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true,
        },
      }],
      // Wymuszaj używanie default export tylko gdy jest jeden export
      'import/prefer-default-export': 'off', // Wyłączamy, bo preferujemy named exports
      // Zabroń nieużywanych importów
      'import/no-unresolved': 'error',
      // Wykrywaj nieużywane importy - TypeScript no-unused-vars wykrywa też nieużywane importy
      'import/no-unused-modules': 'off', // Wyłączamy, bo może być zbyt restrykcyjne dla Vercel

      // ============================================
      // INTERFEJSY - W OSOBNYCH PLIKACH
      // ============================================
      // Sprawdzanie czy interfejsy są w osobnych plikach
      // (To będzie sprawdzane przez custom rule lub TypeScript)
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // ============================================
      // OGÓLNE RESTRYKCYJNE REGUŁY
      // ============================================
      // Zabroń console.log w produkcji (ale pozwól w testach)
      // Wyłączamy, bo Next.js używa console.log do debugowania
      'no-console': 'off',
      // Zabroń debugger
      'no-debugger': 'error',
      // Zabroń nieużywanych zmiennych
      'no-unused-vars': 'off', // Wyłączamy, bo używamy TypeScript version
      '@typescript-eslint/no-unused-vars': ['error', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true,
        'caughtErrors': 'all',
        'args': 'after-used',
      }],
      // Wymuszaj używanie === zamiast ==
      'eqeqeq': ['error', 'always'],
      // Zabroń używania eval
      'no-eval': 'error',
      // Zabroń używania implikacji
      'no-implied-eval': 'error',
      // Zabroń niebezpiecznych wyrażeń
      'no-new-func': 'error',
      // Wymuszaj używanie strict mode (automatycznie w ES modules)
      'strict': 'off', // Wyłączamy, bo używamy ES modules

      // ============================================
      // FORMATOWANIE I STYL
      // ============================================
      // Wymuszaj średniki
      'semi': ['error', 'always'],
      // Wymuszaj spójne wcięcia (2 spacje) - wyłączamy, bo może kolidować z Prettier/Next.js
      'indent': 'off', // Wyłączamy, bo Next.js ma własne formatowanie
      // Wymuszaj spójne końce linii
      'eol-last': ['error', 'never'],
      // Wymuszaj spójne spacje w nawiasach klamrowych
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      // Wymuszaj spójne spacje w funkcjach
      'space-before-function-paren': ['error', {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always',
      }],
      // Wymuszaj spójne spacje w operatorach
      'space-infix-ops': 'error',
      'space-unary-ops': ['error', {
        'words': true,
        'nonwords': false,
      }],
      // Wymuszaj spójne przecinki
      'comma-dangle': ['error', 'always-multiline'],
      // Wymuszaj spójne spacje w blokach
      'block-spacing': ['error', 'always'],
      // Wymuszaj spójne spacje w kluczach obiektów
      'key-spacing': ['error', {
        'beforeColon': false,
        'afterColon': true,
      }],

      // ============================================
      // BIAŁE ZNAKI I PUSTE LINIE
      // ============================================
      // Zabroń trailing whitespace (spacje na końcu linii)
      'no-trailing-spaces': ['error', {
        'skipBlankLines': false,
        'ignoreComments': false,
      }],
      // Zabroń multiple blank lines (zbyt wielu pustych linii)
      'no-multiple-empty-lines': ['error', {
        'max': 2, // Maksymalnie 2 puste linie pod rząd
        'maxEOF': 0, // Brak pustych linii na końcu pliku (spójne z eol-last: never)
        'maxBOF': 0, // Brak pustych linii na początku pliku
      }],
      // Zabroń whitespace na początku linii (indent jest obsługiwany przez indent rule)
      'no-irregular-whitespace': 'error',
      // Zabroń whitespace przed przecinkami
      'comma-spacing': ['error', {
        'before': false,
        'after': true,
      }],
      // Zabroń whitespace w nawiasach
      'space-in-parens': ['error', 'never'],
      // Zabroń whitespace w komentarzach - złagodzone dla kompatybilności z Next.js
      'spaced-comment': ['warn', 'always', {
        'line': {
          'markers': ['/'],
          'exceptions': ['-', '+', '='],
        },
        'block': {
          'markers': ['!'],
          'exceptions': ['*'],
          'balanced': true,
        },
      }],
      // Zabroń whitespace w template literals
      'template-curly-spacing': ['error', 'never'],
      // Zabroń whitespace w computed properties
      'computed-property-spacing': ['error', 'never'],

      // ============================================
      // WYKRYWANIE NIEUŻYWANEGO KODU
      // ============================================
      // Wykrywaj nieużywane wyrażenia
      // Wyłączamy dla React/Next.js, bo używają short-circuit (condition && <Component />)
      'no-unused-expressions': ['error', {
        'allowShortCircuit': true, // Pozwól na short-circuit dla React (condition && <Component />)
        'allowTernary': true, // Pozwól na ternary dla React
        'allowTaggedTemplates': false,
      }],

      // ============================================
      // TYPESCRIPT SPECIFIC
      // ============================================
      // Wymuszaj explicite typy dla funkcji publicznych
      '@typescript-eslint/explicit-function-return-type': 'off', // Może być zbyt restrykcyjne
      // Wymuszaj używanie interface zamiast type dla obiektów
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      // Zabroń używania any - wyłączamy, bo Next.js używa any w wielu miejscach
      '@typescript-eslint/no-explicit-any': 'off',

      // ============================================
      // REACT SPECIFIC
      // ============================================
      // Wymuszaj używanie funkcji strzałkowych dla komponentów - wyłączamy, bo Next.js używa function declarations
      'react/function-component-definition': 'off', // Wyłączamy dla kompatybilności z Next.js
      // Wyjątek dla komponentów React - pozwól na function declarations
      'func-style': 'off', // Wyłączamy dla komponentów React (obsługiwane przez osobny blok)
      // Wymuszaj używanie PascalCase dla komponentów
      'react/jsx-pascal-case': 'error',
      // Zabroń używania niebezpiecznych właściwości - wyłączamy, bo Next.js używa dangerouslySetInnerHTML
      'react/no-danger': 'off',
      // Wymuszaj używanie key w listach
      'react/jsx-key': 'error',
      // Wyłączamy react-hooks/set-state-in-effect dla Next.js (hydratacja stanu z localStorage jest akceptowalna)
      'react-hooks/set-state-in-effect': 'off',
      // Wyłączamy exhaustive-deps, bo dodanie zależności może spowodować nieskończone pętle
      'react-hooks/exhaustive-deps': 'off',

      // ============================================
      // NEXT.JS SPECIFIC
      // ============================================
      // Zabroń używania <img> - używaj Next.js Image
      '@next/next/no-img-element': 'error',
      // Wymuszaj używanie Link zamiast <a> dla wewnętrznych linków
      '@next/next/no-html-link-for-pages': 'error',
    },
  },
  // Wyjątek dla komponentów React - pozwól na function declarations
  {
    files: ['**/components/**/*.tsx', '**/app/**/*.tsx', '**/pages/**/*.tsx'],
    rules: {
      // Pozwól na function declarations dla komponentów React/Next.js
      'func-style': 'off',
    },
  },
  // Dodatkowa konfiguracja dla plików testowych
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**/*.ts', '**/tests/**/*.tsx'],
    rules: {
      // Pozwól na console.log w testach
      'no-console': 'off',
      // Pozwól na any w testach
      '@typescript-eslint/no-explicit-any': 'off',
      // Pozwól na function declarations w testach (dla lepszej czytelności)
      'func-style': 'off',
    },
  },
]);

export default eslintConfig;
