/**
 * @file parse GitCode path
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import * as vscode from 'vscode';
import { parsePath } from 'history';
import { PageType, RouterState } from '../types';
import { GitCode1sDataSource } from './data-source';
import { memorize } from '@/helpers/func';
import { getBrowserUrl } from '@/helpers/context';

export const DEFAULT_REPO = 'gitcode/gitcode'; // Just a placeholder

export const getCurrentRepo = memorize(() => {
	return getBrowserUrl().then((browserUrl: string) => {
		const pathParts = vscode.Uri.parse(browserUrl).path.split('/').filter(Boolean);
		return pathParts.length >= 2 ? (pathParts.slice(0, 2) as [string, string]).join('/') : DEFAULT_REPO;
	});
});

export const getDefaultBranch = async (repo: string): Promise<string> => {
	const dataSource = GitCode1sDataSource.getInstance();
	return dataSource.getDefaultBranch(repo);
};

const parseTreeUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...restParts] = pathParts;
	const repoFullName = `${owner}/${repo}`;
	const dataSource = GitCode1sDataSource.getInstance();
	const { ref, path: filePath } = await dataSource.extractRefPath(repoFullName, restParts.join('/'));

	return { pageType: PageType.Tree, repo: repoFullName, ref, filePath };
};

const parseBlobUrl = async (path: string): Promise<RouterState> => {
	const routerState = (await parseTreeUrl(path)) as any;
	const { hash: routerHash } = parsePath(path);

	if (!routerHash) {
		return { ...routerState, pageType: PageType.Blob };
	}

	const matches = routerHash.match(/^#L(\d+)(?:-L(\d+))?/);
	const [_, startLineNumber = '0', endLineNumber] = matches ? matches : [];

	return {
		...routerState,
		pageType: PageType.Blob,
		startLine: parseInt(startLineNumber, 10),
		endLine: parseInt(endLineNumber || startLineNumber, 10),
	};
};

const parseCommitsUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...refParts] = pathParts;

	return {
		repo: `${owner}/${repo}`,
		pageType: PageType.CommitList,
		ref: refParts.length ? refParts.join('/') : await getDefaultBranch(`${owner}/${repo}`),
	};
};

const parseCommitUrl = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, _pageType, ...refParts] = pathParts;
	const commitSha = refParts.join('/');

	return { repo: `${owner}/${repo}`, pageType: PageType.Commit, ref: commitSha, commitSha };
};

export const parseGitCodePath = async (path: string): Promise<RouterState> => {
	const pathParts = parsePath(path).pathname!.split('/').filter(Boolean);
	const [owner, repo, pageType] = pathParts;

	if (!owner || !repo) {
		return { repo: DEFAULT_REPO, ref: 'HEAD', pageType: PageType.Tree, filePath: '' };
	}

	if (!pageType || pageType === 'tree') {
		return parseTreeUrl(path);
	}

	if (pageType === 'blob') {
		return parseBlobUrl(path);
	}

	if (pageType === 'commits') {
		return parseCommitsUrl(path);
	}

	if (pageType === 'commit') {
		return parseCommitUrl(path);
	}

	// Default to tree
	return parseTreeUrl(path);
};
