import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const workerURL = new URL("../dist/server/index.js", import.meta.url);
workerURL.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerURL.href);
const clientRoot = fileURLToPath(new URL("../dist/client/", import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      const relative = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      if (relative.includes("..")) return new Response("Not found", { status: 404 });
      try {
        const body = await readFile(resolve(clientRoot, relative));
        return new Response(request.method === "HEAD" ? null : body, {
          status: 200,
          headers: { "content-type": contentTypes[extname(relative)] ?? "application/octet-stream" },
        });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    },
  },
};

const ctx = { waitUntil() {}, passThroughOnException() {} };

test("serves the built home page", async () => {
  const response = await worker.fetch(new Request("https://example.test/", {
    headers: { accept: "text/html" },
  }), env, ctx);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html/);
  assert.match(await response.text(), /Here’s The Thing/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("deep links fall back to the SPA document", async () => {
  const response = await worker.fetch(new Request("https://example.test/deck", {
    headers: { accept: "text/html,application/xhtml+xml" },
  }), env, ctx);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /id="app"/);
});

test("missing assets remain honest 404s", async () => {
  const response = await worker.fetch(new Request("https://example.test/assets/nope.webp", {
    headers: { accept: "image/webp" },
  }), env, ctx);
  assert.equal(response.status, 404);
});
