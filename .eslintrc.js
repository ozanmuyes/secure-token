// https://eslint.org/docs/user-guide/configuring

module.exports = {
  root: true,
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'script',
  },
  env: {
    node: true,
    es6: true,
    mocha: true,
  },
  extends: 'airbnb-base',
  plugins: [
    'mocha',
  ],
  rules: {
    // 'no-param-reassign': 1,
    'prefer-destructuring': ['error', {
      'AssignmentExpression': {
        array: false,
        object: true,
      },
    }],
    'no-use-before-define': ['error', { functions: false, classes: true, variables: true }],
    'max-len': ['error', 100, 2, {
      ignoreUrls: true,
      ignoreComments: true,
      ignoreRegExpLiterals: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
    }],
    strict: ['error', 'global'],
  },
  overrides: [
    {
      files: ['examples/**/*.js'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
      },
    },
    {
      files: ['test/**/*.js'],
      rules: {
        // See https://github.com/lo1tuma/eslint-plugin-mocha/tree/master/docs/rules

        'prefer-arrow-callback': 'off',
        'mocha/no-mocha-arrows': 'error',

        'space-before-function-paren': 'off',
        'func-names': 'off',
        'max-nested-callbacks': ['error', 5],

        // See https://github.com/ihordiachenko/eslint-plugin-chai-friendly#usage
        'no-unused-expressions': 'off',
        // 'chai-friendly/no-unused-expressions': 'error',
      },
    },
  ],
};
