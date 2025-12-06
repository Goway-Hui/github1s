/**
 * @file GitCode adapter
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import { Adapter, CodeReviewType, PlatformName } from '../types';
import { GitCode1sDataSource } from './data-source';
import { GitCode1sRouterParser } from './router-parser';

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
}
