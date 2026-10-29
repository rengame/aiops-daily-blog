import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const base = (process.env.BASE_PATH || "/aiops-daily-blog/").replace(
  /\/+$/,
  ""
);
const issues = [];
const walk = async dir =>
  (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map(async entry =>
        entry.isDirectory()
          ? walk(path.join(dir, entry.name))
          : [path.join(dir, entry.name)]
      )
    )
  ).flat();
const exists = async file => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};
const files = await walk(root);
const htmlFiles = files.filter(file => file.endsWith(".html"));
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (!html.includes('lang="zh-CN"'))
    issues.push(`${path.relative(root, file)}: Chinese html lang missing`);
  if (!html.includes('rel="canonical"'))
    issues.push(`${path.relative(root, file)}: canonical missing`);
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  const pageUrl = new URL(
    `${base}/${relative === "index.html" ? "" : relative.replace(/index\.html$/, "")}`,
    "https://test.local"
  );
  for (const match of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    const target = match[1].replaceAll("&amp;", "&");
    if (/^(?:https?:|mailto:|tel:|data:|javascript:|#|\/\/)/.test(target))
      continue;
    const url = new URL(target, pageUrl);
    if (base && !url.pathname.startsWith(`${base}/`) && url.pathname !== base) {
      issues.push(`${relative}: asset/link escapes base: ${target}`);
      continue;
    }
    const local = decodeURIComponent(url.pathname.slice(base.length)).replace(
      /^\/+/,
      ""
    );
    const candidate = path.join(root, local);
    if (
      !(await exists(candidate)) &&
      !(await exists(path.join(candidate, "index.html")))
    )
      issues.push(`${relative}: missing local asset/link: ${target}`);
  }
}
for (const required of [
  "rss.xml",
  "robots.txt",
  "sitemap-index.xml",
  "pagefind/pagefind.js",
  "pagefind/pagefind-entry.json",
  "search/index.html",
  "archives/index.html",
  "tags/index.html",
]) {
  if (!(await exists(path.join(root, required))))
    issues.push(`missing required output: ${required}`);
}
const rss = await readFile(path.join(root, "rss.xml"), "utf8");
if (!rss.includes("<language>zh-CN</language>"))
  issues.push("RSS language missing");
if (!rss.includes(`${base}/posts/`))
  issues.push("RSS post links missing deployment base");
const site = process.env.SITE_URL || "https://rengame.github.io";
const siteRoot = new URL(`${base}/`, site).href;
if (!rss.includes(`<link>${siteRoot}</link>`))
  issues.push("RSS channel link missing deployment base");
const robots = await readFile(path.join(root, "robots.txt"), "utf8");
const sitemapUrl = new URL(`${base}/sitemap-index.xml`, site).href;
if (!robots.includes(`Sitemap: ${sitemapUrl}`))
  issues.push("robots.txt sitemap URL missing deployment base");
const entry = JSON.parse(
  await readFile(path.join(root, "pagefind/pagefind-entry.json"), "utf8")
);
if (!Object.keys(entry.languages || {}).some(lang => lang.startsWith("zh")))
  issues.push("Pagefind Chinese index missing");
if (issues.length) {
  process.stderr.write(issues.join("\n") + "\n");
  process.exitCode = 1;
} else
  process.stdout.write(
    `Static output verified: ${htmlFiles.length} pages, all local links/assets, RSS, sitemap, Chinese Pagefind index (${base || "/"}).\n`
  );
