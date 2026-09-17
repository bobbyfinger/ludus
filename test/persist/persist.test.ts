import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveState, loadState } from "../../src/persist/index.ts";

const state = { ecole: { nom: "Ludus Magna" }, gladiateurs: [{ id: 1, nom: "Flamma" }] };

async function tmpPath(): Promise<string> {
  return join(await mkdtemp(join(tmpdir(), "ludus-persist-")), "state.json");
}

test("round-trip save→load restitue l'état à l'identique", async () => {
  const path = await tmpPath();
  await saveState(path, state);
  assert.deepEqual(await loadState(path), state);
});

test("JSON corrompu → erreur propre", async () => {
  const path = await tmpPath();
  await writeFile(path, "{ pas du json", "utf8");
  await assert.rejects(loadState(path), /corrompu/);
});

test("schéma inconnu → erreur propre", async () => {
  const path = await tmpPath();
  await writeFile(path, JSON.stringify({ schema: 99, savedAt: "2024-01-01T00:00:00Z", state: {} }), "utf8");
  await assert.rejects(loadState(path), /schéma non supporté/);
});

test("pas de fichier .tmp résiduel après save", async () => {
  const path = await tmpPath();
  await saveState(path, state);
  assert.deepEqual(await readdir(join(path, "..")), ["state.json"]);
});

test("save écrase proprement un état précédent", async () => {
  const path = await tmpPath();
  await saveState(path, state);
  const nouveau = { ecole: { nom: "Autre" }, gladiateurs: [] };
  await saveState(path, nouveau);
  assert.deepEqual(await loadState(path), nouveau);
});
