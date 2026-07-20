import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
const passes = [];

function assert(condition, message) {
  (condition ? passes : failures).push(message);
}

function walk(directory) {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if ([".git", "node_modules", "dist"].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...walk(path));
    else output.push(path);
  }
  return output;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

const required = [
  "README.md",
  "LICENSE",
  "LICENSES/CC-BY-SA-4.0.txt",
  "ASSET-LICENSE.md",
  "TRADEMARKS.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "docs/PRODUCT.md",
  "docs/ARCHITECTURE.md",
  "docs/DESIGN.md",
  "docs/PRIVACY.md",
  "src/index.ts",
  "src/deck-bones/engine.ts",
  "src/dictionary/registry.ts",
  "src/one-slide-or-three/engine.ts",
  "src/you-are-here/engine.ts",
  "website/index.html",
  "website/dist/client/index.html",
  "website/dist/server/index.js",
  "website/.openai/hosting.json",
  "website/public/og.png",
  "website/public/assets/pitchdog-logomark.svg",
  "website/public/assets/visual-family-v2/slide-check-v2.webp",
  "website/public/assets/visual-family-v2/deck-bones-v2.webp",
  "website/public/assets/visual-family-v2/you-are-here-v2.webp",
  "website/public/assets/visual-family-v2/pitch-dictionary-v2.webp",
];

const missing = required.filter((path) => !existsSync(resolve(root, path)));
assert(missing.length === 0, missing.length ? `Missing release files: ${missing.join(", ")}` : `${required.length} release files present`);

const files = walk(root);
const emptyFiles = files
  .filter((path) => statSync(path).size === 0)
  .map((path) => relative(root, path));
assert(emptyFiles.length === 0, emptyFiles.length ? `Empty files: ${emptyFiles.join(", ")}` : "No zero-byte Drive impostors");

const forbiddenPathParts = [
  "KIMI-BUILD-REFERENCE",
  "PRIVATE VISUAL SOURCE",
  "SOURCE SNAPSHOTS",
  "MEGA HANDOVER",
  ".playwright-cli",
];
const forbiddenPaths = files
  .map((path) => relative(root, path))
  .filter((path) => forbiddenPathParts.some((part) => path.toUpperCase().includes(part)));
assert(forbiddenPaths.length === 0, forbiddenPaths.length ? `Private/review paths shipped: ${forbiddenPaths.join(", ")}` : "Private, review, and rejected build folders are absent");

const textExtensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs", ".ts", ".tsx", ".yml", ".yaml"]);
const textFiles = files.filter((path) => textExtensions.has(extname(path).toLowerCase()) || ["LICENSE", ".gitignore", ".gitattributes"].includes(relative(root, path)));
const workstationFindings = [];
const secretFindings = [];
const workstationRootPattern = new RegExp(`/(?:${"Us" + "ers"}|${"Vol" + "umes"})/`, "u");
const syncedDriveMarker = ["Google", "Drive", "Sync"].join(" ");
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
  /\bsk-[A-Za-z0-9_-]{20,}\b/u,
  /\bgh[opsu]_[A-Za-z0-9]{20,}\b/u,
  /\bAIza[A-Za-z0-9_-]{20,}\b/u,
  /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{12,}/iu,
];

for (const path of textFiles) {
  const body = readFileSync(path, "utf8");
  if (workstationRootPattern.test(body) || body.toLowerCase().includes(syncedDriveMarker.toLowerCase())) {
    workstationFindings.push(relative(root, path));
  }
  if (secretPatterns.some((pattern) => pattern.test(body))) {
    secretFindings.push(relative(root, path));
  }
}

assert(workstationFindings.length === 0, workstationFindings.length ? `Workstation paths found: ${workstationFindings.join(", ")}` : "No personal workstation paths");
assert(secretFindings.length === 0, secretFindings.length ? `Potential secrets found: ${secretFindings.join(", ")}` : "No common secret shapes");

const runtimeSources = [
  ...walk(resolve(root, "src")),
  ...walk(resolve(root, "website/src")),
].filter((path) => [".ts", ".js"].includes(extname(path)));
const networkFindings = [];
for (const path of runtimeSources) {
  const body = readFileSync(path, "utf8");
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/u.test(body) || /https?:\/\//u.test(body)) {
    networkFindings.push(relative(root, path));
  }
}
assert(networkFindings.length === 0, networkFindings.length ? `Runtime network capability found: ${networkFindings.join(", ")}` : "Domain and browser runtime source has no network primitive or remote URL");

const expectedHashes = {
  "website/public/assets/pitchdog-logomark.svg": "b55b32fe9d9e97003bd2ded49fbbe6b0b8b6dcc7a5accbb5489106b110ca1454",
  "website/public/assets/visual-family-v2/slide-check-v2.webp": "1c8b3be50d124e1e30db09d68dbc422645bfe8a62751c5eb3373a56cf47b64a6",
  "website/public/assets/visual-family-v2/deck-bones-v2.webp": "2250962b0d67bd2c0ffc2756c253b871f09c3d0d881f1ccb085617f8160d9e1c",
  "website/public/assets/visual-family-v2/you-are-here-v2.webp": "8e9a770313282aac28f826e1c258d65479ff951bdbba1a7d6c157264c1ea0805",
  "website/public/assets/visual-family-v2/pitch-dictionary-v2.webp": "2ddcb23717de87888042f01167524f96650a91e788a50d2f7ce05b8938698c9c",
};
const changedAssets = Object.entries(expectedHashes)
  .filter(([path, hash]) => !existsSync(resolve(root, path)) || sha256(resolve(root, path)) !== hash)
  .map(([path]) => path);
assert(changedAssets.length === 0, changedAssets.length ? `Protected runtime assets changed: ${changedAssets.join(", ")}` : "Approved logo duplicate and visual-family hashes match");

const hosting = JSON.parse(readFileSync(resolve(root, "website/.openai/hosting.json"), "utf8"));
assert(/^appgprj_[a-f0-9]+$/u.test(hosting.project_id ?? ""), "Sites project ID is present");

const readme = readFileSync(resolve(root, "README.md"), "utf8");
const liveLink = readme.match(/<a href="(https:\/\/[^\"]+)"><strong>Try it live ↗<\/strong><\/a>/u)?.[1];
assert(Boolean(liveLink && !liveLink.includes("github.com")), "README points to the real live site");

for (const message of passes) process.stdout.write(`PASS  ${message}\n`);
if (failures.length) {
  for (const message of failures) process.stderr.write(`FAIL  ${message}\n`);
  process.stderr.write(`\n${failures.length} release verification failure(s).\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`\nPublic release boundary is clean: ${passes.length} checks passed.\n`);
}
