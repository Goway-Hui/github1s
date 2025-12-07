import path from 'path';
import cp from 'child_process';
import os from 'os';

export const PROJECT_ROOT = path.join(import.meta.dirname, '..');

export const executeCommand = (command, args, cwd) => {
	const result = cp.spawnSync(command, args, { stdio: 'inherit', cwd, shell: os.platform() === 'win32' });
	if (result.error) {
		throw result.error;
	}
	if (result.status !== 0) {
		process.exit(result.status);
	}
};
