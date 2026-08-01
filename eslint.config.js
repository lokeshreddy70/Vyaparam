const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = [
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"**/.turbo/**",
			"**/*.d.ts",
			"logs/**",
			"temp/**",
		],
		linterOptions: {
			reportUnusedDisableDirectives: false,
		},
	},
	{
		files: ["backend/src/**/*.{ts,tsx}", "backend/api/**/*.ts", "frontend/src/**/*.{ts,tsx}"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {},
	},
];
