import eslintJs from "@eslint/js";
import eslintReact from "@eslint-react/eslint-plugin";
import vitest from "@vitest/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { importX } from "eslint-plugin-import-x";
import jsxA11yX from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
    globalIgnores([".venv/", "dist/", "build/"]),
    {
        extends: [
            eslintJs.configs.recommended,
            importX.flatConfigs.recommended,
            tseslint.configs.recommendedTypeChecked,
            tseslint.configs.stylisticTypeChecked,
            reactHooks.configs.flat.recommended,
            eslintReact.configs["recommended-typescript"],
            jsxA11yX.configs.recommended,
	        vitest.configs.recommended,
            prettier,
        ],

        languageOptions: {
            globals: globals.browser,
            parserOptions: {
                projectService: true,
            },
        },

        settings: {
            "import-x/resolver-next": [createTypeScriptImportResolver()],
        },

        files: ["src/**/*.{js,jsx,ts,tsx}"],

        rules: {
            //
            // Additional Warnings
            //

            // Enable import warnings.
            "sort-imports": ["warn", { ignoreDeclarationSort: true }],
            "import-x/extensions": ["warn", "never"],
            "import-x/first": "warn",
            "import-x/no-mutable-exports": "error",
            "import-x/no-absolute-path": "error",
            "import-x/no-self-import": "error",
            "import-x/no-useless-path-segments": "warn",
            "import-x/order": [
                "warn",
                {
                    groups: ["external", "internal", "parent", "sibling"],
            
                    alphabetize: {
                        order: "asc",
                    },
            
                    "newlines-between": "always",
                },
            ],
            // Disallow alert() and console.*().
            "no-alert": "error",
            "no-console": [
                "error",
                { allow: ["debug", "warn", "error", "trace"] },
            ],

	    //
            // Configure Warnings
            //

            // x || y is often used to have a default for empty strings
            "@typescript-eslint/prefer-nullish-coalescing": ["error", {
                "ignorePrimitives": { string: true }
            }],

            "jsx-a11y-x/label-has-associated-control": ["warn", {
                "controlComponents": [],
            }],

            //
            // Disable Warnings
            //

            // Sometimes it is necessary to override the type checker.
            // This is itself a hint that things need to be improved.
            "@typescript-eslint/ban-ts-comment": "off",
            // We're sometimes using "type" instead of "interface" for
            // consistency reason, even in cases where it's not strictly
            // necessary.
            "@typescript-eslint/consistent-type-definitions": "off",
            // Extending an empty interface can be useful to define an alias.
            "@typescript-eslint/no-empty-object-type": [
                "warn",
                { allowInterfaces: "with-single-extends" },
            ],
            // Allow passing async functions to React component callbacks.
            "@typescript-eslint/no-misused-promises": [
                "error",
                { checksVoidReturn: { attributes: false, properties: false } },
            ],
            // Blanket ban is nonsense.
            "jsx-a11y-x/no-autofocus": "off",
        },
    },
]);
