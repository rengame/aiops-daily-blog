# 实现验收记录（2026-10-29）

## 已验证

- 官方 AstroPaper 6.1.0 模板来源与 MIT 许可；锁文件解析到 Astro 7.4.4、Pagefind 1.5.2 Extended。
- Node 24，`npm ci` 成功；`npm run check` 成功；`npm run format:check` 成功。
- 18 项 Node 测试：日期合法性、确定性转换、同日重复零修改、同日更正、重复期号拒绝、图片路径/哈希复制/替代文字、凭据检测、非法 HTML、空输入、draft/featured 保留与类型校验。
- 3 份真实日报源文件与输入 SHA256 一致；无模板示例混入。
- Astro 检查 58 文件：0 error、0 warning、0 hint。
- 12 个静态 HTML 页面，3 篇已发布日报；年月归档、专题、RSS、站点图、404、关于页 Markdown 插图。
- Pagefind Extended：`zh-cn`，3 篇、1305 个索引词。中文采用分词，日志中的“不支持 stemming”不表示不支持中文分词。
- `/aiops-daily/` 和 `/` 两种 base 均构建成功；自动检查所有 HTML 本地 href/src、RSS 路径、站点图和中文索引通过。
- 发现并修复 RSS 链接被 trailingSlash 追加 `/` 的问题。
- 全部远端字体请求移除；运行网站不需要 API Key、SSR 或数据库。

## 尚需外部验收

- 浏览器视觉、手机导航、主题切换、中文搜索结果、清除/返回/前进、图片显示：由私有演示浏览器验收，不能由上面的静态测试替代。
- 远程 GitHub CI、Pages 权限/套餐、实际线上 URL：必须在精确提交推送后核验。本地通过不代表已经部署。
- 私有演示根构建的 canonical/RSS 域名暂用 `https://example.invalid`；正式构建默认 `https://rengame.github.io/aiops-daily-blog/`，演示真实域名确定后可重建。
- 没有重新核查每篇来源事实；保留原日报证据边界。
- Space → GitHub 未建立自动同步，也未启动新的采集或发送任务。

## 可复现命令

```sh
npm ci
npm run check
npm run format:check
BASE_PATH=/ SITE_URL=https://example.invalid npm run build
```

当前沙箱需要把 npm/配置缓存指向可写临时目录：`npm_config_cache=/tmp/aiops-npm-cache XDG_CONFIG_HOME=/tmp/aiops-config ASTRO_TELEMETRY_DISABLED=1`。这不是应用的生产前置条件。

## 独立公开仓库复核

- 源码直接在仓库根目录，默认 base 为 `/aiops-daily-blog/`。原有私有采集仓库未修改。
- 发布范围仅网站源码、三期已审阅的公开日报和静态图片；不包含私有来源记录、内部链接、凭据、状态或采集配置。
- Draft 不是公开 Git 仓库的保密机制；只过滤静态页面、列表、RSS、站点图与搜索索引。

- 独立复核通过：子路径 robots sitemap 与 RSS 频道主页修正；真实构建注入草稿样稿，页面、列表、标签、RSS、站点图均无草稿，中文索引仍为三篇。验收样稿已移除。
- 原始 HTML（含 HTML img）拒绝导入，图片使用标准 Markdown；本地图片只接受带匹配文件签名且不超过 10 MiB 的 PNG/JPEG/GIF/WebP。
