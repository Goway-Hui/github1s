![GitHub1s](https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/logo.svg)

# github1s

一秒钟用 VS Code 打开 GitHub 代码。

## 项目简介

GitHub1s 允许你直接在浏览器中使用 VS Code 的界面阅读 GitHub 仓库的代码。
本项目已经过现代化改造，支持 Vite 构建、Cloudflare Pages 部署，并采用 Manifest V3 标准的浏览器扩展进行访问。

## 目录结构

以下是项目根目录的文件结构说明：

```
github1s/
├── .devcontainer/       # VS Code Dev Container 配置，支持云端开发环境
├── .github/             # GitHub Actions 工作流与配置
├── .husky/              # Git hooks (Husky) 配置
├── browser-extension/   # 浏览器扩展源码 (Manifest V3)，包含 background.js 和 content.js
├── certs/               # 本地开发用的 SSL 证书 (由 generate-ssl.sh 生成)
├── docs/                # 项目文档
├── extensions/          # 内置 VS Code 扩展 (核心逻辑)
│   └── github1s/        # github1s 核心扩展源码，处理文件系统和 API 交互
├── functions/           # Cloudflare Pages Functions (API 接口，如 OAuth 回调)
├── nginx/               # Nginx 配置 (用于本地反向代理模拟生产环境)
├── public/              # 静态公共资源 (favicon, robots.txt, manifest.json 等)
├── resources/           # 项目图片与静态资源 (Logo, 演示图等)
├── scripts/             # 构建与工具脚本
├── src/                 # Web 应用入口源码 (Vite 应用入口)
├── tests/               # 自动化测试 (Jest)
├── vscode-web/          # VS Code Web 依赖资源构建脚本
├── .dockerignore        # Docker 构建忽略规则
├── .editorconfig        # 编辑器代码风格配置
├── .gitignore           # Git 忽略规则
├── .gitpod.Dockerfile   # Gitpod 环境 Dockerfile
├── .gitpod.yml          # Gitpod 配置
├── .prettierignore      # Prettier 忽略规则
├── .prettierrc.js       # Prettier 配置
├── Dockerfile           # 应用构建 Dockerfile
├── LICENSE              # 项目许可证 (MIT)
├── README.md            # 项目说明文档
├── browser-extension.crx # 浏览器扩展打包文件 (Artifact)
├── browser-extension.pem # 浏览器扩展打包密钥 (Artifact)
├── deploy.ps1           # 部署辅助脚本 (PowerShell)
├── docker-compose.yml   # Docker Compose 配置
├── eslint.config.js     # ESLint 代码检查配置
├── generate-ssl.sh      # 本地 SSL 证书生成脚本
├── package-lock.json    # NPM 依赖锁定文件
├── package.json         # NPM 项目配置与脚本 (包含 dev:vite, build:vite 等命令)
├── server.js            # 本地简易预览服务脚本
├── tsconfig.json        # TypeScript 全局配置
└── vite.config.ts       # Vite 构建配置 (定义端口 4000 和输出目录 dist)
```

## 使用方法

由于本项目部署在私有环境 (Cloudflare Pages)，原有的 URL 修改方式 (如 `github1s.com`) 不再适用。请使用配套的浏览器插件访问。

### 1. 安装浏览器插件

1.  克隆或下载本项目到本地。
2.  打开 Chrome/Edge 浏览器的扩展程序管理页面 (`chrome://extensions` 或 `edge://extensions`)。
3.  开启右上角的 **“开发者模式”**。
4.  点击 **“加载已解压的扩展程序”**，选择项目根目录下的 `browser-extension` 文件夹。

### 2. 配置插件域名

在使用前，你需要将插件指向你的 Cloudflare Pages 部署域名：

1.  打开 `browser-extension/background.js` 和 `browser-extension/content.js` 文件。
2.  找到 `GITHUB1S_DOMAIN` 常量。
3.  将其修改为你实际的部署域名，例如：
    ```javascript
    const GITHUB1S_DOMAIN = 'https://your-project.pages.dev';
    ```
4.  回到扩展程序管理页面，点击 **刷新** 图标使更改生效。

### 3. 开始使用

在任意 GitHub 仓库页面点击浏览器工具栏中的 **GitCode1s** 图标，即可跳转到你的 VS Code 网页版实例。

## 部署指南 (Cloudflare Pages)

推荐使用 Cloudflare Pages 进行无服务器部署。

1.  **Fork 本仓库** 到你的 GitHub 账号。
2.  登录 **Cloudflare Dashboard**，进入 **Pages** 页面。
3.  点击 **Create a project** > **Connect to Git**。
4.  选择你 Fork 的仓库。
5.  配置构建参数：
    - **Framework preset**: None (或手动配置)
    - **Build command**: `npm run build:vite`
    - **Build output directory**: `dist`
6.  **环境变量 (Environment Variables)** (可选，用于私有仓库支持):
    - `GITHUB_OAUTH_CLIENT_ID`: 你的 GitHub OAuth Client ID。
7.  点击 **Save and Deploy**。

> **注意**：部署完成后，请务必按照“使用方法”更新浏览器插件中的域名。

## 开发指南

### 环境准备

- Node.js (推荐 v16+)
- NPM

### 本地开发

1.  安装依赖：

    ```bash
    npm install
    ```

2.  启动开发服务器 (Vite)：

    ```bash
    npm run dev:vite
    ```

    服务将启动在 `http://localhost:4000`。

3.  构建生产版本：
    ```bash
    npm run build:vite
    ```
    构建产物将生成在 `dist` 目录。

### 重新部署步骤

如果你修改了代码，请执行以下步骤更新线上版本：

1.  提交并推送更改到 GitHub：
    ```bash
    git add .
    git commit -m "feat: update configuration"
    git push
    ```
2.  Cloudflare Pages 会自动检测 Commit 并触发重新构建与部署。

## 启用私有仓库访问

如果你想查看非公开仓库，需要配置 GitHub OAuth Token。
点击编辑器左侧底部的配置图标，按照提示输入 Token。Token 仅存储在你的浏览器本地，用于直接向 GitHub API 发起请求。

<img height="500px" src="https://raw.githubusercontent.com/conwnet/github1s/master/resources/images/auth-token.png" />
