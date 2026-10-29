#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertNoCredentials,
  localImagePath,
  markdownImages,
  parseFrontmatter,
  validDate,
} from "./import-dailies.mjs";

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith("_")) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory()
      ? filesIn(full)
      : /\.mdx?$/.test(entry.name)
        ? [full]
        : [];
  });
}

export function validateContent(directory) {
  const root = path.resolve(directory);
  if (!existsSync(root) || !statSync(root).isDirectory())
    throw new Error("posts directory does not exist");
  const files = filesIn(root);
  if (!files.length)
    throw new Error("no posts found; refusing an empty production build");
  const dates = new Set();
  for (const filename of files) {
    const name = path.basename(filename);
    const text = readFileSync(filename, "utf8");
    assertNoCredentials(text, name);
    const { fields, body } = parseFrontmatter(text);
    for (const field of ["title", "description"]) {
      if (typeof fields[field] !== "string" || !fields[field].trim())
        throw new Error(`${name}: ${field} is required`);
    }
    if (
      typeof fields.pubDatetime !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(
        fields.pubDatetime
      ) ||
      !validDate(fields.pubDatetime.slice(0, 10)) ||
      !Number.isFinite(Date.parse(fields.pubDatetime))
    )
      throw new Error(
        `${name}: pubDatetime requires an ISO timestamp with timezone`
      );
    if (
      !Array.isArray(fields.tags) ||
      !fields.tags.length ||
      fields.tags.some(tag => typeof tag !== "string" || !tag.trim())
    )
      throw new Error(`${name}: tags require a non-empty JSON array`);
    for (const flag of ["draft", "featured"]) {
      if (Object.hasOwn(fields, flag) && typeof fields[flag] !== "boolean")
        throw new Error(`${name}: ${flag} must be a boolean`);
    }
    if (!body.trim()) throw new Error(`${name}: body is empty`);
    const daily = name.match(
      /^aiops-daily-(\d{4}-\d{2}-\d{2})(?:[-.].*)?\.mdx?$/
    );
    if (daily) {
      const date = daily[1];
      if (!validDate(date) || date !== fields.pubDatetime.slice(0, 10))
        throw new Error(`${name}: issue date and pubDatetime disagree`);
      if (dates.has(date)) throw new Error(`duplicate issue date: ${date}`);
      dates.add(date);
    }
    for (const image of markdownImages(body)) {
      if (!image.alt.trim())
        throw new Error(`${name}: image alt text is required`);
      localImagePath(image.url, filename, root);
    }
  }
  return { posts: files.length, dailyIssues: dates.size };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const args = process.argv.slice(2);
    let posts = "src/content/posts";
    if (args.length === 1 && !args[0].startsWith("--")) posts = args[0];
    else if (args.length === 2 && args[0] === "--posts") posts = args[1];
    else if (args.length)
      throw new Error(
        "usage: node scripts/validate-content.mjs [--posts src/content/posts]"
      );
    const result = validateContent(posts);
    process.stdout.write(
      `Content validation: ${result.posts} posts, ${result.dailyIssues} dated issues passed.\n`
    );
  } catch (error) {
    process.stderr.write(`Content validation failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
