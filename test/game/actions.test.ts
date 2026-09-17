import assert from "node:assert/strict";
import { test } from "node:test";
import { dispatchAction, initGame, type GameState } from "../../src/game/index.ts";
import { coutGladiateur } from "../../src/school/index.ts";
import { generateGladiator, type Gladiator } from "../../src/gen/gladiator.ts";

const SEED_ACHAT = 4242;
const coutAchat = coutGladiateur(generateGladiator(SEED_ACHAT));

test("acheter : roster +1, argent débité du coût exact", () => {
  const s = initGame(42);
  const { state: apres, ok } = dispatchAction(s, "acheter", { seed: SEED_ACHAT });
  assert.equal(ok, true);
  assert.equal(apres.roster.length, 5);
  assert.equal(apres.argent, s.argent - coutAchat);
  assert.equal(apres.roster[4].seed, SEED_ACHAT);
});

test("acheter sans seed : seed dérivée du jour, déterministe", () => {
  const s = initGame(42);
  const a = dispatchAction(s, "acheter");
  const b = dispatchAction(s, "acheter");
  assert.equal(a.ok, true);
  assert.deepEqual(a.state.roster[4], b.state.roster[4]);
});

test("vendre : roster -1, 75 % du coût encaissés (non blessé)", () => {
  const s = initGame(42);
  const seed = s.roster[0].seed;
  const { state: apres, ok } = dispatchAction(s, "vendre", { seed: String(seed) });
  assert.equal(ok, true);
  assert.equal(apres.roster.length, 3);
  assert.equal(apres.argent, s.argent + Math.round(coutGladiateur(s.roster[0]) * 0.75));
});

test("soigner : coût 30, blessureJours remis à 0", () => {
  const s = initGame(42);
  const blesse = { ...s.roster[0], blessureJours: 5 };
  const etat: GameState = { ...s, roster: [blesse, ...s.roster.slice(1)] };
  const { state: apres, ok } = dispatchAction(etat, "soigner", { seed: blesse.seed });
  assert.equal(ok, true);
  assert.equal(apres.argent, etat.argent - 30);
  assert.equal((apres.roster[0] as typeof blesse).blessureJours, 0);
});

test("forger : coût 40×(n+1), équipement +1", () => {
  const s = initGame(42);
  const seed = s.roster[1].seed;
  const { state: apres, ok } = dispatchAction(s, "forger", { seed });
  assert.equal(ok, true);
  assert.equal(apres.argent, s.argent - 40); // équipement 0 ⇒ 40×1
  const forge = apres.roster.find((g) => g.seed === seed) as Gladiator & { equipement: number };
  assert.equal(forge.equipement, 1);
  // deuxième forge : équipement 1 ⇒ 80
  const deux = dispatchAction(apres, "forger", { seed });
  assert.equal(deux.ok, true);
  assert.equal(deux.state.argent, apres.argent - 80);
});

test("entrainer : coût 25, stat +1, progression +1", () => {
  const s = initGame(42);
  const seed = s.roster[2].seed;
  const avant = s.roster[2].attributes.force;
  const { state: apres, ok } = dispatchAction(s, "entrainer", { seed, stat: "force" });
  assert.equal(ok, true);
  assert.equal(apres.argent, s.argent - 25);
  const t = apres.roster.find((g) => g.seed === seed) as Gladiator & { progression: number };
  assert.equal(t.attributes.force, avant + 1);
  assert.equal(t.progression, 1);
});

test("entrainer : stat invalide ⇒ refus, rien changé", () => {
  const s = initGame(42);
  const r = dispatchAction(s, "entrainer", { seed: s.roster[0].seed, stat: "magie" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "stat invalide");
  assert.equal(r.state, s);
});

test("refus fauché : argent insuffisant ⇒ état source retourné", () => {
  const s: GameState = { ...initGame(42), argent: 10 };
  for (const action of ["soigner", "forger", "entrainer"] as const) {
    const payload = action === "entrainer" ? { seed: s.roster[0].seed, stat: "force" } : { seed: s.roster[0].seed };
    const r = dispatchAction(s, action, payload);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "fonds insuffisants");
    assert.equal(r.state, s);
  }
  const pauvre: GameState = { ...s, argent: 0 };
  const r = dispatchAction(pauvre, "acheter", {});
  assert.equal(r.ok, false);
  assert.equal(r.reason, "fonds insuffisants");
  assert.equal(r.state.argent, 0);
  assert.equal(r.state.roster.length, 4);
});

test("action inconnue et seed inconnu ⇒ refus propres", () => {
  const s = initGame(42);
  const r = dispatchAction(s, "danser");
  assert.deepEqual(r, { state: s, ok: false, reason: "action inconnue" });
  const v = dispatchAction(s, "vendre", { seed: 999999 });
  assert.equal(v.ok, false);
  assert.equal(v.reason, "seed inconnu");
  assert.equal(v.state, s);
});

test("immutabilité : l'état source est intact après chaque action", () => {
  const s = initGame(42);
  const copie = structuredClone(s);
  dispatchAction(s, "acheter", { seed: SEED_ACHAT });
  dispatchAction(s, "vendre", { seed: s.roster[0].seed });
  dispatchAction(s, "soigner", { seed: s.roster[0].seed });
  dispatchAction(s, "forger", { seed: s.roster[0].seed });
  dispatchAction(s, "entrainer", { seed: s.roster[0].seed, stat: "agilite" });
  dispatchAction(s, "nimporte");
  assert.deepEqual(s, copie);
});
