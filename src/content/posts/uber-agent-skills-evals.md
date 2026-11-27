---
title: "Uber 如何评估每月 100 万次 Agent 技能调用"
pubDatetime: 2026-11-27T08:26:51+08:00
author: "AIOps Daily"
description: "从 Git 分发到对照评测，Uber 如何验证一个 Skill 值不值得保留。"
tags: ["AIOps", "Agent"]
draft: false
---

**中文导读｜Uber Engineering 原文发表于 2026 年 11 月 23 日。** [阅读中文编译版（含图）](https://www.hubwiz.com/blog/uber-agent-skills-marketplace-eval-million-invocations/) · [查看英文原文](https://www.uber.com/us/en/blog/optimizing-ubers-agent-skills/)。中文版由汇智网编译，不是官方译本。

Uber 的技能市场一年内从 1 个扩张到 5,000 多个，单月调用超过 100 万次。文章真正回答的是：**怎么知道一个 Skill 比不装它更好？** 调用量只能说明它被用了，不能说明它有用。

### 先定义行为，再写技能

Uber 用 Git 管理技能，用内部 CLI 把同一套技能发给 Codex、Claude Code、OpenCode 等客户端。在写 `SKILL.md` 之前，先用规格定义预期产出、该做和不能做的工具操作、支持的模型。Skill Workshop 据此生成说明和测试提示词。

### 把结果和执行过程分开评估

Uber 建议混用约 5% 的固定用例、80% 的真实请求轨迹评估、15% 的作者判定。比如根因报告写对了，不代表 Agent 真查过该查的指标。再对同一批请求做有技能和无技能的盲评，区分技能带来的收益和模型本身就有的能力。

### 一条可以借鉴的做法

先拿一个高频场景试验，例如 CI 失败归因。记录答案证据、工具操作、耗时和成本；同一条件重复跑几次，看看结果本身波动多大。之后再对比是否加载 Skill。这样就不会把一次偶然的好结果当成技能提升。
