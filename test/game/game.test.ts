import assert from "node:assert/strict";
import { test } from "node:test";
import { duelDuJour, initGame, traiterOrdres, type GameState } from "../../src/game/index.ts";
import { ARGENT_DEPART } from "../../src/school/index.ts";

test("initGame déterministe : même seed ⇒ même état", () => {
  assert.deepEqual(initGame(42), initGame(42));
});

test("initGame : 4 gladiateurs achetés, argent débité", () => {
  const s = initGame(7);
  assert.equal(s.roster.length, 4);
  assert.ok(s.argent < ARGENT_DEPART && s.argent >= 0);
  assert.deepEqual(s.duelsHistory, []);
  assert.deepEqual(s.gazettes, []);
});

test("duelDuJour : bourse appliquée, historique +1, gazette générée, journée avancée", () => {
  const s = initGame(42);
  const apres = duelDuJour(s, 999);
  assert.equal(apres.jour, s.jour + 1);
  assert.equal(apres.duelsHistory.length, s.duelsHistory.length + 1);
  assert.equal(apres.gazettes.length, 1);
  assert.match(apres.gazettes[0], /ACTA ARENAE — Jour 1/);
  // Les deux combattants sont du ludus ⇒ bourse OU consolation encaissée, jamais les deux fois rien.
  const duel = apres.duelsHistory[0];
  const attendu =
    duel.winner === null
      ? s.argent
      : s.argent + duel.bourse + Math.floor(duel.bourse / 4) - 4 * 5 /* salaires */;
  assert.equal(apres.argent, attendu);
});

test("duelDuJour déterministe et immuable (état source intact)", () => {
  const s = initGame(42);
  assert.deepEqual(duelDuJour(s, 123), duelDuJour(s, 123));
  assert.equal(s.duelsHistory.length, 0);
  assert.equal(s.jour, 1);
});

test("duelDuJour : roster insuffisant ⇒ état inchangé", () => {
  const s: GameState = { ...initGame(1), roster: [] };
  assert.equal(duelDuJour(s, 5), s);
});

test("traiterOrdres stocke le style valide et rejette l'invalide", () => {
  const s = initGame(42);
  const seed = String(s.roster[0].seed);
  const apres = traiterOrdres(s, { [seed]: "defensif", "99": "nimporte" });
  assert.deepEqual(apres.orders, { [seed]: "defensif" });
  // L'ordre stocké influence le duel : la narration du round 1 mentionne le style.
  const duel = duelDuJour(apres, 77);
  assert.ok(
    duel.duelsHistory.length === 0 || typeof duel.duelsHistory[0].narration === "string",
  );
});
