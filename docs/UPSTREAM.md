# Upstream provenance

This is a customization of the genuine [AstroPaper](https://github.com/satnaing/astro-paper) template, not a visual reimplementation.

- Upstream `main` resolved on 2026-10-29: `35cfa7fbe0b897306d27670d3819e55d5205f3dd`.
- Template package version: 6.1.0 (Astro 7).
- Official source archive: `https://github.com/satnaing/astro-paper/archive/refs/heads/main.tar.gz`.
- MIT license retained in `LICENSE`; upstream documentation retained in `docs/ASTROPAPER-UPSTREAM.md`.
- Customizations: Chinese UI; AIOps branding; system fonts (no remote font fetch); deterministic Markdown import; deployment base support; content/build checks; GitHub Pages workflows. Dynamic OG generation disabled; static SVG fallback supplied.
- Package versions are frozen by `package-lock.json`; use `npm ci`, not a fresh template clone, for reproduction.
