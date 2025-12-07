import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
		},
	},
	build: {
		// Output to dist folder
		outDir: 'dist',
		lib: {
			entry: path.resolve(__dirname, 'src/extension.ts'),
			name: 'extension',
			fileName: () => 'extension.js',
			formats: ['cjs'],
		},
		rollupOptions: {
			// Externalize vscode as it is provided by the host
			external: ['vscode'],
			output: {
				// Ensure we don't get a default export wrapper if not needed
				interop: 'auto',
			},
		},
		sourcemap: true,
		// Minify can be turned on for production
		minify: false,
		target: 'es2020',
	},
	define: {
		// Define global variables that were defined in Webpack
		GITHUB_ORIGIN: JSON.stringify(process.env.GITHUB_DOMAIN || 'https://github.com'),
		GITHUB_API_PREFIX: JSON.stringify(process.env.GITHUB_API_PREFIX || 'https://api.github.com'),
		GITLAB_ORIGIN: JSON.stringify(process.env.GITLAB_DOMAIN || 'https://gitlab.com'),
		GITLAB_API_PREFIX: JSON.stringify(process.env.GITLAB_API_PREFIX || 'https://gitlab.com/api/v4'),
	},
	plugins: [
		nodePolyfills({
			// Polyfill process and other node globals
			protocolImports: true,
		}),
	],
});
