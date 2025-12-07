#!/usr/bin/env node

import path from 'path';
import fs from 'fs-extra';
import cp from 'child_process';
import { executeCommand, PROJECT_ROOT } from './utils.js';

const main = () => {
	for (const extension of fs.readdirSync('extensions')) {
		const extensionPath = path.join(PROJECT_ROOT, 'extensions', extension);
		const packageJsonPath = path.join(extensionPath, 'package.json');

		if (fs.existsSync(packageJsonPath)) {
			const pkg = fs.readJsonSync(packageJsonPath);
			if (pkg.scripts && pkg.scripts['build:vite']) {
				executeCommand('npm', ['run', 'build:vite'], extensionPath);
			} else if (pkg.scripts && pkg.scripts['compile']) {
				executeCommand('npm', ['run', 'compile'], extensionPath);
			}
		}
	}
	executeCommand('npm', ['run', 'build:vite'], PROJECT_ROOT);
};

main();
