# AIOps Daily · 静态日报站

基于真正的 **AstroPaper 6.1.0 / Astro 7**，提供中文全文搜索、专题、年月归档、RSS、明暗主题和 Markdown 图片。只有静态文件，无 SSR、数据库或运行时 API Key。

## 本地运行

Node 24，安装与构建：

```sh
npm ci
npm run check
npm run preview -- --port 4321
# http://localhost:4321/aiops-daily-blog/
```

`npm run check` 依次执行导入测试、lint、真实日报导入、内容验证、Astro 类型检查、静态构建、Pagefind 中文索引和内部链接/资源检查。`npm run format:check` 单独检查格式。搜索索引在构建时生成；验收搜索请用 `preview`，而不是空索引的 `dev`。

私有演示或根域部署：

```sh
BASE_PATH=/ SITE_URL=https://example.invalid npm run build
BASE_PATH=/ npm run preview -- --port 4322
```

## 日报更新：只改 Markdown

1. 把真实日报放到 `content/daily/YYYY-MM-DD.md`，可带受支持的 YAML frontmatter。
2. `npm run check`。同日固定映射到一个 `aiops-daily-YYYY-MM-DD` URL；重复导入不产生重复文章或无意义 diff。
3. 审查 Git diff，提交源 Markdown 及引用的图片。派生 `src/content/posts/` 由构建重新生成。
4. 合并到 `main` 后，Pages workflow 才发布。

详见 [内容接口](docs/content-pipeline.md)。本次导入 2026-10-27、28、29 三期现有真实日报；保留原文、日期精度限制与历史补充说明。日报期号不是各条原文的发布日期。

**已配置并启用外部定时同步**：从 2026-10-30 起，计划每天北京时间约 09:30（弹性调度）将现有 Space 日报原文同步到 `content/daily`，再由 GitHub Pages CI 构建发布。同步不重新生成摘要，不修改旧采集流程；成功或无变更时静默，异常时通知。**首个无人值守周期尚待验证**，配置完成不等于已验证自动运行成功。

## 独立公开博客仓库

本站源码直接位于 `rengame/aiops-daily-blog` 仓库根目录；原有日报采集仓库保持私有、原工作流和状态不变。本仓库只包含网站代码、经审阅的公开日报及图片，不含 Python 采集配置、运行状态、私有来源记录或凭据。

`.github/workflows/blog.yml` 使用 Node 24：PR 仅验收，`main` 验收成功后才发布 GitHub Pages。构建阶段只有读取仓库权限，部署阶段才取得 Pages/OIDC 权限；不写回源码，不启用采集或发送调度。

### GitHub Pages 配置

- Settings → Pages → Source 选择 **GitHub Actions**。
- 默认 `SITE_URL=https://rengame.github.io`、`BASE_PATH=/aiops-daily-blog/`。
- 正式地址：`https://rengame.github.io/aiops-daily-blog/`。首次上线提交 `1880c205` 的远程 CI 与 Pages 已成功；后续修复须按各自提交重新回归，详见 [验收记录](docs/ACCEPTANCE.md)。
- 本仓库和站点均为公开；**草稿标记只阻止网站生成，不会让已提交到公开 Git 的原文保密**。私人草稿不得放进此仓库。
- 不依赖原仓库的 `digest-data` 分支，不更改原有采集/发送流程。现有 Space 日报通过已配置的外部定时同步提交 Markdown；首个无人值守周期尚待验证。

## 验收重点

首页最新一期、全部日报、月份归档、专题筛选、中文搜索与清除、文章原文链接、RSS 子路径、手机导航与明暗主题、浏览器前进后退、404、Markdown 插图、重复导入零 diff。静态生成并不等于线上部署成功；需再核对精确提交的 CI 和线上页面。

## 来源与许可

[官方模板与修改说明](docs/UPSTREAM.md)。MIT 许可见 `LICENSE`。摘要和原文链接保持可追溯；不要提交整篇第三方正文、私人 Space 导航、配置或凭据。
