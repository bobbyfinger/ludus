import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type ServerDeps } from "../../src/server/http.ts";

function fakeDeps(calls: { orders?: string[] } = {}): ServerDeps {
  return {
    landing: () => "<h1>landing</h1>",
    dashboard: () => "<h1>dashboard</h1>",
    orders: () => "<h1>duel</h1>",
    reports: () => "<h1>reports</h1>",
    gazette: () => "<h1>gazette</h1>",
    state: () => ({ round: 3 }),
    portrait: (seed: string) => `<svg>${seed}</svg>`,
    submitOrders: (body: string) => (calls.orders ??= []).push(body),
  };
}

test("routes serve injected content with correct content-types", async () => {
  const server = createServer(fakeDeps());
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const htmlCases: [string, string][] = [
    ["/", "<h1>landing</h1>"],
    ["/dashboard", "<h1>dashboard</h1>"],
    ["/duel", "<h1>duel</h1>"],
    ["/reports", "<h1>reports</h1>"],
    ["/gazette", "<h1>gazette</h1>"],
  ];
  for (const [path, body] of htmlCases) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "text/html; charset=utf-8");
    assert.equal(await res.text(), body);
  }

  const state = await fetch(base + "/api/state");
  assert.equal(state.status, 200);
  assert.equal(state.headers.get("content-type"), "application/json");
  assert.deepEqual(await state.json(), { round: 3 });

  const portrait = await fetch(base + "/api/portrait/maximus");
  assert.equal(portrait.status, 200);
  assert.equal(portrait.headers.get("content-type"), "image/svg+xml");
  assert.equal(await portrait.text(), "<svg>maximus</svg>");

  const missing = await fetch(base + "/nope");
  assert.equal(missing.status, 404);

  await new Promise<void>((r) => server.close(() => r()));
});

test("malformed portrait seed returns 400 without killing the server", async () => {
  const server = createServer(fakeDeps());
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const bad = await fetch(base + "/api/portrait/%zz");
  assert.equal(bad.status, 400);

  const ok = await fetch(base + "/api/portrait/maximus");
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "<svg>maximus</svg>");

  await new Promise<void>((r) => server.close(() => r()));
});

test("POST /api/orders forwards raw body and returns 204", async () => {
  const calls: { orders?: string[] } = {};
  const server = createServer(fakeDeps(calls));
  await new Promise<void>((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const res = await fetch(base + "/api/orders", { method: "POST", body: "ordres bruts" });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("content-type"), null);
  assert.deepEqual(calls.orders, ["ordres bruts"]);

  await new Promise<void>((r) => server.close(() => r()));
});
