#!/usr/bin/env node
/** Deterministic, offline Markdown-to-AstroPaper import. No credentials or network. */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function parseFrontmatter(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { fields: {}, body: normalized };
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error("frontmatter has no closing delimiter");
  const fields = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
    if (!match)
      throw new Error(
        "unsupported frontmatter; use one-line scalar fields and JSON arrays"
      );
    const [, key, raw] = match;
    if (Object.hasOwn(fields, key))
      throw new Error(`duplicate frontmatter field: ${key}`);
    let value = raw.trim();
    if (value.startsWith('"') || value.startsWith("[")) {
      try {
        value = JSON.parse(value);
      } catch {
        throw new Error(`invalid JSON/YAML value for ${key}`);
      }
    } else if (value.startsWith("'")) {
      if (!value.endsWith("'"))
        throw new Error(`invalid quoted value for ${key}`);
      value = value.slice(1, -1).replace(/''/g, "'");
    } else if (value === "true" || value === "false") value = value === "true";
    fields[key] = value;
  }
  return { fields, body: normalized.slice(end + 5) };
}

export function assertNoCredentials(text, label = "content") {
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
    /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/,
    /https:\/\/open\.(?:feishu|larksuite)\.cn\/open-apis\/bot\/v2\/hook\/[A-Za-z0-9-]{20,}/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  if (patterns.some(pattern => pattern.test(text)))
    throw new Error(`${label}: possible credential detected; content omitted`);
  // The import interface is Markdown, not a general HTML sanitization service.
  // Reject raw HTML instead of maintaining an incomplete dangerous-tag denylist.
  // Deliberately also reject literal tags inside code; escape them as &lt;tag&gt;.
  // A regex must not pretend to implement CommonMark code-span/fence parsing.
  if (
    /<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s|\/?>)|<![A-Za-z]|javascript\s*:/i.test(
      text
    )
  )
    throw new Error(
      `${label}: raw or executable HTML/URL is not allowed; use Markdown`
    );
}

export function markdownImages(text) {
  const images = [];
  const fenced = text.replace(/^\s*(```|~~~)[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, "");
  for (const match of fenced.matchAll(
    /!\[([^\]]*)\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*["'])?\s*\)/g
  )) {
    images.push({
      alt: match[1],
      url: match[2].replace(/^<|>$/g, ""),
      raw: match[0],
    });
  }
  const references = new Map(
    [...fenced.matchAll(/^\s*\[([^\]]+)\]:\s*(<[^>]+>|\S+)/gm)].map(m => [
      m[1].toLowerCase(),
      m[2].replace(/^<|>$/g, ""),
    ])
  );
  for (const match of fenced.matchAll(/!\[([^\]]*)\]\[([^\]]*)\]/g)) {
    const url = references.get((match[2] || match[1]).toLowerCase());
    if (!url) throw new Error("image reference has no definition");
    images.push({ alt: match[1], url, raw: match[0], reference: true });
  }
  return images;
}

export function localImagePath(url, sourceFile, root) {
  if (/^https?:\/\//i.test(url)) return null;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url))
    throw new Error("image URL must be HTTPS/HTTP or a relative file");
  if (url.startsWith("/"))
    throw new Error(
      "source image must use a relative path, not a site-root path"
    );
  let decoded;
  try {
    decoded = decodeURIComponent(url.split(/[?#]/, 1)[0]);
  } catch {
    throw new Error("invalid image URL encoding");
  }
  const absolute = path.resolve(path.dirname(sourceFile), decoded);
  if (!existsSync(absolute) || !statSync(absolute).isFile())
    throw new Error("local image file is missing");
  const actual = realpathSync(absolute);
  const relative = path.relative(realpathSync(root), actual);
  if (relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("local image resolves outside the source directory");
  assertLocalImageFormat(actual);
  return actual;
}

export function assertLocalImageFormat(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext))
    throw new Error(
      "local image format must be PNG, JPEG, GIF or WebP; SVG/HTML are not allowed"
    );
  const size = statSync(filename).size;
  if (size > 10 * 1024 * 1024 || size < 16)
    throw new Error("local image must be non-empty and at most 10 MiB");
  const bytes = readFileSync(filename);
  const match =
    (ext === ".png" &&
      bytes.length >= 45 &&
      bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      bytes.toString("ascii", 12, 16) === "IHDR" &&
      bytes.toString("ascii", bytes.length - 8, bytes.length - 4) === "IEND") ||
    ([".jpg", ".jpeg"].includes(ext) &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      bytes.at(-2) === 0xff &&
      bytes.at(-1) === 0xd9) ||
    (ext === ".gif" &&
      ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)) &&
      bytes.at(-1) === 0x3b) ||
    (ext === ".webp" &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP" &&
      bytes.readUInt32LE(4) + 8 === bytes.length);
  if (!match)
    throw new Error("local image signature does not match its file extension");
  // Astro's build decodes the image; these checks reject unsupported or disguised inputs early.
}

function firstParagraph(body) {
  const paragraph =
    body
      .split(/\n\s*\n/)
      .find(p => p.trim() && !/^(?:#|[-*>|]|!\[|```)/.test(p.trim())) ??
    "AIOps、Agent 开发与治理的每日资讯摘要。";
  return paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function convertDaily(text, filename) {
  assertNoCredentials(text, path.basename(filename));
  const { fields, body: originalBody } = parseFrontmatter(text);
  const match = path
    .basename(filename)
    .match(/(?:^|[^\d])(\d{4}-\d{2}-\d{2})(?:[^\d]|$)/);
  const fromName = match?.[1];
  const fromMetadata =
    typeof (fields.date ?? fields.pubDatetime) === "string"
      ? (fields.date ?? fields.pubDatetime).slice(0, 10)
      : null;
  const date = fromName ?? fromMetadata;
  if (!date || !validDate(date))
    throw new Error(
      `${path.basename(filename)}: a valid YYYY-MM-DD date is required`
    );
  if (fromName && fromMetadata && fromName !== fromMetadata)
    throw new Error(
      `${path.basename(filename)}: filename and frontmatter dates disagree`
    );
  const h1 = originalBody.match(/^#\s+(.+)$/m);
  const title = fields.title ?? h1?.[1] ?? `AIOps 日报｜${date}`;
  if (typeof title !== "string" || !title.trim())
    throw new Error("title must be non-empty text");
  // Only remove a leading H1: the page template already renders the title.
  const body = originalBody.replace(/^\s*#\s+[^\n]+\n+/, "").trim() + "\n";
  const tags = fields.tags ?? [
    "AIOps",
    ...(/^#{1,6}\s+.*Agent/im.test(body) ? ["Agent"] : []),
  ];
  if (
    !Array.isArray(tags) ||
    !tags.length ||
    tags.some(tag => typeof tag !== "string" || !tag.trim())
  )
    throw new Error("tags must be a non-empty JSON array of strings");
  const description = fields.description ?? firstParagraph(body);
  if (typeof description !== "string" || !description.trim())
    throw new Error("description must be non-empty text");
  for (const flag of ["draft", "featured"]) {
    if (Object.hasOwn(fields, flag) && typeof fields[flag] !== "boolean")
      throw new Error(`${flag} must be a boolean`);
  }
  const metadata = [
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(description)}`,
    // This is the digest issue date, not the publication time of any linked article.
    `pubDatetime: ${date}T08:00:00+08:00`,
    `author: ${JSON.stringify(fields.author ?? "AIOps Daily")}`,
    `tags: ${JSON.stringify([...new Set(tags)])}`,
    `draft: ${fields.draft ?? false}`,
    ...(Object.hasOwn(fields, "featured")
      ? [`featured: ${fields.featured}`]
      : []),
  ];
  return {
    date,
    filename: `aiops-daily-${date}.md`,
    content: `---\n${metadata.join("\n")}\n---\n\n${body}`,
    body,
  };
}

export function importDailies({ source, out, check = false }) {
  const sourcePath = path.resolve(source);
  if (!existsSync(sourcePath)) throw new Error("source path does not exist");
  const sourceIsDirectory = statSync(sourcePath).isDirectory();
  const root = sourceIsDirectory ? sourcePath : path.dirname(sourcePath);
  const files = sourceIsDirectory
    ? readdirSync(sourcePath)
        .filter(name => /\.md$/i.test(name))
        .sort()
        .map(name => path.join(sourcePath, name))
    : [sourcePath];
  if (!files.length) throw new Error("no Markdown source files found");
  const plans = [];
  const dates = new Set();
  for (const sourceFile of files) {
    const result = convertDaily(readFileSync(sourceFile, "utf8"), sourceFile);
    if (dates.has(result.date))
      throw new Error(`duplicate source issue date: ${result.date}`);
    dates.add(result.date);
    const images = [];
    let content = result.content;
    for (const image of markdownImages(content)) {
      if (!image.alt.trim())
        throw new Error(
          `${path.basename(sourceFile)}: image alt text is required`
        );
      const local = localImagePath(image.url, sourceFile, root);
      if (!local) continue;
      const bytes = readFileSync(local);
      const name = `${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}${path.extname(local).toLowerCase()}`;
      const relative = `_assets/${result.date}/${name}`;
      images.push({ target: path.join(out, relative), bytes });
      // Standard Markdown inline/reference images are processed by Astro at build time.
      content = content.split(image.url).join(`./${relative}`);
    }
    plans.push({ target: path.join(out, result.filename), content, images });
  }
  const changes = [];
  for (const plan of plans) {
    if (
      !existsSync(plan.target) ||
      readFileSync(plan.target, "utf8") !== plan.content
    )
      changes.push(path.basename(plan.target));
    for (const image of plan.images) {
      if (
        !existsSync(image.target) ||
        !readFileSync(image.target).equals(image.bytes)
      )
        changes.push(path.relative(out, image.target));
    }
  }
  if (check) {
    if (changes.length)
      throw new Error(
        `generated posts are stale: ${[...new Set(changes)].join(", ")}; run the import command`
      );
    return { imported: plans.length, changed: 0 };
  }
  // Validate the entire batch before touching any output. Same date = same path.
  for (const plan of plans) {
    for (const image of plan.images) {
      mkdirSync(path.dirname(image.target), { recursive: true });
      if (
        !existsSync(image.target) ||
        !readFileSync(image.target).equals(image.bytes)
      )
        writeFileSync(image.target, image.bytes);
    }
    mkdirSync(path.dirname(plan.target), { recursive: true });
    if (
      !existsSync(plan.target) ||
      readFileSync(plan.target, "utf8") !== plan.content
    ) {
      writeFileSync(`${plan.target}.tmp`, plan.content);
      renameSync(`${plan.target}.tmp`, plan.target);
    }
  }
  return { imported: plans.length, changed: new Set(changes).size };
}

function cli() {
  const args = process.argv.slice(2);
  const options = {
    source: "content/daily",
    out: "src/content/posts",
    check: args.includes("--check"),
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--check") continue;
    if (
      !["--source", "--out"].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith("--")
    )
      throw new Error(
        "usage: node scripts/import-dailies.mjs --source <directory|file.md> --out src/content/posts [--check]"
      );
    options[args[i].slice(2)] = args[++i];
  }
  if (!options.source || !options.out)
    throw new Error("--source and --out are required");
  const result = importDailies(options);
  process.stdout.write(
    `Daily import: ${result.imported} issue(s), ${result.changed} changed file(s).\n`
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    cli();
  } catch (error) {
    process.stderr.write(`Import failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
