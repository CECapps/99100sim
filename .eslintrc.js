module.exports = {
    "env": {
        "browser": true,
        "es2022": true,
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            4,
            { "SwitchCase": 1 }
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-unused-vars": [
            "warn",
            "local"
        ],
        "no-undef": [
            "warn"
        ],

        "array-callback-return": [
            "error"
        ],
        "no-constant-binary-expression": [
            "warn"
        ],
        "no-constant-condition": [
            "warn",
            { "checkLoops": false }
        ],
        "no-self-compare": [
            "warn"
        ],
        "no-template-curly-in-string": [
            "error"
        ],
        "no-unmodified-loop-condition": [
            "warn"
        ],
        "no-unreachable": [
            "warn"
        ],

        "arrow-body-style": [
            "error",
            "always"
        ],
        "block-scoped-var": [
            "warn"
        ],
        "curly": [
            "warn",
            "all"
        ],
        "default-case": [
            "error"
        ],
        "default-case-last": [
            "error"
        ],
        "default-param-last": [
            "error"
        ],
        "grouped-accessor-pairs": [
            "warn",
            "getBeforeSet"
        ],
        "id-denylist": [
            "warn"
        ],
        "no-array-constructor": [
            "warn"
        ],
        "no-caller": [
            "error"
        ],
        "no-confusing-arrow": [
            "error"
        ],
        "no-div-regex": [
            "warn"
        ],
        "no-eq-null": [
            "warn"
        ],
        "no-extra-bind": [
            "warn"
        ],
        "no-floating-decimal": [
            "warn"
        ],
        "no-invalid-this": [
            "error"
        ],
        "no-label-var": [
            "error"
        ],
        "no-loop-func": [
            "warn"
        ],
        "no-mixed-operators": [
            "error"
        ],
        "no-multi-assign": [
            "error"
        ],
        "no-multi-str": [
            "error"
        ],
        "no-octal-escape": [
            "error"
        ],
        "no-return-assign": [
            "warn"
        ],
        "no-sequences": [
            "warn"
        ],
        "no-shadow": [
            "warn"
        ],
        "no-unneeded-ternary": [
            "warn"
        ],
        "no-useless-call": [
            "warn"
        ],
        "no-useless-concat": [
            "warn"
        ],
        "prefer-const": [
            "warn"
        ],
        "prefer-exponentiation-operator": [
            "warn"
        ],
        "prefer-object-has-own": [
            "error"
        ],
        "prefer-template": [
            "warn"
        ],
        "radix": [
            "error"
        ],

        "array-bracket-newline": [
            "error",
            "consistent"
        ],
        "array-bracket-spacing": [
            "error",
            "never",
            { "arraysInArrays": true, "objectsInArrays": true }
        ],
        "array-element-newline": [
            "error",
            "consistent"
        ],
        "arrow-parens": [
            "error"
        ],
        "arrow-spacing": [
            "error"
        ],
        "block-spacing": [
            "error"
        ],
        "brace-style": [
            "error",
            "1tbs",
            { "allowSingleLine": true }
        ],
        "comma-spacing": [
            "error",
            { "before": false, "after": true }
        ],
        "dot-location": [
            "error",
            "property"
        ],
        "eol-last": [
            "error"
        ],
        "func-call-spacing": [
            "error"
        ],
        "function-call-argument-newline": [
            "error",
            "consistent"
        ],
        "function-paren-newline": [
            "error",
            "consistent"
        ],
        "implicit-arrow-linebreak": [
            "error",
            "beside"
        ],
        "keyword-spacing": [
            "error",
            { "before": true, "after": true }
        ],
        "lines-between-class-members": [
            "error",
            "always",
            { "exceptAfterSingleLine": true }
        ],
        "max-len": [
            "error",
            {
                "code": 120,
                "ignoreComments": true,
                "ignoreUrls": true,
                "ignoreStrings": true,
                "ignoreTemplateLiterals": true,
                "ignoreRegExpLiterals": true
            }
        ],
        "multiline-ternary": [
            "error",
            "always-multiline"
        ],
        "no-multiple-empty-lines": [
            "error"
        ],
        "no-tabs": [
            "error"
        ],
        "no-whitespace-before-property": [
            "error"
        ],
        "object-curly-newline": [
            "error",
            { "consistent": true }
        ],
        "object-curly-spacing": [
            "error",
            "always",
            { "arraysInObjects": true, "objectsInObjects": true }
        ],
        "operator-linebreak": [
            "error",
            "before"
        ],
        "space-infix-ops": [
            "error"
        ],
        "space-unary-ops": [
            "error"
        ],
        "wrap-iife": [
            "error",
            "inside"
        ],
        "wrap-regex": [
            "error"
        ]

        /**
        @TODO evaluate these:
            https://eslint.org/docs/latest/rules/no-else-return
            https://eslint.org/docs/latest/rules/no-lonely-if
            https://eslint.org/docs/latest/rules/key-spacing
            https://eslint.org/docs/latest/rules/no-extra-parens
            https://eslint.org/docs/latest/rules/no-multi-spaces
            https://eslint.org/docs/latest/rules/space-before-function-paren
            https://eslint.org/docs/latest/rules/space-in-parens
        */

    }
};
