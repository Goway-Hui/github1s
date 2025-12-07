import { defineConfig, normalizePath, Plugin } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';
import * as packUtils from './scripts/webpack.js';

const commitId = (function () {
	try {
		return cp.execSync('git rev-parse HEAD', { timeout: 2000 }).toString().trim();
	} catch (e) {
		return Date.now().toString(16);
	}
})();

const staticDir = `static-${commitId.padStart(7, '0').slice(0, 7)}`;
const vscodeWebPath = path.join(__dirname, 'node_modules/@github1s/vscode-web');
const devVscode = !!process.env.DEV_VSCODE;

// Function to minify CSS (simple version for Vite config)
const minifyCSS = (code: string) => {
	return code.replace(/\s+/g, ' ');
};

// Function to minify JS (simple version)
const minifyJS = (code: string) => {
	return code;
};

const availableLanguages = devVscode ? [] : fs.readdirSync(path.join(vscodeWebPath, 'nls'));

const spinnerStyle = minifyCSS(fs.readFileSync('./public/spinner.css').toString());
const pageTitleScript = minifyJS(fs.readFileSync('./public/page-title.js').toString());
const globalScript = minifyJS(packUtils.createGlobalScript(staticDir, devVscode));

// Custom plugin to handle EJS-like replacements and entry injection
const ejsReplacementPlugin = (): Plugin => {
	return {
		name: 'ejs-replacement',
		transformIndexHtml: {
			order: 'pre',
			handler(html: string) {
				let newHtml = html
					.replace('<%= spinnerStyle %>', spinnerStyle)
					.replace('<%= pageTitleScript %>', pageTitleScript)
					.replace('<%= globalScript %>', globalScript);

				// Inject entry script if not present
				if (!newHtml.includes('/src/index.ts')) {
					newHtml = newHtml.replace('</body>', '<script type="module" src="/src/index.ts"></script></body>');
				}
				return newHtml;
			},
		},
	};
};

const fixIndexHtmlPlugin = (): Plugin => {
	return {
		name: 'fix-index-html',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url === '/') {
					req.url = '/public/index.html';
				}
				next();
			});
		},
		closeBundle() {
			const src = path.resolve(__dirname, 'dist/public/index.html');
			const dest = path.resolve(__dirname, 'dist/index.html');
			if (fs.existsSync(src)) {
				fs.moveSync(src, dest, { overwrite: true });
				const publicDir = path.dirname(src);
				if (fs.readdirSync(publicDir).length === 0) {
					fs.rmdirSync(publicDir);
				}
			}
		},
	};
};

export default defineConfig(({ mode }) => {
	const isDev = mode === 'development';

	return {
		root: __dirname,
		base: '/',
		resolve: {
			extensions: ['.js', '.ts', '.tsx', '.json'],
			alias: {
				// Add any necessary aliases here
			},
		},
		server: {
			port: 4000,
			host: '0.0.0.0',
			fs: {
				allow: ['..'],
			},
		},
		build: {
			outDir: 'dist',
			assetsDir: staticDir,
			rollupOptions: {
				input: {
					main: path.resolve(__dirname, 'public/index.html'),
				},
				output: {
					entryFileNames: `${staticDir}/[name].js`,
					chunkFileNames: `${staticDir}/[name]-[hash].js`,
					assetFileNames: `${staticDir}/[name]-[hash][extname]`,
				},
			},
		},
		define: {
			DEV_VSCODE: JSON.stringify(devVscode),
			GITHUB_ORIGIN: JSON.stringify(process.env.GITHUB_DOMAIN || 'https://github.com'),
			GITLAB_ORIGIN: JSON.stringify(process.env.GITLAB_DOMAIN || 'https://gitlab.com'),
			GITHUB1S_EXTENSIONS: JSON.stringify(packUtils.getBuiltinExtensions(devVscode)),
			AVAILABLE_LANGUAGES: JSON.stringify(availableLanguages),
			process: JSON.stringify({
				env: {
					NODE_ENV: mode,
				},
				platform: 'browser',
			}),
		},
		plugins: [
			ejsReplacementPlugin(),
			fixIndexHtmlPlugin(),
			viteStaticCopy({
				targets: [
					{ src: 'extensions', dest: `${staticDir}` },
					{ src: 'resources', dest: `${staticDir}` },
					{ src: normalizePath(path.join(vscodeWebPath, 'vscode')), dest: `${staticDir}` },
					{ src: normalizePath(path.join(vscodeWebPath, 'extensions')), dest: `${staticDir}` },
					{ src: normalizePath(path.join(vscodeWebPath, 'dependencies')), dest: `${staticDir}` },
					{ src: normalizePath(path.join(vscodeWebPath, 'nls')), dest: `${staticDir}` },
					{ src: 'public/favicon*', dest: '' },
					{ src: 'public/manifest.json', dest: '' },
					{ src: 'public/robots.txt', dest: '' },
				].filter(Boolean),
			}),
		],
	};
});
