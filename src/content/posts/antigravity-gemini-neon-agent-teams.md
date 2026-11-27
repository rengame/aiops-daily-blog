---
title: "用 Google Antigravity 和 Gemini 4 Neon 编排 Agent 团队"
pubDatetime: 2026-11-27T08:26:51+08:00
author: "AIOps Daily"
description: "codila 实践文章的中文导读：何时用单 Agent、编排器和并行协作。"
tags: ["AIOps", "Agent"]
draft: false
---

**中文导读与短节译｜作者：codila（@0xCodila）。** [查看 X 原文](https://x.com/0xCodila/status/2125623560689369440) · [查看 Google 官方说明](https://antigravity.google/blog/gemini-4-neon-in-google-antigravity/)。这是一篇个人实践文章，不是 Google 官方教程。本文是中文导读，并非全文译本。

### 从一个 Agent 开始

作者的建议可以概括成一句话：

> 从最简单的方式开始。只有当前方式不够用，才往上一级。

简单修改让一个 Agent 做就好；如果是大任务，但实现步骤清晰，可以试 **Orchestrator**。Google 确认该模式可以用 **Gemini 4 Neon 制定计划、Gemini 4 Hydrogen 执行**。如果任务能分成多个独立模块，再考虑并行协作。

### 并行不等于让所有人改同一份代码

文章以 Swarm 举例：让不同 Agent 各自负责一个模块，再给验收者写明怎么验证。比如，界面不仅要能打开，还要实际点按钮、检查控制台、刷新后确认数据是否保留。没有可复查的测试结果或截图，就不要仅凭 Agent 说“完成了”验收。

### 跨模型分工是作者的工作流

文章还介绍了把 Gemini、Claude、GPT 分给计划、执行、复核等角色的做法。不要把作者的组合当成 Google 的内置承诺，也不要把个别项目的速度或成本对比当成通用结论。更容易验证的起点是：**同一条需求，让实现者和验收者分开，比较返工次数和通过验收的成本。**
