/**
 * @file GitCode api auth token manager
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import * as vscode from 'vscode';
import { getExtensionContext } from '@/helpers/context';

export interface ValidateResult {
	username: string;
	avatar_url: string;
	profile_url: string;
	ratelimits?: {
		limit?: number;
		remaining?: number;
		reset?: number;
		resource?: number;
		used?: number;
	};
}

const GITCODE_API_PREFIX = 'https://api.gitcode.com/api/v5';

export class GitCodeTokenManager {
	protected static instance: GitCodeTokenManager | null = null;
	private _emitter = new vscode.EventEmitter<string>();
	public onDidChangeToken = this._emitter.event;
	public tokenStateKey = 'gitcode-oauth-token';

	protected constructor() {}
	public static getInstance(): GitCodeTokenManager {
		if (GitCodeTokenManager.instance) {
			return GitCodeTokenManager.instance;
		}
		return (GitCodeTokenManager.instance = new this());
	}

	public getToken(): string {
		return getExtensionContext().globalState.get(this.tokenStateKey) || '';
	}

	public async setToken(token: string) {
		const isTokenChanged = this.getToken() !== token;
		return getExtensionContext()
			.globalState.update(this.tokenStateKey, token)
			.then(() => isTokenChanged && this._emitter.fire(token));
	}

	public async validateToken(token?: string): Promise<ValidateResult | null> {
		const accessToken = token === undefined ? this.getToken() : token;
		if (!accessToken) {
			return Promise.resolve(null);
		}
		const fetchOptions = accessToken ? { headers: { Authorization: `token ${accessToken}` } } : {};
		return fetch(`${GITCODE_API_PREFIX}/user`, fetchOptions)
			.then((response) => {
				if (response.status === 401) {
					return null;
				}
				return response.json().then((data) => ({
					username: data.login || data.username,
					avatar_url: data.avatar_url,
					profile_url: data.html_url,
					// GitCode rate limit headers might differ, adjust if known
					// For now assume similar to GitHub or just omit if not available
				}));
			})
			.catch(() => null);
	}
}
