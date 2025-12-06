/**
 * @file GitCode router parser
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import { joinPath } from '@/helpers/util';
import * as adapterTypes from '../types';
import { parseGitCodePath } from './parse-path';

const GITCODE_ORIGIN = 'https://gitcode.com';

export class GitCode1sRouterParser extends adapterTypes.RouterParser {
	protected static instance: GitCode1sRouterParser | null = null;

	public static getInstance(): GitCode1sRouterParser {
		if (GitCode1sRouterParser.instance) {
			return GitCode1sRouterParser.instance;
		}
		return (GitCode1sRouterParser.instance = new GitCode1sRouterParser());
	}

	parsePath(path: string): Promise<adapterTypes.RouterState> {
		return parseGitCodePath(path);
	}

	buildTreePath(repo: string, ref?: string, filePath?: string): string {
		return ref ? (filePath ? `/${repo}/tree/${ref}/${filePath}` : `/${repo}/tree/${ref}`) : `/${repo}`;
	}

	buildBlobPath(repo: string, ref: string, filePath: string, startLine?: number, endLine?: number): string {
		const hash = startLine ? (endLine ? `#L${startLine}-L${endLine}` : `#L${startLine}`) : '';
		return `/${repo}/blob/${ref}/${filePath}${hash}`;
	}

	buildCommitListPath(repo: string): string {
		return `/${repo}/commits`;
	}

	buildCommitPath(repo: string, commitSha: string): string {
		return `/${repo}/commit/${commitSha}`;
	}

	buildCodeReviewListPath(repo: string): string {
		return `/${repo}/pulls`;
	}

	buildCodeReviewPath(repo: string, codeReviewId: string): string {
		return `/${repo}/pull/${codeReviewId}`;
	}

	buildExternalLink(path: string): string {
		return joinPath(GITCODE_ORIGIN, path);
	}
}
