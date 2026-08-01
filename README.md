# 挖掘机 (Super Digger)

AI 驱动的智能投研工具。输入财经新闻、主题或投资概念，用你自己的 AI 模型生成结构化、多维度的投资挖掘分析报告。

## 核心功能

- **挖掘分析**：输入主题/新闻/链接，三段并行分析生成完整报告，含投资吸引力评分与信息差评分（衡量市场是否已消化该信息）
- **实时搜索**：可选接入 Exa 或 AnySearch，分析前自动检索最新网络资料并注入，报告展示全部引用来源
- **最新动态**：聚合雪球、36氪、极客洞察、彭博、Buzzing 五个新闻源；AI 概念标签一键提取，点击标签直接发起挖掘
- **历史复盘**：分析历史自动保存，双评分徽章 + 排序筛选 + 一键重新分析对比评分变化
- **自带模型（BYOM）**：
  - 云端 API：OpenRouter、DeepSeek、MiniMax、Ollama 及任意 OpenAI 兼容服务
  - 本机 CLI：9Router（localhost:20128）、Claude Code（localhost:3456）、Codex（localhost:1455），自动扫描运行状态
  - 所有配置仅保存在浏览器本地，不上传服务器
- **其他**：中英双语、PWA、Markdown 报告导出、报告分享

## 本地运行

**前置要求**: Node.js 18+

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

打开 http://localhost:3000，点击右上角「模型设置」配置你的 AI 模型即可开始使用。

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS
- Vercel（部署 + Serverless Functions）

## 部署

项目包含 `vercel.json` 配置（API 代理 rewrite、安全响应头），推荐直接部署到 Vercel。

## 联系

- 开发者：僧僧
- 邮箱：codes@z.org
