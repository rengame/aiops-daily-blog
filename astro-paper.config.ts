import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: process.env.SITE_URL || "https://rengame.github.io",
    title: "AIOps Daily",
    description:
      "AIOps、Agent 开发与智能运维的中文技术日报。保留原始链接与证据边界，让有价值的进展沉淀下来。",
    author: "AIOps Daily",
    ogImage: "default-og.svg",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: { perPage: 8, perIndex: 6, scheduledPostMargin: 0 },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: { enabled: false },
    search: "pagefind",
  },
  socials: [],
  shareLinks: [],
});
