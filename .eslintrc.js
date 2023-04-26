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

    }
};