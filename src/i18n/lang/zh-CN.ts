import type { UIStrings } from "../types";

export default {
  nav: {
    home: "首页",
    posts: "日报",
    tags: "专题",
    about: "关于",
    archives: "归档",
    search: "搜索",
  },
  post: {
    publishedAt: "发布于",
    updatedAt: "更新于",
    sharePostIntro: "分享这篇日报：",
    sharePostOn: "分享到 {{platform}}",
    sharePostViaEmail: "通过邮件分享",
    tagLabel: "专题",
    backToTop: "回到顶部",
    goBack: "返回列表",
    editPage: "编辑文章",
    previousPost: "上一期",
    nextPost: "下一期",
  },
  pagination: { prev: "上一页", next: "下一页", page: "页" },
  home: {
    socialLinks: "关注",
    featured: "最新一期",
    recentPosts: "往期日报",
    allPosts: "查看全部日报",
  },
  footer: {
    copyright: "AIOps Daily",
    allRightsReserved: "技术进展 · 每日沉淀",
  },
  pages: {
    tagTitle: "专题",
    tagDesc: "该专题下的全部日报",
    tagsTitle: "专题",
    tagsDesc: "按关注的技术方向，发现值得回看的进展。",
    postsTitle: "全部日报",
    postsDesc: "按时间收录。每一期都保留原文链接、时间窗口与证据说明。",
    archivesTitle: "时间归档",
    archivesDesc: "日积月累，让技术脉络清晰可查。",
    searchTitle: "全文搜索",
    searchDesc:
      "搜索中文关键词、产品或公司名称。索引在构建时生成，无需连接第三方搜索服务。",
  },
  a11y: {
    skipToContent: "跳到正文",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    toggleTheme: "切换明暗主题",
    searchPlaceholder: "搜索日报…",
    noResults: "未找到结果",
    goToPreviousPage: "前往上一页",
    goToNextPage: "前往下一页",
  },
  notFound: {
    title: "404 · 页面未找到",
    message: "这页暂时不在归档里",
    goHome: "返回首页",
  },
} satisfies UIStrings;
