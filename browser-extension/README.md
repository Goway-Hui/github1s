# GitCode1s Browser Extension

## Introduction

This browser extension adds an "Open in GitCode1s" button to GitCode repository pages and allows you to quickly switch to GitCode1s by clicking the extension icon.

## Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" button.
4. Select the `browser-extension` folder in this project.

## Features

- **Floating Button**: Displays an "Open in GitCode1s" button on GitCode pages.
- **Toolbar Icon**: Click the extension icon to open the current repository in GitCode1s.

## Configuration

By default, it redirects to `https://gitcode1s.com`. If you are running a local server or a custom deployment, you can modify `background.js` and `content.js` to point to your URL.
