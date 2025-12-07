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

		// 本地运行
		if (url.hostname.includes('gitcode.com') || url.hostname.includes('gitcode.net')) {
			// Replace the domain with gitcode1s.com
			// Example: https://gitcode.com/user/repo -> https://gitcode1s.com/user/repo
			// const newUrl = `https://gitcode1s.com${url.pathname}${url.search}${url.hash}`;
			const newUrl = `http://127.0.0.1:4000${url.pathname}${url.search}${url.hash}`;
			chrome.tabs.create({ url: newUrl });
		}
	} catch (e) {
		console.error('Invalid URL', e);
	}
});
