/**
 * @file GitCode authentication page
 * @author GuoJiaHui
 * @date 2025-12-06
 */

import * as vscode from 'vscode';
import { Barrier } from '@/helpers/async';
import { getExtensionContext } from '@/helpers/context';
import { createPageHtml, getWebviewOptions } from '@/helpers/page';
import { GitCodeTokenManager } from './token';

export class GitCode1sAuthenticationView {
	protected static instance: GitCode1sAuthenticationView | null = null;
	public static viewType = 'github1s.views.gitcode1s-authentication';
	protected tokenManager = GitCodeTokenManager.getInstance();
	private webviewPanel: vscode.WebviewPanel | null = null;
	// using for waiting token
	private tokenBarrier: Barrier | null = null;
	// using for displaying open page reason
	private notice: string = '';

	protected pageTitle = 'Authenticating to GitCode';
	protected OAuthCommand = 'github1s.commands.vscode.connectToGitCode'; // This command needs to be registered if we support OAuth, or we just support manual token
	protected pageConfig: Record<string, unknown> = {
		authenticationFormTitle: 'Authenticating to GitCode',
		OAuthButtonText: 'Connect to GitCode',
		OAuthButtonLogo: 'assets/pages/assets/gitcode.svg', // We might need a logo or reuse generic
		createTokenLink: `https://gitcode.com/settings/tokens/new`, // Check actual URL
		rateLimitDocLink: 'https://docs.gitcode.com/api/rate_limits', // Check actual URL
		rateLimitDocLinkText: 'GitCode Rate limiting Documentation',
		authenticationFeatures: [
			{
				text: 'Access GitCode private repository',
				link: 'https://docs.gitcode.com/',
			},
			{
				text: 'Higher rate limit for GitCode official API',
				link: 'https://docs.gitcode.com/',
			},
		],
	};

	protected constructor() {}

	public static getInstance(): GitCode1sAuthenticationView {
		if (GitCode1sAuthenticationView.instance) {
			return GitCode1sAuthenticationView.instance;
		}
		return (GitCode1sAuthenticationView.instance = new this());
	}

	private registerListeners() {
		if (!this.webviewPanel) {
			throw new Error('webview is not init yet');
		}

		this.webviewPanel.webview.onDidReceiveMessage((message) => {
			const commonResponse = { id: message.id, type: message.type };
			const postMessage = (data?: unknown) => this.webviewPanel!.webview.postMessage({ ...commonResponse, data });

			switch (message.type) {
				case 'get-notice':
					postMessage(this.notice);
					break;
				case 'get-token':
					postMessage(this.tokenManager.getToken());
					break;
				case 'set-token':
					message.data && (this.notice = '');
					this.tokenManager.setToken(message.data || '').then(() => postMessage());
					break;
				case 'validate-token':
					this.tokenManager.validateToken(message.data).then((tokenStatus) => postMessage(tokenStatus));
					break;
				// OAuth handling omitted for now as it requires more setup
			}
		});

		this.tokenManager.onDidChangeToken((token) => {
			this.tokenBarrier && this.tokenBarrier.open();
			this.tokenBarrier && (this.tokenBarrier = null);
			this.webviewPanel?.webview.postMessage({ type: 'token-changed', token });
		});
	}

	public open(notice: string = '', withBarrier = false) {
		const extensionContext = getExtensionContext();

		this.notice = notice;
		withBarrier && !this.tokenBarrier && (this.tokenBarrier = new Barrier(600 * 1000));

		if (!this.webviewPanel) {
			this.webviewPanel = vscode.window.createWebviewPanel(
				GitCode1sAuthenticationView.viewType,
				this.pageTitle,
				vscode.ViewColumn.One,
				getWebviewOptions(extensionContext.extensionUri),
			);
			this.registerListeners();
			this.webviewPanel.onDidDispose(() => (this.webviewPanel = null));
		}

		// Reuse GitHub1s authentication styles and scripts for now, maybe we need to customize
		const styles = [
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/components.css').toString(),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-authentication.css').toString(),
		];
		const globalPageConfig = { ...this.pageConfig, extensionUri: extensionContext.extensionUri.toString() };
		const scripts = [
			'data:text/javascript;base64,' +
				Buffer.from(`window.pageConfig=${JSON.stringify(globalPageConfig)};`).toString('base64'),
			vscode.Uri.joinPath(extensionContext.extensionUri, 'assets/pages/github1s-authentication.js').toString(),
		];

		const webview = this.webviewPanel.webview;
		webview.html = createPageHtml(this.pageTitle, styles, scripts);
		return withBarrier ? this.tokenBarrier!.wait() : Promise.resolve();
	}
}
