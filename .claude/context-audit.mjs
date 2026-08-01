#!/usr/bin/env node
/**
 * Context budget audit.
 *
 * Measures what this project costs in PERMANENT context — the files re-sent on every
 * single request — versus what is loaded on demand. Fails (exit 1) when a cap is broken.
 *
 * Copied into forged projects as `.claude/context-audit.mjs`.
 * Run:  node .claude/context-audit.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

/* Hard caps, in lines. Breaking one is a bug, not a judgement call. */
const CAPS = { "CLAUDE.md": 90, "AGENTS.md": 15, "PROJECT-STATE.md": 80 };

const words = (s) => (s.trim() ? s.trim().split(/\s+/).length : 0);
const lines = (s) => s.split("\n").length;
const tokens = (w) => Math.round(w * 1.33);
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : null);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".git") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/* ---------- always loaded ---------- */
const always = [];
let failed = false;

for (const name of ["CLAUDE.md", "AGENTS.md"]) {
  const body = read(join(ROOT, name));
  if (body) always.push({ file: name, w: words(body), l: lines(body) });
}

// Nested CLAUDE.md — loaded only when working in their directory, but cheap to surface.
const nested = walk(ROOT)
  .filter((p) => p.endsWith("/CLAUDE.md") && relative(ROOT, p) !== "CLAUDE.md")
  .map((p) => ({ file: relative(ROOT, p), w: words(read(p)), l: lines(read(p)) }));

// Skill descriptions: the only part of a skill that is permanently in context.
const skillDirs = existsSync(join(ROOT, ".claude/skills"))
  ? readdirSync(join(ROOT, ".claude/skills"))
  : [];
let descWords = 0;
const bodies = [];
for (const d of skillDirs) {
  const body = read(join(ROOT, ".claude/skills", d, "SKILL.md"));
  if (!body) continue;
  const fm = body.match(/^---\n([\s\S]*?)\n---/);
  const desc = fm?.[1].match(/description:\s*([\s\S]*?)(?=\n\w+:|$)/)?.[1] ?? "";
  descWords += words(desc);
  bodies.push({ name: d, w: words(body) });
}

const alwaysWords = always.reduce((s, f) => s + f.w, 0) + descWords;

/* ---------- on demand ---------- */
const onDemand = [];
const stateBody = read(join(ROOT, "PROJECT-STATE.md"));
if (stateBody) onDemand.push({ file: "PROJECT-STATE.md", w: words(stateBody), l: lines(stateBody) });

const docs = walk(join(ROOT, "docs")).filter((p) => p.endsWith(".md"));
if (docs.length)
  onDemand.push({ file: `docs/ (${docs.length})`, w: docs.reduce((s, p) => s + words(read(p)), 0) });

const bodyWords = bodies.reduce((s, b) => s + b.w, 0);
if (bodyWords) onDemand.push({ file: `skill bodies (${bodies.length})`, w: bodyWords });

for (const dir of ["work", "design-reference"]) {
  const hs = walk(join(ROOT, dir, "handoffs")).filter((p) => p.endsWith(".md"));
  if (hs.length)
    onDemand.push({ file: `${dir}/handoffs (${hs.length})`, w: hs.reduce((s, p) => s + words(read(p)), 0) });
}

/* ---------- report ---------- */
const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

console.log("\n  PERMANENT — re-sent on every request");
for (const f of always) {
  const cap = CAPS[f.file];
  const over = cap && f.l > cap;
  if (over) failed = true;
  console.log(
    `    ${pad(f.file, 34)} ${num(f.w, 6)} w  ${num(f.l, 4)} l` +
      (cap ? `   cap ${cap}${over ? "  ✗ OVER" : "  ok"}` : ""),
  );
}
console.log(`    ${pad(`skill descriptions (${bodies.length})`, 34)} ${num(descWords, 6)} w`);
console.log(`    ${pad("TOTAL", 34)} ${num(alwaysWords, 6)} w  ≈ ${tokens(alwaysWords)} tokens / request`);

if (nested.length) {
  console.log("\n  SCOPED — loaded only inside their directory");
  for (const f of nested) console.log(`    ${pad(f.file, 34)} ${num(f.w, 6)} w  ${num(f.l, 4)} l`);
}

console.log("\n  ON DEMAND — loaded only when the task needs it");
let demandWords = 0;
for (const f of onDemand) {
  demandWords += f.w;
  const cap = CAPS[f.file];
  const over = cap && f.l > cap;
  if (over) failed = true;
  console.log(
    `    ${pad(f.file, 34)} ${num(f.w, 6)} w` +
      (f.l ? `  ${num(f.l, 4)} l` : "        ") +
      (cap ? `   cap ${cap}${over ? "  ✗ OVER" : "  ok"}` : ""),
  );
}
console.log(`    ${pad("TOTAL", 34)} ${num(demandWords, 6)} w`);

const ratio = alwaysWords ? (demandWords / alwaysWords).toFixed(1) : 0;
console.log(`\n  Disclosure ratio: 1 : ${ratio}   (on-demand per permanent word)`);
if (ratio < 3 && demandWords > 0)
  console.log("  ⚠ Low ratio — knowledge that should sit in skills is probably inlined in CLAUDE.md.");

if (failed) {
  console.log("\n  ✗ A cap is broken. Move content out — do not raise the cap.");
  console.log("    Routing table: skill `context-protocol`.\n");
  process.exit(1);
}
console.log("\n  ✓ All caps respected.\n");
