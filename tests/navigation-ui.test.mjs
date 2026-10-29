import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pagefindZh } from "../src/i18n/pagefind-zh.ts";
const source = file =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

test("Pagefind explicitly localizes input, clear, status and empty results", () => {
  for (const key of [
    "placeholder",
    "clear_search",
    "search_label",
    "zero_results",
    "one_result",
    "many_results",
    "searching",
  ]) {
    assert.match(pagefindZh[key], /[\u3400-\u9fff]/);
  }
  assert.match(pagefindZh.zero_results, /\[SEARCH_TERM\]/);
  assert.match(pagefindZh.many_results, /\[COUNT\]/);
  const search = source("src/pages/search.astro");
  assert.match(search, /translations: pagefindZh/);
  assert.match(search, /setAttribute\("aria-label", "搜索日报全文"\)/);
  assert.match(search, /setAttribute\("aria-label", "清除搜索"\)/);
});

test("navigation remains native without ClientRouter or transition lifecycle dependencies", () => {
  assert.doesNotMatch(
    source("src/layouts/Layout.astro"),
    /ClientRouter|astro:transitions/
  );
  for (const file of [
    "src/pages/index.astro",
    "src/components/Main.astro",
    "src/scripts/theme.ts",
    "src/pages/search.astro",
    "src/components/Header.astro",
    "src/pages/posts/[...slug]/_components/BackButton.astro",
  ]) {
    assert.doesNotMatch(
      source(file),
      /astro:(?:page-load|before-swap|after-swap)/
    );
  }
  assert.match(source("src/scripts/theme.ts"), /DOMContentLoaded/);
  assert.match(source("src/scripts/theme.ts"), /pageshow/);
});
