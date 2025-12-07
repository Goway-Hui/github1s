/**
 * @file server.js
 * @author GuoJiaHui
 * @date 2025-12-06
 * @description Node.js server for hosting GitHub1s and handling OAuth callbacks
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Helper to create response HTML
const createResponseHtml = (text, script) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<title>Connect to Service</title>
</head>
<body>
	<h1>${text}</h1>
	<script>${script}</script>
</body>
</html>
`;

// Helper to create authorization result HTML
const createAuthorizeResultHtml = (data, origins) => {
	const errorText = 'Failed! You can close this window and retry.';
	const successText = 'Connected! You can now close this window.';
	const resultStr = `{ type: 'authorizing', payload: ${JSON.stringify(data)} }`;
	const script = `
	'${origins}'.split(',').forEach(function(allowedOrigin) {
		window.opener.postMessage(${resultStr}, allowedOrigin);
	});
	${data.error ? '' : 'setTimeout(() => window.close(), 50);'}`;
	return createResponseHtml(data.error ? errorText : successText, script);
};

const MISSING_CODE_ERROR = {
	error: 'request_invalid',
	error_description: 'Missing code',
};

const UNKNOWN_ERROR = {
	error: 'internal_error',
	error_description: 'Unknown error',
};

// GitHub Auth Callback
app.get('/api/github-auth-callback', async (req, res) => {
	const code = req.query.code;
	const allowedOrigins = process.env.GITHUB1S_ALLOWED_ORIGINS || '*';

	if (!code) {
		return res.status(401).send(createAuthorizeResultHtml(MISSING_CODE_ERROR, allowedOrigins));
	}

	try {
		const response = await fetch('https://github.com/login/oauth/access_token', {
			method: 'POST',
			body: JSON.stringify({
				client_id: process.env.GITHUB_OAUTH_ID,
				client_secret: process.env.GITHUB_OAUTH_SECRET,
				code,
			}),
			headers: { accept: 'application/json', 'content-type': 'application/json' },
		});
		const result = await response.json();
		res.status(response.status).send(createAuthorizeResultHtml(result, allowedOrigins));
	} catch (e) {
		console.error(e);
		res.status(500).send(createAuthorizeResultHtml(UNKNOWN_ERROR, allowedOrigins));
	}
});

// GitLab Auth Callback
app.get('/api/gitlab-auth-callback', async (req, res) => {
	const code = req.query.code;
	const allowedOrigins = process.env.GITLAB1S_ALLOWED_ORIGINS || '*';
	const redirectUri = process.env.GITLAB_AUTH_REDIRECT_URI || 'https://auth.gitlab1s.com/api/gitlab-auth-callback';

	if (!code) {
		return res.status(401).send(createAuthorizeResultHtml(MISSING_CODE_ERROR, allowedOrigins));
	}

	try {
		const response = await fetch('https://gitlab.com/oauth/token', {
			method: 'POST',
			body: JSON.stringify({
				code,
				client_id: process.env.GITLAB_OAUTH_ID,
				client_secret: process.env.GITLAB_OAUTH_SECRET,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}),
			headers: { accept: 'application/json', 'content-type': 'application/json' },
		});
		const result = await response.json();
		res.status(response.status).send(createAuthorizeResultHtml(result, allowedOrigins));
	} catch (e) {
		console.error(e);
		res.status(500).send(createAuthorizeResultHtml(UNKNOWN_ERROR, allowedOrigins));
	}
});

// Serve static files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
	app.use(express.static(distPath));

	// SPA fallback
	app.get('*', (req, res) => {
		res.sendFile(path.join(distPath, 'index.html'));
	});
} else {
	console.warn('dist folder not found. Please run npm run build first.');
	app.get('*', (req, res) => {
		res.send('dist folder not found. Please run npm run build first.');
	});
}

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});
