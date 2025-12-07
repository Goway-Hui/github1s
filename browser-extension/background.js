/**
 * @file background script for GitCode1s extension
 * @author GuoJiaHui
 * @date 2025-12-06
 */

chrome.action.onClicked.addListener((tab) => {
	if (!tab.url) return;

	try {
		const url = new URL(tab.url);
		// if (url.hostname.includes('gitcode.com') || url.hostname.includes('gitcode.net')) {
		// 	// Replace the domain with gitcode1s.com
		// 	// Example: https://gitcode.com/user/repo -> https://gitcode1s.com/user/repo
		// 	// const newUrl = `https://gitcode1s.com${url.pathname}${url.search}${url.hash}`;
		// 	const newUrl = `https://1.94.250.84:8443/gitcode${url.pathname}${url.search}${url.hash}`;
		// 	chrome.tabs.create({ url: newUrl });
		// }

		// Cloudflare Pages Deployment
		// TODO: Replace 'your-project-name' with your actual Cloudflare Pages project name
		const GITHUB1S_DOMAIN = 'https://github1s-2zj.pages.dev';

		if (url.hostname.includes('gitcode.com') || url.hostname.includes('gitcode.net')) {
			const newUrl = `${GITHUB1S_DOMAIN}/gitcode${url.pathname}${url.search}${url.hash}`;
			chrome.tabs.create({ url: newUrl });
		}
	} catch (e) {
		console.error('Invalid URL', e);
	}
});
