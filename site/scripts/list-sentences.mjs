// SPDX-License-Identifier: Apache-2.0
// Prints every sentence / text fragment on the page so it can be checked line by
// line against the approved facts. Covers visible body text plus the non-visible
// text that still ships (title, meta description, alt text, aria-labels).
//
// Node built-ins only. Run: node site/scripts/list-sentences.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, "..", "public", "index.html"), "utf8");

const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };
function decode(s) {
  return s.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/g, (m) => ENTITIES[m]);
}

function attrValues(source, attr) {
  const re = new RegExp(`${attr}="([^"]*)"`, "gi");
  const out = [];
  for (const m of source.matchAll(re)) out.push(decode(m[1]).trim());
  return out.filter(Boolean);
}

// --- Non-visible shipped text ------------------------------------------------
const title = (html.match(/<title>([^<]*)<\/title>/i) || [, ""])[1].trim();
const desc = (html.match(/<meta name="description" content="([^"]*)"/i) || [, ""])[1].trim();
const alts = attrValues(html, "alt");
const arias = attrValues(html, "aria-label");

// --- Visible body text -------------------------------------------------------
let body = html
  .replace(/<script[\s\S]*?<\/script>/gi, "")
  .replace(/<style[\s\S]*?<\/style>/gi, "")
  .replace(/<head[\s\S]*?<\/head>/gi, "");
// Turn block/line boundaries into newlines so fragments don't run together.
body = body.replace(/<\/(p|h1|h2|h3|li|div|section|pre|figcaption|a|b|strong|span)>/gi, "\n")
           .replace(/<br\s*\/?>/gi, "\n");
body = body.replace(/<[^>]+>/g, "");        // strip remaining tags
body = decode(body);

const lines = body.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);

// Split each line into sentences on terminal punctuation, keeping short fragments.
const sentences = [];
for (const line of lines) {
  for (const part of line.split(/(?<=[.!?])\s+/)) {
    const t = part.trim();
    if (t) sentences.push(t);
  }
}

let n = 0;
console.log("=== Visible body text ===");
for (const s of sentences) console.log(`${String(++n).padStart(2, "0")}. ${s}`);

console.log("\n=== Non-visible shipped text (title / description / alt / aria-label) ===");
console.log(`T . ${title}`);
console.log(`D . ${desc}`);
for (const a of alts) console.log(`ALT. ${a}`);
for (const a of arias) console.log(`ARIA. ${a}`);
