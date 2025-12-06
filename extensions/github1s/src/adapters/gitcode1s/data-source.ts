/**
 * @file GitCode data source
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import {
	DataSource,
	Directory,
	DirectoryEntry,
	File,
	FileType,
	Branch,
	Tag,
	Commit,
	CommonQueryOptions,
	TextSearchQuery,
	TextSearchResults,
	TextSearchOptions,
	CommitsQueryOptions,
	CodeReviewsQueryOptions,
	CodeReview,
	CodeReviewState,
	BlameRange,
	SymbolDefinitions,
	SymbolReferences,
	SymbolHover,
	ChangedFile,
} from '../types';
import { GitCodeFetcher } from './fetcher';
import { toUint8Array } from 'js-base64';

export class GitCode1sDataSource extends DataSource {
	private static instance: GitCode1sDataSource | null = null;

	public static getInstance(): GitCode1sDataSource {
		if (GitCode1sDataSource.instance) {
			return GitCode1sDataSource.instance;
		}
		return (GitCode1sDataSource.instance = new GitCode1sDataSource());
	}

	private parseRepoFullName(repoFullName: string) {
		const [owner, repo] = repoFullName.split('/');
		return { owner, repo };
	}

	async provideDirectory(
		repoFullName: string,
		ref: string,
		path: string,
		recursive = false,
	): Promise<Directory | null> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);

		// Use contents API which corresponds to GitHub's get-repository-content
		// This is more reliable than git/trees for browsing (non-recursive)
		// and avoids the 100-file limit of recursive tree fetching on GitCode.
		const apiPath = path ? `/repos/${owner}/${repo}/contents/${path}` : `/repos/${owner}/${repo}/contents`;
		const params = { ref };

		try {
			const response = await fetcher.request(apiPath, params);
			const data = response.data;

			if (!Array.isArray(data)) {
				// It's a file, not a directory
				return null;
			}

			const entries: DirectoryEntry[] = data.map((item: any) => {
				if (item.type === 'dir') {
					return {
						type: FileType.Directory,
						path: item.path,
					};
				}
				if (item.type === 'submodule') {
					return {
						type: FileType.Submodule,
						path: item.path,
						commitSha: item.sha,
					};
				}
				// Default to file (including symlink for now)
				return {
					type: FileType.File,
					path: item.path,
					size: item.size,
				};
			});

			return {
				entries,
				truncated: false,
			};
		} catch (e: any) {
			console.error('GitCode1sDataSource: provideDirectory error', e);
			return null;
		}
	}

	async provideFile(repoFullName: string, ref: string, path: string): Promise<File> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		const params = { owner, repo, path, ref };
		const response = await fetcher.request('/repos/:owner/:repo/contents/:path', params);
		return { content: toUint8Array(response.data.content) };
	}

	async provideBranches(repoFullName: string, options?: CommonQueryOptions): Promise<Branch[]> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);

		try {
			const response = await fetcher.request('/repos/:owner/:repo/branches', {
				owner,
				repo,
				page: options?.page,
				per_page: options?.pageSize,
			});

			return response.data.map((item: any) => ({
				name: item.name,
				commitSha: item.commit?.sha,
			}));
		} catch (e) {
			return [];
		}
	}

	async provideBranch(repoFullName: string, branchName: string): Promise<Branch | null> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		try {
			const response = await fetcher.request('/repos/:owner/:repo/branches/:branch', {
				owner,
				repo,
				branch: branchName,
			});
			return {
				name: response.data.name,
				commitSha: response.data.commit?.sha,
			};
		} catch (e) {
			return null;
		}
	}

	async provideTags(repoFullName: string, options?: CommonQueryOptions): Promise<Tag[]> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);

		try {
			const response = await fetcher.request('/repos/:owner/:repo/tags', {
				owner,
				repo,
				page: options?.page,
				per_page: options?.pageSize,
			});

			return response.data.map((item: any) => ({
				name: item.name,
				commitSha: item.commit?.sha,
			}));
		} catch (e) {
			return [];
		}
	}

	async provideTag(repoFullName: string, tagName: string): Promise<Tag | null> {
		// GitCode might not have a direct single tag endpoint, but we can try or filter.
		// Assuming /repos/:owner/:repo/tags/:tag exists or we fetch all and find.
		// For efficiency, let's assume we can't get single tag easily without list,
		// but maybe we can just return null to fallback to list?
		// Or we can try to fetch list and find.
		return null;
	}

	async getDefaultBranch(repoFullName: string): Promise<string> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);

		try {
			const response = await fetcher.request('/repos/:owner/:repo', {
				owner,
				repo,
			});
			return response.data.default_branch || 'master';
		} catch (e) {
			return 'master';
		}
	}

	async provideCommits(repoFullName: string, options?: CommitsQueryOptions): Promise<Commit[]> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		try {
			const response = await fetcher.request('/repos/:owner/:repo/commits', {
				owner,
				repo,
				sha: options?.from,
				path: options?.path,
				author: options?.author,
				page: options?.page,
				per_page: options?.pageSize,
			});
			return response.data.map((item: any) => ({
				sha: item.sha,
				author: item.commit?.author?.name,
				email: item.commit?.author?.email,
				message: item.commit?.message,
				committer: item.commit?.committer?.name,
				createTime: new Date(item.commit?.author?.date),
				parents: item.parents?.map((p: any) => p.sha) || [],
				avatarUrl: item.author?.avatar_url,
			}));
		} catch (e) {
			return [];
		}
	}

	async provideCommit(repoFullName: string, ref: string): Promise<(Commit & { files?: ChangedFile[] }) | null> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		try {
			const response = await fetcher.request('/repos/:owner/:repo/commits/:sha', {
				owner,
				repo,
				sha: ref,
			});
			const item = response.data;
			return {
				sha: item.sha,
				author: item.commit?.author?.name,
				email: item.commit?.author?.email,
				message: item.commit?.message,
				committer: item.commit?.committer?.name,
				createTime: new Date(item.commit?.author?.date),
				parents: item.parents?.map((p: any) => p.sha) || [],
				avatarUrl: item.author?.avatar_url,
				files: item.files?.map((file: any) => ({
					path: file.filename,
					status: file.status,
					previousPath: file.previous_filename,
				})),
			};
		} catch (e) {
			return null;
		}
	}

	async provideCommitChangedFiles(
		repoFullName: string,
		ref: string,
		options?: CommonQueryOptions,
	): Promise<ChangedFile[]> {
		const commit = await this.provideCommit(repoFullName, ref);
		return commit?.files || [];
	}

	// Helper to extract ref and path from a full path string
	async extractRefPath(repoFullName: string, path: string): Promise<{ ref: string; path: string }> {
		if (!path) {
			return { ref: await this.getDefaultBranch(repoFullName), path: '' };
		}

		const branches = await this.provideBranches(repoFullName, { pageSize: 100 });
		const tags = await this.provideTags(repoFullName, { pageSize: 100 });
		const refs = [...branches.map((b) => b.name), ...tags.map((t) => t.name)];

		const pathParts = path.split('/');
		for (let i = pathParts.length; i > 0; i--) {
			const possibleRef = pathParts.slice(0, i).join('/');
			if (refs.includes(possibleRef)) {
				return {
					ref: possibleRef,
					path: pathParts.slice(i).join('/'),
				};
			}
		}

		return { ref: await this.getDefaultBranch(repoFullName), path };
	}

	provideTextSearchResults(
		repo: string,
		ref: string,
		query: TextSearchQuery,
		options?: TextSearchOptions,
	): Promise<TextSearchResults> {
		return Promise.resolve({ results: [], truncated: false });
	}

	async provideCodeReviews(
		repoFullName: string,
		options?: CodeReviewsQueryOptions,
	): Promise<(CodeReview & { files?: ChangedFile[] })[]> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		try {
			const response = await fetcher.request('/repos/:owner/:repo/pulls', {
				owner,
				repo,
				state: options?.state ? options.state.toLowerCase() : 'open',
				page: options?.page,
				per_page: options?.pageSize,
			});
			return response.data.map((item: any) => ({
				id: item.number.toString(),
				title: item.title,
				state:
					item.state === 'open'
						? CodeReviewState.Open
						: item.merged_at
							? CodeReviewState.Merged
							: CodeReviewState.Closed,
				creator: item.user?.login,
				createTime: new Date(item.created_at),
				mergeTime: item.merged_at ? new Date(item.merged_at) : null,
				closeTime: item.closed_at ? new Date(item.closed_at) : null,
				source: item.head.ref,
				target: item.base.ref,
				sourceSha: item.head.sha,
				targetSha: item.base.sha,
				avatarUrl: item.user?.avatar_url,
			}));
		} catch (e) {
			return [];
		}
	}

	async provideCodeReview(
		repoFullName: string,
		id: string,
	): Promise<(CodeReview & { sourceSha: string; targetSha: string; files?: ChangedFile[] }) | null> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		try {
			const response = await fetcher.request('/repos/:owner/:repo/pulls/:number', {
				owner,
				repo,
				number: id,
			});
			const item = response.data;
			return {
				id: item.number.toString(),
				title: item.title,
				state:
					item.state === 'open'
						? CodeReviewState.Open
						: item.merged_at
							? CodeReviewState.Merged
							: CodeReviewState.Closed,
				creator: item.user?.login,
				createTime: new Date(item.created_at),
				mergeTime: item.merged_at ? new Date(item.merged_at) : null,
				closeTime: item.closed_at ? new Date(item.closed_at) : null,
				source: item.head.ref,
				target: item.base.ref,
				sourceSha: item.head.sha,
				targetSha: item.base.sha,
				avatarUrl: item.user?.avatar_url,
			};
		} catch (e) {
			return null;
		}
	}

	async provideCodeReviewChangedFiles(
		repoFullName: string,
		id: string,
		options?: CommonQueryOptions,
	): Promise<ChangedFile[]> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);
		try {
			const response = await fetcher.request('/repos/:owner/:repo/pulls/:number/files', {
				owner,
				repo,
				number: id,
			});
			return response.data.map((file: any) => ({
				path: file.filename,
				status: file.status,
				previousPath: file.previous_filename,
			}));
		} catch (e) {
			return [];
		}
	}

	provideFileBlameRanges(repo: string, ref: string, path: string): Promise<BlameRange[]> {
		return Promise.resolve([]);
	}
	provideSymbolDefinitions(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolDefinitions> {
		return Promise.resolve([]);
	}
	provideSymbolReferences(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolReferences> {
		return Promise.resolve([]);
	}
	provideSymbolHover(
		repo: string,
		ref: string,
		path: string,
		line: number,
		character: number,
		symbol: string,
	): Promise<SymbolHover | null> {
		return Promise.resolve(null);
	}
	provideUserAvatarLink(user: string): string {
		return `https://gitcode.com/${user}.png`; // Best effort guess
	}
}
