/**
 * Generates one Markdown handoff per screen + INDEX.md + START-PROMPTS.md.
 * Source of truth for unit metadata = the UNITS array below.
 * Existing statuses in INDEX.md are preserved across runs; a unit's `status`
 * field is only the initial default on first generation.
 * Run:  node work/_generate-units.mjs
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const HANDOFFS = join(ROOT, "handoffs");
mkdirSync(HANDOFFS, { recursive: true });

const PROJECT = "MusicApp";
const UNIT_NAME = "screen";
const WORK_DIR = "work";
const VERIFY = "npx tsc --noEmit && npx eslint .";
const BUILD_SKILL = "build-a-screen";
const CONVENTIONS_SKILL = "musicapp-conventions";
const ARCHITECTURE_RULE = "the layered architecture (context -> src/lib + src/db -> native modules)";
const CONSTRAINTS = "strings via t() (fr+en), styles via useThemedStyles, Android + JDK 21";

/* Visual projects point each unit at a mockup in ARTIFACT_DIR, named <id>ARTIFACT_EXT.
   Leave ARTIFACT_DIR empty and every artifact reference disappears — the existing
   implementation becomes the reference instead. A unit whose file is missing emits no
   link at all and is reported at the end, so the directory never ships a dead one. */
const ARTIFACT_DIR = "work/mockups";
const ARTIFACT_EXT = ".html";
const HAS_ARTIFACT = ARTIFACT_DIR !== "";
const artifactLeaf = HAS_ARTIFACT ? ARTIFACT_DIR.split("/").pop() : "";
const artifactPath = (u) => `${ARTIFACT_DIR}/${u.id}${ARTIFACT_EXT}`;
const hasArtifact = (u) =>
  HAS_ARTIFACT && existsSync(join(ROOT, artifactLeaf, `${u.id}${ARTIFACT_EXT}`));

/* UNITS — the queue. Order = build order. Add an object, re-run. */
const UNITS = [
  { id: "home", title: "Home", entry: "tab", path: "src/screens/HomeScreen.tsx", container: "App.tsx", priority: "P0", status: "✅ done",
    pieces: { UI: ["CollectionRow", "TrackRow carousel", "GradientTile"] }, states: ["most-played + recents", "empty library"], notes: ["quick grid shows the 3 most-played tracks"] },
  { id: "library", title: "Library", entry: "tab", path: "src/screens/LibraryScreen.tsx", container: "App.tsx", priority: "P0", status: "✅ done",
    pieces: { UI: ["CollectionRow", "SwipeableSheet", "filters chips"] }, states: ["all/albums/playlists/youtube/local", "folder view", "empty"], notes: ["playlist folders live here"] },
  { id: "youtube", title: "YouTube (native tab)", entry: "tab", path: "src/screens/YoutubeScreen.tsx", container: "App.tsx", priority: "P0", status: "✅ done",
    pieces: { UI: ["YtVideoRow", "DownloadsSheet"], lib: ["ytExtractor (search/trending/suggest)"] }, states: ["trending", "search + suggestions", "load more", "error/offline"], notes: ["InnerTube via NewPipeExtractor; web fallback via globe icon"] },
  { id: "youtube-video", title: "YouTube video page", entry: "modal from youtube", path: "src/screens/YoutubeVideoScreen.tsx", container: "App.tsx", priority: "P0", status: "✅ done",
    pieces: { lib: ["ytExtractor getVideoInfo/getComments", "htmlText"] }, states: ["Video/Play/Download actions", "Comments + Related tabs", "load error"], notes: ["Play streams audio instantly; comment timestamps tinted"] },
  { id: "now-playing", title: "Now playing", entry: "modal", path: "src/screens/NowPlayingScreen.tsx", container: "App.tsx", priority: "P0", status: "✅ done",
    pieces: { player: ["track-player controls", "ShareCard"] }, states: ["playing/paused", "swipe artwork = prev/next", "pull-down to dismiss"], notes: ["swipe left = previous, right = next"] },
  { id: "queue", title: "Queue", entry: "modal", path: "src/screens/QueueScreen.tsx", container: "App.tsx", priority: "P1", status: "✅ done",
    pieces: { player: ["drag-to-reorder"] }, states: ["now playing + up next", "empty"], notes: ["row 0 is pinned (the playing track)"] },
  { id: "search", title: "Search", entry: "modal from header", path: "src/screens/SearchScreen.tsx", container: "App.tsx", priority: "P1", status: "✅ done",
    pieces: { UI: ["track rows"] }, states: ["query results over whole library", "empty hint"], notes: ["shared by Home and Library headers"] },
  { id: "recents", title: "Recents", entry: "modal from drawer", path: "src/screens/RecentsScreen.tsx", container: "App.tsx", priority: "P2", status: "✅ done",
    pieces: {}, states: ["play history", "empty"], notes: [] },
  { id: "settings", title: "Settings", entry: "modal from drawer", path: "src/screens/SettingsScreen.tsx", container: "App.tsx", priority: "P1", status: "✅ done",
    pieces: { lib: ["updater", "backup"] }, states: ["language/theme pickers", "searchable settings", "data backup", "check for updates"], notes: ["centered header with search"] },
  { id: "collection-detail", title: "Collection detail", entry: "modal", path: "src/screens/CollectionDetailScreen.tsx", container: "App.tsx", priority: "P1", status: "✅ done",
    pieces: { UI: ["TrackRow", "GradientTile"] }, states: ["album/playlist/liked/local", "search within", "empty"], notes: [] },
  { id: "youtube-web", title: "YouTube web fallback", entry: "modal from youtube", path: "src/screens/YoutubeWebScreen.tsx", container: "App.tsx", priority: "P2", status: "✅ done",
    pieces: { UI: ["floating download FABs", "DownloadsSheet"] }, states: ["browse m.youtube", "download video/playlist", "offline"], notes: ["playlist download creates a local playlist automatically"] },
  { id: "listening-stats", title: "Listening stats", entry: "modal from drawer", path: "src/screens/ListeningStatsScreen.tsx", container: "App.tsx", priority: "P1", status: "⬜ todo",
    pieces: { data: ["playCounts from the library store"] }, states: ["top tracks/artists", "empty"], notes: ["play counts already tracked in SQLite; drawer entry shows 'coming soon'"] },
  { id: "account-connect", title: "Account connect", entry: "modal from drawer", path: "src/screens/AccountScreen.tsx", container: "App.tsx", priority: "P2", status: "⬜ todo",
    pieces: {}, states: ["signed out", "signed in"], notes: ["scope undecided — no backend yet; confirm intent before building"] },
  { id: "identify", title: "Identify", entry: "modal from home header", path: "src/screens/IdentifyScreen.tsx", container: "App.tsx", priority: "P1", status: "⬜ todo",
    pieces: { UI: ["TrackArt", "AddToPlaylistSheet"], lib: ["recognise (audio capture + lookup)", "db: identifications table"], native: ["AudioRecorder module"] }, states: ["listening", "match", "no match", "history", "permission denied", "offline"], notes: ["A match feeds the existing YouTube search → download pipeline", "Every identification is kept, so a song caught offline can be fetched later"] },
  { id: "player-styles", title: "Player styles", entry: "modal from drawer", path: "src/screens/PlayerStylesScreen.tsx", container: "App.tsx", priority: "P2", status: "⬜ todo",
    pieces: {}, states: ["style picker", "preview"], notes: ["cosmetic variants for the now-playing screen"] },
];

const list = (arr) => (arr?.length ? arr.map((x) => `- ${x}`).join("\n") : "- _none yet_");
const piecesBlock = (pieces = {}) =>
  Object.entries(pieces).map(([g, items]) => `**${g}**\n\n${list(items)}`).join("\n\n") || "- _to be defined_";

const shortPrompt = (u) =>
  `${u.status === "✅ done" ? "Work on" : "Build"} "${u.title}" for ${PROJECT} (${u.entry}). ` +
  `BEFORE coding, read: ${WORK_DIR}/handoffs/${u.id}.md, ` +
  (hasArtifact(u) ? `the artifact ${artifactPath(u)}, ` : "") +
  `the existing implementation in ${u.path}, ` +
  `and the ${BUILD_SKILL} skill (+ ${CONVENTIONS_SKILL}). ` +
  `Follow ${ARCHITECTURE_RULE} (container ${u.container}) and REUSE our shared pieces. ` +
  `${CONSTRAINTS}. Finish with: ${VERIFY}. Then refresh PROJECT-STATE.md and set this unit's status in ${WORK_DIR}/INDEX.md.`;

const handoffMd = (u) => `# Handoff — ${u.title}

> **Entry**: \`${u.entry}\` · **Priority**: ${u.priority} · **Container**: \`${u.container}\`

## 1. Read BEFORE coding (mandatory)

- 📍 **State**: [\`../../PROJECT-STATE.md\`](../../PROJECT-STATE.md) — what exists, what is decided
${hasArtifact(u) ? `- 🎨 **Artifact**: [\`${u.id}${ARTIFACT_EXT}\`](../${artifactLeaf}/${u.id}${ARTIFACT_EXT}) — the visual reference to match\n` : ""}- 💻 **Reference**: the existing implementation, \`${u.path}\` — match its conventions
- 📐 **Spec**: \`docs/BRIEF.md\`
- ⚠️ **Traps**: \`docs/STACK.md\` — check the APIs this unit uses
- 🛠️ **Skills**: \`${BUILD_SKILL}\`, \`${CONVENTIONS_SKILL}\`

## 2. Entry & files

- **Entry**: \`${u.entry}\`
- **Implementation**: \`${u.path}\`
- **Container**: \`${u.container}\`

## 3. Pieces — reuse first, create in the right layer if missing

${piecesBlock(u.pieces)}

## 4. States to cover

${list(u.states)}

## 5. Watch-points

${list(u.notes)}

## 6. Definition of Done

- [ ] ${hasArtifact(u) ? `Matches the artifact \`${u.id}${ARTIFACT_EXT}\`` : "Consistent with the surrounding code"}
- [ ] All states in §4 are handled
- [ ] ${CONSTRAINTS}
- [ ] Reuses shared pieces — no duplicated ad-hoc code
- [ ] \`${VERIFY}\` passes
- [ ] \`PROJECT-STATE.md\` refreshed and INDEX status updated

## 7. Start prompt (paste to Claude Code)

\`\`\`
${shortPrompt(u)}
\`\`\`
`;

const INDEX_PATH = join(ROOT, "INDEX.md");
const DEFAULT_STATUS = "⬜ todo";
function readStatuses() {
  if (!existsSync(INDEX_PATH)) return {};
  const statuses = {};
  for (const line of readFileSync(INDEX_PATH, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim());
    const idMatch = cells.find((c) => c.includes("./handoffs/"))?.match(/\.\/handoffs\/([\w-]+)\.md/);
    if (idMatch) statuses[idMatch[1]] = cells[cells.length - 2] || DEFAULT_STATUS;
  }
  return statuses;
}
const statuses = readStatuses();
const statusOf = (u) => statuses[u.id] ?? u.status ?? DEFAULT_STATUS;

for (const u of UNITS) writeFileSync(join(HANDOFFS, `${u.id}.md`), handoffMd(u), "utf8");

const row = (u) =>
  `| ${u.priority} | **${u.title}** | \`${u.entry}\` | [handoff](./handoffs/${u.id}.md)` +
  (hasArtifact(u) ? ` · [artifact](./${artifactLeaf}/${u.id}${ARTIFACT_EXT})` : "") +
  ` | \`${u.container}\` | ${statusOf(u)} |`;
const byPrio = (p) => UNITS.filter((u) => u.priority === p).map((u) => u.title);

writeFileSync(
  INDEX_PATH,
  `# ${UNIT_NAME} index — ${PROJECT}

Each ${UNIT_NAME} has a **handoff** (what to read, pieces, states, DoD, prompt)${
  HAS_ARTIFACT ? " and, where one exists, an **artifact** — the visual reference to match" : ""
}.
Generated — edit \`_generate-units.mjs\`, not this file.
**The Status column is the exception**: it is hand-updated and preserved across regenerations.

> Before building: read the handoff${HAS_ARTIFACT ? ", open the artifact" : ""}, then follow the \`${BUILD_SKILL}\` skill.

New work that is not listed here gets appended: add an object to the \`UNITS\` array and re-run the
generator. Nothing unit-sized should exist outside this table.

## ${UNIT_NAME}s

| Prio | ${UNIT_NAME} | Entry | Links | Container | Status |
| --- | --- | --- | --- | --- | --- |
${UNITS.map(row).join("\n")}

Status vocabulary: \`⬜ todo\` · \`🟡 in progress\` · \`✅ done\`

## Suggested order

1. **P0** — ${byPrio("P0").join(" · ") || "_none_"}
2. **P1** — ${byPrio("P1").join(" · ") || "_none_"}
3. **P2** — ${byPrio("P2").join(" · ") || "_none_"}

## Regenerate

\`\`\`bash
node ${WORK_DIR}/_generate-units.mjs
\`\`\`
`,
  "utf8",
);

writeFileSync(
  join(ROOT, "START-PROMPTS.md"),
  `# Start prompts — one ${UNIT_NAME} at a time

Copy a block into Claude Code to start a ${UNIT_NAME}. Each prompt forces reading the handoff and the
skills before coding, and closing the context loop after.

${UNITS.map((u) => `## ${u.title} — \`${u.entry}\` (${u.priority})\n\n\`\`\`\n${shortPrompt(u)}\n\`\`\`\n`).join("\n")}`,
  "utf8",
);

console.log(`OK — ${UNITS.length} handoff(s) + INDEX.md + START-PROMPTS.md generated.`);

if (HAS_ARTIFACT) {
  const missing = UNITS.filter((u) => !hasArtifact(u)).map((u) => `${u.id}${ARTIFACT_EXT}`);
  if (missing.length) {
    console.log(`\n${missing.length} ${UNIT_NAME}(s) without an artifact in ${ARTIFACT_DIR}/:`);
    for (const m of missing) console.log(`  - ${m}`);
  }
}
