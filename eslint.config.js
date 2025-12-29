import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        // App globals - used across files (read from other script tags in browser)
        Milestones: 'readonly',
        Calculator: 'readonly',
        Nerdiversary: 'readonly',
        ICalGenerator: 'readonly',
      }
    },
    rules: {

      // Possible Errors
      'no-console': 'off',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-template-curly-in-string': 'error',
      'no-unreachable-loop': 'error',
      'no-use-before-define': ['error', { functions: false, classes: true }],

      // Best Practices
      'curly': ['error', 'all'],
      'default-case': 'error',
      'default-case-last': 'error',
      'dot-notation': 'error',
      'eqeqeq': ['error', 'always'],
      'no-alert': 'warn',
      'no-caller': 'error',
      'no-else-return': 'error',
      'no-empty-function': 'warn',
      'no-eval': 'error',
      'no-extend-native': 'error',
      'no-extra-bind': 'error',
      'no-floating-decimal': 'error',
      'no-implied-eval': 'error',
      'no-invalid-this': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',
      'no-lone-blocks': 'error',
      'no-loop-func': 'error',
      'no-multi-spaces': 'error',
      'no-new': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-octal-escape': 'error',
      'no-proto': 'error',
      'no-return-assign': 'error',
      'no-script-url': 'error',
      'no-self-compare': 'error',
      'no-sequences': 'error',
      'no-throw-literal': 'error',
      'no-unmodified-loop-condition': 'error',
      'no-unused-expressions': 'error',
      'no-useless-call': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'no-void': 'error',
      'prefer-promise-reject-errors': 'error',
      'radix': 'error',
      'require-await': 'error',
      'yoda': 'error',

      // Variables
      'no-shadow': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef-init': 'error',

      // Stylistic Issues
      'array-bracket-spacing': ['error', 'never'],
      'block-spacing': 'error',
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-dangle': ['error', 'only-multiline'],
      'comma-spacing': 'error',
      'comma-style': 'error',
      'computed-property-spacing': 'error',
      'func-call-spacing': 'error',
      'key-spacing': 'error',
      'keyword-spacing': 'error',
      'linebreak-style': ['error', 'unix'],
      'new-cap': 'error',
      'new-parens': 'error',
      'no-array-constructor': 'error',
      'no-lonely-if': 'error',
      'no-mixed-operators': ['warn', {
        groups: [
          ['&&', '||'],
          ['&', '|', '^', '~', '<<', '>>', '>>>'],
        ],
        allowSamePrecedence: true
      }],
      'no-multi-assign': 'error',
      'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1 }],
      'no-nested-ternary': 'error',
      'no-new-object': 'error',
      'no-tabs': 'error',
      'no-trailing-spaces': 'error',
      'no-unneeded-ternary': 'error',
      'no-whitespace-before-property': 'error',
      'object-curly-spacing': ['error', 'always'],
      'one-var': ['error', 'never'],
      'operator-linebreak': ['error', 'after', { overrides: { '?': 'before', ':': 'before' } }],
      'padded-blocks': ['error', 'never'],
      'prefer-object-spread': 'error',
      'quote-props': ['error', 'as-needed'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'semi-spacing': 'error',
      'semi-style': 'error',
      'space-before-blocks': 'error',
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      'space-in-parens': 'error',
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'spaced-comment': ['error', 'always'],
      'switch-colon-spacing': 'error',
      'template-tag-spacing': 'error',

      // ES6+
      'arrow-body-style': ['error', 'as-needed'],
      'arrow-parens': ['error', 'as-needed'],
      'arrow-spacing': 'error',
      'generator-star-spacing': ['error', 'after'],
      'no-confusing-arrow': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'prefer-destructuring': ['error', { array: false, object: true }],
      'prefer-numeric-literals': 'error',
      'prefer-rest-params': 'error',
      'prefer-spread': 'error',
      'prefer-template': 'error',
      'rest-spread-spacing': 'error',
      'symbol-description': 'error',
      'template-curly-spacing': 'error',
      'yield-star-spacing': 'error',
    }
  },
  {
    // Worker runs in Cloudflare Workers (similar to Node.js environment)
    files: ['worker/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
      }
    },
    rules: {
      // Allow underscore-prefixed unused variables (common pattern for unused callback params)
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    }
  },
  {
    // Test files - include browser globals for page.evaluate() callbacks
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
        ...globals.browser,
      }
    }
  },
  {
    // Playwright config
    files: ['playwright.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      }
    }
  },
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/']
  }
];
