/**
 * @file content script for GitCode1s extension
 * @author GuoJiaHui
 * @date 2025-12-06
 */

(function () {
	const BUTTON_ID = 'gitcode1s-open-button';

	/**
	 * Creates the floating button
	 */
	function createButton() {
		if (document.getElementById(BUTTON_ID)) return;

		const button = document.createElement('a');
		button.id = BUTTON_ID;

		const isGitCode = window.location.hostname.includes('gitcode');
		button.textContent = isGitCode ? 'Open in GitCode1s' : 'Open in GitHub1s';

		button.style.position = 'fixed';
		button.style.bottom = '20px';
		button.style.right = '20px';
		button.style.zIndex = '9999';
		button.style.padding = '10px 20px';
		button.style.backgroundColor = '#fc6d26'; // GitCode orange-ish color
		button.style.color = 'white';
		button.style.borderRadius = '4px';
		button.style.textDecoration = 'none';
		button.style.fontWeight = 'bold';
		button.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
		button.style.cursor = 'pointer';
		button.style.fontFamily =
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

		button.addEventListener('click', (e) => {
			e.preventDefault();
			const path = window.location.pathname;
			const search = window.location.search;
			const hash = window.location.hash;
			let newUrl;

			// if (window.location.hostname.includes('gitcode')) {
			// 	// GitCode: https://1.94.250.84:8443/gitcode/user/repo
			// 	newUrl = `https://1.94.250.84:8443/gitcode${path}${search}${hash}`;
			// } else if (window.location.hostname.includes('github')) {
			// 	// GitHub: https://1.94.250.84:8443/user/repo
			// 	newUrl = `https://1.94.250.84:8443${path}${search}${hash}`;
			// }
			// 本地运行
			if (window.location.hostname.includes('gitcode')) {
				// GitCode: https://1.94.250.84:8443/gitcode/user/repo
				newUrl = `http://127.0.0.1:4000${path}${search}${hash}`;
			} else if (window.location.hostname.includes('github')) {
				// GitHub: https://1.94.250.84:4000/user/repo
				newUrl = `http://127.0.0.1:4000${path}${search}${hash}`;
			}

			if (newUrl) {
				window.open(newUrl, '_blank');
			}
		});

		document.body.appendChild(button);
	}

	// Initial creation
	createButton();

	// Re-check on dynamic navigation (if any)
	const observer = new MutationObserver(() => {
		createButton();
	});

	observer.observe(document.body, { childList: true, subtree: true });
})();
