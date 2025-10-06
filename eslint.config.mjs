import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  js.configs.recommended,
  prettier,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  {
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
  },
  reactHooks.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },

      ecmaVersion: 2024,
      sourceType: "script",

      parserOptions: {
        project: "./tsconfig.json",
      },
    },

    files: ["src/**/*.{js,jsx,ts,tsx}"],

    rules: {
      "import/first": "error",
      "import/newline-after-import": "warn",
      "import/no-useless-path-segments": "error",
      "import/order": [
        "warn",
        {
          alphabetize: {
            order: "asc",
          },

          "newlines-between": "always",
        },
      ],
    },
  },
]);
