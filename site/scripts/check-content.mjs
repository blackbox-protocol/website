// SPDX-License-Identifier: Apache-2.0
// Fails (exit 1) if any banned / unsupported claim, retired number, or removed
// mockup slogan appears in the deployable site source (site/public).
//
// Design (per the content-guard requirements): target specific CLAIM PHRASES,
// not bare words, so honest NEGATIVE wording is allowed. For example these are
// intentionally permitted:
//   "A receipt makes the record verifiable — not that the recorder told the truth about the world."
//   "No formal verification."
//   "The implementation is not formally verified."
// while the positive claims ("formally verified", "proves what happened", etc.)
// are rejected.
//
// Scope: site/public only — never reads this script or the README, so the banned
// list documented elsewhere cannot flag itself. Node built-ins only.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "public");
const TEXT_EXT = new Set([".html", ".htm", ".css", ".js", ".mjs", ".svg", ".json", ".txt", ".webmanifest", ".xml"]);

// Unsupported-claim / removed-slogan phrases (case-insensitive substring).
const BANNED_PHRASES = [
  // over-claiming what a receipt / the system establishes
  "proves what software did",
  "proves what actually happened",
  "proves what happened",
  "proves the outside world",
  "proves that",
  "proves what",
  "blackbox proves",
  "no trust required",
  // seven-axis over-claims
  "all seven axes pass",
  "all seven axes always run",
  "all seven axes are always evaluated",
  "all seven axes always",
  "seven axes always pass",
  // formal-methods / certification over-claims
  "formal proof",
  "nist certified",
  // external-standard compatibility / alignment (require separate evidence)
  "slsa aligned", "slsa-aligned", "slsa compatible", "slsa-compatible",
  "in-toto aligned", "in-toto compatible",
  "sigstore aligned", "sigstore compatible",
  "scitt aligned", "scitt-aligned", "scitt compatible", "scitt-compatible",
  "implements scitt", "scitt implementation",
  // decorative mockup slogans that were removed and must not return
  "trust nothing", "verify everything",
  "receipts tell the truth",
  "no network. no service", "just math",
  "same principles", "different altitude",
  "evidence over assertions",
];

// Retired launch numbers, comma-optional, not embedded in a longer digit run.
const BANNED_NUMBER_RE = /(?<!\d)(1,?143|1,?752|127,?000)(?!\d)/i;

// The sole permitted occurrence of "formal verification".
const ALLOWED_FORMAL = "No formal verification.";
// Negation-aware allowance for "formally verified" (honest negatives only).
const ALLOWED_FORMALLY_VERIFIED_RE = /\b(not|never|no|isn['’]?t|is not|aren['’]?t|are not|hasn['’]?t|has not|have not|without being)\s+formally verified/gi;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const failures = [];

for (const file of walk(PUBLIC_DIR)) {
  if (!TEXT_EXT.has(extname(file).toLowerCase())) continue;
  const raw = readFileSync(file, "utf8");
  const lower = raw.toLowerCase();
  const rel = file.slice(PUBLIC_DIR.length + 1);

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) failures.push(`${rel}: banned claim/slogan "${phrase}"`);
  }
  const numMatch = raw.match(BANNED_NUMBER_RE);
  if (numMatch) failures.push(`${rel}: retired number "${numMatch[0]}"`);

  // "formal verification": banned except the exact allowed denial string.
  const strippedFormal = raw.split(ALLOWED_FORMAL).join("");
  if (/formal verification/i.test(strippedFormal)) {
    failures.push(`${rel}: "formal verification" used outside the allowed "${ALLOWED_FORMAL}" denial`);
  }
  // "formally verified": positive claim banned; honest negatives allowed.
  const strippedFV = raw.replace(ALLOWED_FORMALLY_VERIFIED_RE, "");
  if (/formally verified/i.test(strippedFV)) {
    failures.push(`${rel}: positive claim "formally verified" (only honest negatives are allowed)`);
  }
}

if (failures.length > 0) {
  console.error("CONTENT CHECK FAILED:");
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("content check passed: no banned claims, retired numbers, or removed slogans in site/public");
