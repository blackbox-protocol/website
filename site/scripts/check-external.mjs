// SPDX-License-Identifier: Apache-2.0
// Fails (exit 1) if the deployable site source makes, or points at, any external
// request other than github.com or a mailto: link.
//
// Allowlist rationale:
//   - github.com            — the only outbound link the brief permits.
//   - mailto:               — hello@ / security@ contact links (not a fetch).
//   - www.w3.org/2000/svg   — the SVG XML namespace identifier. This is a name,
//                             not a URL that is ever fetched; standalone SVG
//                             requires it. Reported as allowed, with this note.
//
// Node built-ins only. Run: node site/scripts/check-external.mjs

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "public");
const TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".svg", ".json", ".txt", ".webmanifest", ".xml"]);

// A URL occurrence is allowed iff it matches one of these.
const ALLOWED = [
  /^https?:\/\/(www\.)?github\.com(\/|$)/i,
  /^https?:\/\/www\.w3\.org\/2000\/svg$/i, // SVG namespace, never fetched
];

const URL_RE = /https?:\/\/[^\s"'()<>]+/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const violations = [];
const allowedHits = [];

for (const file of walk(PUBLIC_DIR)) {
  if (!TEXT_EXT.has(extname(file).toLowerCase())) continue;
  const raw = readFileSync(file, "utf8");
  const rel = file.slice(PUBLIC_DIR.length + 1);
  for (const m of raw.matchAll(URL_RE)) {
    const url = m[0];
    if (ALLOWED.some((re) => re.test(url))) allowedHits.push(`${rel}: ${url}`);
    else violations.push(`${rel}: ${url}`);
  }
}

console.log("external-request check — allowed references:");
for (const a of allowedHits) console.log("  ok  " + a);

if (violations.length > 0) {
  console.error("EXTERNAL CHECK FAILED — disallowed external references:");
  for (const v of violations) console.error("  - " + v);
  process.exit(1);
}
console.log("external check passed: only github.com / mailto / SVG-namespace references present");
