/**
 * @file GitCode api fetcher
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import * as vscode from 'vscode';
import { reuseable } from '@/helpers/func';
import { GitCodeTokenManager } from './token';
import { GitCode1sAuthenticationView } from './authentication';

const GITCODE_API_PREFIX = 'https://api.gitcode.com/api/v5';

export class GitCodeFetcher {
	private static instance: GitCodeFetcher | null = null;

	public static getInstance(): GitCodeFetcher {
		if (GitCodeFetcher.instance) {
			return GitCodeFetcher.instance;
		}
		return (GitCodeFetcher.instance = new GitCodeFetcher());
	}

	private constructor() {
		// Re-init fetcher when token changes if needed, but here we just read token on each request
	}

	private _request = reuseable(
		(
			command: string,
			params: Record<string, string | number | boolean | undefined>,
			method: string = 'GET',
		): Promise<{ status: number; data: any; headers: Headers }> => {
			let path = command;
			const queryParams: string[] = [];
			Object.keys(params).forEach((el) => {
				if (path.includes(`:${el}`)) {
					path = path.replace(`:${el}`, `${encodeURIComponent(params[el] || '')}`);
				} else if (params[el] !== undefined) {
					queryParams.push(`${el}=${encodeURIComponent(params[el]!)}`);
				}
			});

			if (queryParams.length > 0) {
				path += (path.includes('?') ? '&' : '?') + queryParams.join('&');
			}

			const accessToken = GitCodeTokenManager.getInstance().getToken();

			return fetch(GITCODE_API_PREFIX + path, {
				method,
				headers: {
					Accept: params.format === 'text' ? 'text/plain' : 'application/json',
					...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
				},
			}).then(async (response: Response & { data: any }) => {
				if (params.format === 'text') {
					response.data = await response.text();
				} else if (params.format === 'blob') {
					response.data = await response.blob();
				} else {
					response.data = await response.json();
				}
				return response.ok ? response : Promise.reject({ response });
			});
		},
	);

	public request = (
		command: string,
		params: Record<string, string | number | boolean | undefined> = {},
		method: string = 'GET',
	) => {
		return this._request(command, params, method).catch(async (error: { response: any }) => {
			if (error.response?.status === 401 || error.response?.status === 403) {
				await GitCode1sAuthenticationView.getInstance().open('Authentication required or rate limit exceeded', true);
				return this._request(command, params, method);
			}
			console.error('GitCode API Error:', error);
			throw error;
		});
	};
}
