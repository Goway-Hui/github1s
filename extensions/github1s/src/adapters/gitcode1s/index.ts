/**
 * @file GitCode adapter
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import * as vscode from 'vscode';
import { setVSCodeContext } from '@/helpers/vscode';
import { Adapter, CodeReviewType, PlatformName } from '../types';
import { GitCode1sDataSource } from './data-source';
import { GitCode1sRouterParser } from './router-parser';
import { GitCode1sAuthenticationView } from './authentication';

export class GitCode1sAdapter implements Adapter {
	public scheme: string = 'gitcode1s';
	public platformName = PlatformName.GitCode;
	public codeReviewType = CodeReviewType.PullRequest;

	resolveDataSource() {
		return Promise.resolve(GitCode1sDataSource.getInstance());
	}

	resolveRouterParser() {
		return Promise.resolve(GitCode1sRouterParser.getInstance());
	}

	activateAsDefault() {
		setVSCodeContext('github1s:views:settings:visible', true);
		setVSCodeContext('github1s:views:codeReviewList:visible', true);
		setVSCodeContext('github1s:views:commitList:visible', true);
		setVSCodeContext('github1s:views:fileHistory:visible', true);
		setVSCodeContext('github1s:features:gutterBlame:enabled', true);

		vscode.commands.registerCommand('github1s.commands.openGitCode1sAuthPage', () => {
			return GitCode1sAuthenticationView.getInstance().open();
		});
	}

	deactivateAsDefault() {
		setVSCodeContext('github1s:views:settings:visible', false);
		setVSCodeContext('github1s:views:codeReviewList:visible', false);
		setVSCodeContext('github1s:views:commitList:visible', false);
		setVSCodeContext('github1s:views:fileHistory:visible', false);
		setVSCodeContext('github1s:features:gutterBlame:enabled', false);
	}
}
