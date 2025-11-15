module.exports = {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-standard-vue'
  ],
  customSyntax: 'postcss-html',
  overrides: [
    {
      files: ['**/*.scss'],
      customSyntax: 'postcss-scss'
    }
  ],
  rules: {
    'at-rule-no-unknown': null,
    'media-feature-name-value-no-unknown': null,
    'color-function-notation': 'legacy',
    'color-function-alias-notation': null,
    'alpha-value-notation': 'number',
    'selector-class-pattern': null,
    'declaration-property-value-no-unknown': null,
    'shorthand-property-no-redundant-values': null,
    'selector-not-notation': null,
    'selector-pseudo-class-no-unknown': null,
    'no-descending-specificity': null,
    'rule-empty-line-before': null,
    'value-keyword-case': null,
    'declaration-empty-line-before': null,
    'media-feature-range-notation': null,
    'at-rule-empty-line-before': null,
    'scss/no-global-function-names': null,
    'selector-no-vendor-prefix': null,
    'no-invalid-position-declaration': null,
    'comment-empty-line-before': null
  }
}
