# 日报 Markdown → AstroPaper 内容管道

## 当前交付与边界

- `content/daily/` 是可审阅、可版本管理的原始 Markdown；本次导入了 **2026-10-27、2026-10-28、2026-10-29** 三份已有真实日报，不添加虚构资讯或模板示例。
- 这些日报来自现有 ChatGPT Space 内容，**并非当前 Python 日报管道的产物**。
- 导入器本身离线运行；**已配置并启用外部定时同步**，计划从 2026-10-30 起每天北京时间约 09:30（弹性调度）将现有 Space 日报原文提交到 `content/daily`，再触发 GitHub Pages CI。**首个无人值守周期尚待验证**。
- 同步不重新生成摘要、不修改旧采集流程；成功或无变更时静默，异常时通知。网站仓库不保存内部任务标识、Space 页面标识或凭据。
- `provenance.private.json`、Space 内部链接、评论、令牌与配置不属于网站内容，不应提交或发布。
- 导入器不访问网络，不重新抓取或评判原文。正文中的来源、发布日期、首次发现日期、时间窗口和证据限制原样保留。构建成功不代表每篇新闻事实已经重新核验。

## 路径与运行命令

在本仓库根目录执行：

```sh
# 日常：把新一期原文保存为 content/daily/YYYY-MM-DD.md
node scripts/import-dailies.mjs
node scripts/validate-content.mjs --posts src/content/posts
node --test tests/content-pipeline.test.mjs

# 明确指定路径；可接收一个文件，或目录顶层的全部 .md 文件
node scripts/import-dailies.mjs --source content/daily --out src/content/posts

# 检查已生成内容是否与原文一致，不写文件；适合提交前检查
node scripts/import-dailies.mjs --source content/daily --out src/content/posts --check
```

每期映射固定且可复现：

```text
content/daily/2026-10-29.md
  → src/content/posts/aiops-daily-2026-10-29.md
  → /aiops-daily-blog/posts/aiops-daily-2026-10-29/
```

日期优先取文件名中的 `YYYY-MM-DD`；无日期文件名时可取 frontmatter 的 `date` / `pubDatetime`。两者存在却冲突时失败，不猜测。目录仅扫描顶层 `.md`，不会递归导入私人审计文件或别的仓库。

## 幂等与修改

同一期日期始终生成同一个文件；重复执行时字节不变、文件修改时间不变。修改原始 Markdown 后再导入，仅覆盖该期产物。所有输入先完成校验，再写产物；重复日期直接报错，不采取“最后一个文件胜出”。

- 显式 `draft: true` 保持为草稿，不会被导入器改成公开文章；`draft` / `featured` 仅接受布尔值 `true` 或 `false`，带引号字符串会被拒绝。未指定时默认 `draft: false`，不额外设置 `featured`。
- 不使用当前运行时间生成 `modDatetime`，避免每次构建制造无意义差异。
- `pubDatetime` 固定为期号当天的 `08:00:00+08:00`，**只作日报日期的确定性排序锚点**，不是断言实际发布的精确时间，更不是任一所引文章的发布时间。页面只显示年月日。
- 只有显式 `frontmatter.title` 能覆盖默认标题；否则统一使用 `AIOps 日报｜YYYY-MM-DD`。正文 H1 可能是「今日重点」等章节，不用于推断文章标题，也不被删除；正文仅规范化首尾空白。
- 摘要取第一段正文并截到 160 字；默认标签 `AIOps`，若标题层级中出现 `Agent` 则增加该标签。不使用模型补写新闻事实。
- 不自动删除旧产物、旧图片或移除的期号。撤稿时应在同一可审阅提交中删除原文及对应生成文件，再检查 RSS/归档/搜索输出。

原文可以是纯 Markdown。若手写 frontmatter，使用单行标量与 JSON 数组（JSON 也是合法 YAML 子集），不使用 YAML 块数组、多行标量、锚点或自定义对象：

```markdown
---
title: "AIOps 日报｜2026-10-29"
date: 2026-10-29
description: "本期重点摘要。"
tags: ["AIOps", "Agent"]
---

正文与来源链接……
```

## Markdown 图片

本地图片相对于**原始 Markdown 文件**定位，并要求处于该次源目录内。例如：

```text
content/daily/
  2026-10-29.md
  images/
    architecture.png
```

```markdown
![Agent 运维工作流架构](images/architecture.png)
```

导入器复制为 `src/content/posts/_assets/YYYY-MM-DD/<内容哈希>.png`，重写为相对路径。Astro 原生 Markdown 图片管道生成最终资源，部署在 `/aiops-daily-blog/` 子路径时无需手工拼接 base。图片采用内容哈希命名，不因不同来源同名图片而覆盖；`_assets` 不作为文章被 loader 收录。

也支持标准引用式图片。**原始 HTML（包括 `<img>`、嵌入对象、样式和重定向标签）一律拒绝**；请使用标准 Markdown 图片语法。为避免不完整的 Markdown 语法过滤，代码块和行内代码里的字面 HTML 标签同样拒绝；如需展示，使用 `&lt;tag&gt;` 转义写法。远程 `https://` / `http://` 图片保持原地址，导入器不下载；远程可用性、隐私请求和授权仍由内容维护者负责。建议优先使用有权发布的本地图片。不要使用 `file:`、`data:`、站点根绝对路径或跨出源目录的路径；符号链接也不能绕过路径范围。

每张图片都必须有非空替代文字。本地图片只接受 PNG、JPEG、GIF、WebP，扩展名必须匹配文件签名，大小不超过 10 MiB；拒绝 SVG、HTML 和伪装的非图片文件。受版本管理的网站插图可在站点源码中单独审查，不属于这个日报导入接口。测试验证路径、签名、复制和 URL 重写；Astro 构建进一步解码图片，浏览器验收验证显示结果。

## 验证与安全

内容验证拒绝空站点、空标题/摘要/正文、无时区或非法发布日期、同一期日期重复、期号与发布时间日期不一致、空标签、缺失图片、空替代文字、越界图片路径及可执行 HTML。已知高置信度私钥/API token/Webhook 模式会阻止导入和构建，错误不会回显匹配到的密钥。

这只是防误提交检查，不是完整 DLP 或内容安全审计。提交前仍应人工检查差异，不要把任何真实密钥放进 Markdown。正文中的“API Key”配置名称不等于凭据值。

未来若接入 Python 数据分支，可显式将**已经审阅的公开日报**传给 `--source`；不要将整个状态分支复制到公开站点，更不能发布 `state.json`、原文全文缓存或待发送队列。Space 的外部定时同步已配置；每次有内容变更时应检查对应提交的构建结果。首个无人值守周期尚待验证，不能仅以配置成功宣称端到端自动发布已验收。
