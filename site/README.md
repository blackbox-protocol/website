# blackboxprotocol.dev — launch site

Static launch site for Blackbox Protocol. Plain HTML/CSS with a tiny vanilla-JS
hook for a later in-browser playground. No framework, no bundler, no runtime
dependencies, no trackers, no external fonts, no CDNs. The only outbound links are
GitHub and `mailto:`.

This is the dedicated **website** repository (`blackbox-protocol/website`). It is
separate from the release repository (`blackbox-protocol/blackbox`); website work
is never committed to the release repo.

## Layout

```
site/
  _incoming/        Design sources / references (NOT shipped, gitignored):
                      master reference mockup, real recorder + planet source art,
                      original demo media (mp4/gif/poster), reference.html
  public/           Deploy root:
                      index.html      — the page
                      styles.css      — all styles (external → strict CSP)
                      main.js         — no-op #playground hook for the later playground
                      assets/         — favicon.svg, hero-blackbox.webp, planet-lower.webp
  scripts/          Guard scripts (Node built-ins only):
                      check-content.mjs   — fails on any banned/unsupported claim or stale number
                      check-external.mjs  — fails on any non-GitHub/mailto request
                      list-sentences.mjs  — prints every sentence for fact-checking
  netlify.toml      Deploy config (publish = public; base directory = site)
```

Production images are WebP derivatives optimized from the source art in
`_incoming/` (hero ~114 KB, planet ~33 KB). Source art is preserved untracked in
`_incoming/` and never overwritten.

## Demo

The verification centerpiece shows **captured, verbatim `blackbox verify` output**
from the shipped CLI (a real sign → verify → one-byte tamper → verify run), clearly
labelled as captured output. It is not a live verifier. A later phase replaces the
`#playground` region with the real in-browser Blackbox verifier built from the
public v0.1.0 release; until then nothing is simulated.

## Build & preview

No build step. Serve `site/public` with any static server:

```
npx serve site/public
```

## Checks

```
node site/scripts/check-content.mjs    # banned/unsupported claims + stale numbers (exit 1 on hit)
node site/scripts/check-external.mjs   # external-request allowlist (exit 1 on hit)
node site/scripts/list-sentences.mjs   # human fact-check aid (prints, never fails)
```

`check-content` and `check-external` run in CI (`.github/workflows/site-content.yml`,
Node 22, read-only permissions) on any change under `site/`.

## Deploy (Netlify)

`netlify.toml` sets `publish = "public"` and strict security headers (CSP locked to
`'self'`/`'none'`). The Netlify site's **base directory** must be set to `site` so
`publish = "public"` resolves to `site/public`.
