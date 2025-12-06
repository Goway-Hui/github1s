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

		const params: any = {
			owner,
			repo,
			sha: ref,
			recursive: recursive ? 1 : 0,
		};

		if (path) {
			// If path is provided, we might need to traverse the tree or find the sha for the path first if API doesn't support filtering tree by path directly on root.
			// But GitHub API supports recursive tree, so maybe GitCode does too.
			// However, if we want a subtree, we usually get the tree sha for that path.
			// For now, let's assume we get the full tree or the tree for the ref.
			// If GitCode supports file_path in tree api, use it.
			// Otherwise we might need to implement manual traversal or just rely on recursive=1 and filter client side (inefficient).
			// Let's assume recursive=1 and filter if path is not empty?
			// Or maybe GitCode has a way to get tree for a path.
			// Let's try to use the tree API with the sha of the directory if we can find it.
			// But we don't have it easily.
			// Let's stick to what we wrote before:
			// params.file_path = path;
			// (Checking previous file content, I added file_path to params. I will keep it.)
			params.file_path = path;
		}

		try {
			const response = await fetcher.request('/repos/:owner/:repo/git/trees/:sha', params);
			const tree = response.data.tree;

			if (!tree) {
				console.warn('GitCode1sDataSource: No tree found in response', response.data);
				return null;
			}

			const entries: DirectoryEntry[] = tree.map((item: any) => {
				return {
					type: item.type === 'tree' ? FileType.Directory : FileType.File,
					path: item.path,
					size: item.size,
				};
			});

			return {
				entries,
				truncated: response.data.truncated || false,
			};
		} catch (e) {
			console.error('GitCode1sDataSource: provideDirectory error', e);
			return null;
		}
	}

	async provideFile(repoFullName: string, ref: string, path: string): Promise<File | null> {
		const fetcher = GitCodeFetcher.getInstance();
		const { owner, repo } = this.parseRepoFullName(repoFullName);

		try {
			const response = await fetcher.request('/repos/:owner/:repo/raw/:path', {
				owner,
				repo,
				path,
				ref,
				format: 'text',
			});

			return {
				content: toUint8Array(response.data),
			};
		} catch (e) {
			return null;
		}
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

	async provideCommit(repoFullName: string, ref: string): Promise<Commit | null> {
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
			};
		} catch (e) {
			return null;
		}
	}

	// Helper to extract ref and path from a full path string
	async extractRefPath(repoFullName: string, path: string): Promise<{ ref: string; path: string }> {
		if (!path) {
			return { ref: await this.getDefaultBranch(repoFullName), path: '' };
		}

		const branches = await this.provideBranches(repoFullName);
		const tags = await this.provideTags(repoFullName);
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

	// Stubs for other methods
	provideTextSearchResults(
		repo: string,
		ref: string,
		query: TextSearchQuery,
		options?: TextSearchOptions,
	): Promise<TextSearchResults> {
		return Promise.resolve({ results: [], truncated: false });
	}
	provideCodeReviews(
		repo: string,
		options?: CodeReviewsQueryOptions,
	): Promise<(CodeReview & { files?: ChangedFile[] })[]> {
		return Promise.resolve([]);
	}
	provideCodeReview(
		repo: string,
		id: string,
	): Promise<(CodeReview & { sourceSha: string; targetSha: string; files?: ChangedFile[] }) | null> {
		return Promise.resolve(null);
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
		return '';
	}
}
