import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  assertNoCredentials,
  convertDaily,
  importDailies,
  markdownImages,
  parseFrontmatter,
  validDate,
} from "../scripts/import-dailies.mjs";
import { validateContent } from "../scripts/validate-content.mjs";

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "aiops-content-test-"));
  const source = path.join(root, "source");
  const out = path.join(root, "posts");
  mkdirSync(source);
  return { root, source, out };
}
const body =
  "本期收录已核实的官方资料。\n\n## Agent 开发\n\n保留原文发布日期和发现日期的区别。\n";
const issue = "2026-10-29.md";

test("calendar validation rejects overflow dates and accepts leap years", () => {
  assert.equal(validDate("2024-02-29"), true);
  for (const date of [
    "2026-02-29",
    "2026-13-01",
    "2026-00-01",
    "2026-04-31",
    "26-1-1",
  ])
    assert.equal(validDate(date), false);
});

test("conversion is deterministic, preserves body and gives a stable digest issue date", () => {
  const a = convertDaily(body, issue);
  assert.deepEqual(a, convertDaily(body, issue));
  assert.equal(a.filename, "aiops-daily-2026-10-29.md");
  const { fields, body: converted } = parseFrontmatter(a.content);
  assert.equal(fields.pubDatetime, "2026-10-29T08:00:00+08:00");
  assert.equal(fields.title, "AIOps 日报｜2026-10-29");
  assert.deepEqual(fields.tags, ["AIOps", "Agent"]);
  assert.equal(converted.trim(), body.trim());
  assert.equal(Object.hasOwn(fields, "modDatetime"), false);
});

test("existing frontmatter title and tags are honored without rewriting article dates", () => {
  const input = `---\ntitle: "中文日报"\ntags: ["运维", "MCP"]\ndate: 2026-10-29\n---\n\n# 中文日报\n\n发布日期：2026-10-28。首次发现：2026-10-29。`;
  const { fields, body: output } = parseFrontmatter(
    convertDaily(input, issue).content
  );
  assert.equal(fields.title, "中文日报");
  assert.deepEqual(fields.tags, ["运维", "MCP"]);
  assert.match(output, /发布日期：2026-10-28。首次发现：2026-10-29。/);
  assert.doesNotMatch(output, /^# /);
});

test("missing, impossible and conflicting issue dates fail rather than guess", () => {
  assert.throws(() => convertDaily(body, "news.md"), /date is required/);
  assert.throws(() => convertDaily(body, "2026-02-30.md"), /date is required/);
  assert.throws(
    () => convertDaily("---\ndate: 2026-10-28\n---\n" + body, issue),
    /dates disagree/
  );
});

test("same date re-import is byte-identical and does not touch the file", () => {
  const f = fixture();
  writeFileSync(path.join(f.source, issue), body);
  assert.deepEqual(importDailies(f), { imported: 1, changed: 1 });
  const target = path.join(f.out, "aiops-daily-2026-10-29.md");
  const before = {
    text: readFileSync(target, "utf8"),
    mtime: statSync(target).mtimeMs,
  };
  assert.deepEqual(importDailies(f), { imported: 1, changed: 0 });
  assert.equal(readFileSync(target, "utf8"), before.text);
  assert.equal(statSync(target).mtimeMs, before.mtime);
  assert.deepEqual(importDailies({ ...f, check: true }), {
    imported: 1,
    changed: 0,
  });
});

test("same date revision updates one output, preserving stable publication time", () => {
  const f = fixture();
  writeFileSync(path.join(f.source, issue), body);
  importDailies(f);
  writeFileSync(path.join(f.source, issue), body + "\n更正：补充来源说明。\n");
  assert.throws(() => importDailies({ ...f, check: true }), /stale/);
  assert.deepEqual(importDailies(f), { imported: 1, changed: 1 });
  assert.equal(readdirSync(f.out).length, 1);
  assert.match(
    readFileSync(path.join(f.out, "aiops-daily-2026-10-29.md"), "utf8"),
    /更正/
  );
});

test("duplicate dates reject the whole batch before output mutation", () => {
  const f = fixture();
  writeFileSync(path.join(f.source, issue), body);
  writeFileSync(path.join(f.source, "copy-2026-10-29.md"), body);
  assert.throws(() => importDailies(f), /duplicate source issue date/);
  assert.throws(() => statSync(f.out), /ENOENT/);
});

test("local images are copied with content-addressed names and validated", () => {
  const f = fixture();
  mkdirSync(path.join(f.source, "images"));
  writeFileSync(
    path.join(f.source, "images", "chart.png"),
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWMQT/P7DwADLgHL1TG5PwAAAABJRU5ErkJggg==",
      "base64"
    )
  );
  writeFileSync(
    path.join(f.source, issue),
    body + "\n![运维图表](images/chart.png)\n"
  );
  const imported = importDailies(f);
  assert.equal(imported.changed, 2);
  const output = readFileSync(
    path.join(f.out, "aiops-daily-2026-10-29.md"),
    "utf8"
  );
  assert.match(
    output,
    /!\[运维图表\]\(\.\/_assets\/2026-10-29\/[0-9a-f]{16}\.png\)/
  );
  assert.deepEqual(validateContent(f.out), { posts: 1, dailyIssues: 1 });
  assert.equal(importDailies(f).changed, 0);
});

test("image alt text and existing paths are required", () => {
  const f = fixture();
  writeFileSync(
    path.join(f.source, issue),
    body + "\n![](https://example.com/image.png)\n"
  );
  assert.throws(() => importDailies(f), /alt text is required/);
  writeFileSync(path.join(f.source, issue), body + "\n![图](missing.png)\n");
  assert.throws(() => importDailies(f), /image file is missing/);
});

test("external image content is not fetched and reference syntax works", () => {
  const f = fixture();
  writeFileSync(
    path.join(f.source, issue),
    body +
      "\n![架构][diagram]\n\n[diagram]: https://example.invalid/chart.png\n"
  );
  importDailies(f);
  assert.deepEqual(validateContent(f.out), { posts: 1, dailyIssues: 1 });
  assert.equal(
    markdownImages("![图][x]\n[x]: image.png\n")[0].url,
    "image.png"
  );
});

test("local images cannot escape the source root through paths or symlinks", () => {
  const f = fixture();
  writeFileSync(path.join(f.root, "private.png"), "private");
  symlinkSync(
    path.join(f.root, "private.png"),
    path.join(f.source, "link.png")
  );
  for (const image of ["../private.png", "link.png"]) {
    writeFileSync(path.join(f.source, issue), body + `\n![图](${image})\n`);
    assert.throws(() => importDailies(f), /outside the source directory/);
  }
});

test("high-confidence credentials and executable HTML fail without echoing content", () => {
  const token = "ghp_" + "x".repeat(36);
  assert.throws(
    () => assertNoCredentials(token),
    error => /credential/.test(error.message) && !error.message.includes(token)
  );
  assert.throws(
    () => assertNoCredentials('<script>alert("x")</script>'),
    /executable HTML/
  );
  assert.throws(
    () => assertNoCredentials("[bad](javascript:alert(1))"),
    /executable HTML/
  );
  assert.doesNotThrow(() =>
    assertNoCredentials("配置 OPENAI_API_KEY，请勿把密钥提交到仓库。")
  );
});

test("content validation catches duplicate issue dates and malformed date metadata", () => {
  const f = fixture();
  mkdirSync(f.out);
  const output = convertDaily(body, issue).content;
  writeFileSync(path.join(f.out, "aiops-daily-2026-10-29.md"), output);
  writeFileSync(path.join(f.out, "aiops-daily-2026-10-29-copy.md"), output);
  assert.throws(() => validateContent(f.out), /duplicate issue date/);
  writeFileSync(
    path.join(f.out, "aiops-daily-2026-10-29-copy.md"),
    output.replace("2026-10-29T08:00:00+08:00", "2026-02-30T08:00:00+08:00")
  );
  assert.throws(() => validateContent(f.out), /ISO timestamp/);
});

test("empty source and production output fail visibly", () => {
  const f = fixture();
  assert.throws(() => importDailies(f), /no Markdown/);
  mkdirSync(f.out);
  assert.throws(() => validateContent(f.out), /no posts found/);
});

test("explicit draft and featured flags survive import without publishing a draft", () => {
  for (const draft of [true, false]) {
    for (const featured of [true, false]) {
      const input = `---\ndraft: ${draft}\nfeatured: ${featured}\n---\n\n${body}`;
      const converted = convertDaily(input, issue);
      const { fields } = parseFrontmatter(converted.content);
      assert.equal(fields.draft, draft);
      assert.equal(fields.featured, featured);
      assert.deepEqual(
        convertDaily(converted.content, converted.filename),
        converted
      );
    }
  }
  const { fields: defaults } = parseFrontmatter(
    convertDaily(body, issue).content
  );
  assert.equal(defaults.draft, false);
  assert.equal(Object.hasOwn(defaults, "featured"), false);
});

test("draft and featured reject string-like or missing-value booleans", () => {
  for (const flag of ["draft", "featured"]) {
    for (const value of ['"false"', '"true"', "yes", "1", ""]) {
      const input = `---\n${flag}: ${value}\n---\n\n${body}`;
      assert.throws(
        () => convertDaily(input, issue),
        new RegExp(`${flag} must be a boolean`)
      );
    }
  }
});

test("raw HTML is rejected, including img, embeds, refresh and CSS injection", () => {
  for (const html of [
    '<img src="images/chart.png" alt="chart">',
    '<object data="https://example.invalid"></object>',
    '<embed src="https://example.invalid">',
    '<meta http-equiv="refresh" content="0;url=https://example.invalid">',
    "<style>body{display:none}</style>",
    "<svg><foreignObject>hidden</foreignObject></svg>",
    '<div style="position:fixed">hidden</div>',
  ])
    assert.throws(() => convertDaily(body + html, issue), /HTML/);
  assert.throws(
    () => convertDaily(body + '\n`<img alt="example">`\n', issue),
    /HTML/
  );
  assert.throws(
    () => convertDaily(body + '\n```html\n<img alt="example">\n```\n', issue),
    /HTML/
  );
  assert.doesNotThrow(() =>
    convertDaily(body + "\n<https://example.invalid>\n", issue)
  );
  assert.doesNotThrow(() =>
    convertDaily(body + "\n`&lt;img alt=example&gt;`\n", issue)
  );
  assert.throws(
    () => convertDaily(body + "` unmatched `` <script>bad</script>", issue),
    /HTML/
  );
});

test("local images reject active formats, wrong signatures and oversized files before writing", () => {
  for (const [name, bytes, expected] of [
    [
      "image.svg",
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      /format/,
    ],
    [
      "image.html",
      Buffer.from('<img src="https://example.invalid">'),
      /format/,
    ],
    [
      "image.png",
      Buffer.from("this is not a PNG file and must fail"),
      /signature/,
    ],
    ["image.jpg", Buffer.alloc(10 * 1024 * 1024 + 1), /10 MiB/],
  ]) {
    const f = fixture();
    writeFileSync(path.join(f.source, name), bytes);
    writeFileSync(path.join(f.source, issue), body + `\n![图](${name})\n`);
    assert.throws(() => importDailies(f), expected);
    assert.throws(() => statSync(f.out), /ENOENT/);
  }
});
