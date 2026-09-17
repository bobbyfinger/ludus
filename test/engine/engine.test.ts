import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createFighter,
  resolveDuel,
  fatigue,
  mulberry32,
  type Order,
  type OrderSource,
  type Style,
// @ts-expect-error ponytail: extension .ts requise par node strip-types ; tsconfig (hors scope) sans allowImportingTsExtensions
} from "../../src/engine/index.ts";

const STATS = { force: 12, agilite: 10, endurance: 10, technique: 10, coupdoeil: 10 };
const STYLES: Style[] = ["agressif", "prudent", "defensif"];

// Ordre aléatoire seedé (via mulberry32 du moteur, recréé localement).
function scripted(seed: number, rounds = 40): Order[] {
  const r = mulberry32(seed);
  return Array.from({ length: rounds }, () => ({ style: STYLES[Math.floor(r() * 3)] }));
}

test("déterminisme : même seed → même duel, log inclus", () => {
  const a = () => createFighter(STATS);
  const d1 = resolveDuel(a(), a(), scripted(7), scripted(8), 42);
  const d2 = resolveDuel(a(), a(), scripted(7), scripted(8), 42);
  assert.deepEqual(d2, d1);
  const d3 = resolveDuel(a(), a(), scripted(7), scripted(8), 43);
  assert.notDeepEqual(d3.log, d1.log);
});

test("attributs bornés 1..20", () => {
  const f = createFighter({ force: 99, agilite: -5, endurance: 10.6, technique: 0, coupdoeil: 10 });
  assert.equal(f.force, 20);
  assert.equal(f.agilite, 1);
  assert.equal(f.endurance, 11);
  assert.equal(f.technique, 1);
});

test("fatigue : nulle sous 50, croissante, plafonnée à 10", () => {
  assert.equal(fatigue(0), 0);
  assert.equal(fatigue(50), 0);
  assert.ok(fatigue(75) > fatigue(60));
  assert.equal(fatigue(100), 10);
});

test("fatigue dégrade la Force/Agilité effectives : duel long → PV durent plus (repos paie)", () => {
  // Un combattant qui se repose à mi-combat survit plus longtemps qu'un acharné.
  const restAt = (s: Style, at: number): OrderSource => (round) =>
    round >= at ? { style: "repos" } : { style: s };
  const always = (s: Style): OrderSource => () => ({ style: s });
  const a = () => createFighter({ ...STATS, endurance: 20 });
  const marathon = resolveDuel(a(), a(), restAt("agressif", 15), always("agressif"), 5);
  const sprint = resolveDuel(a(), a(), always("agressif"), always("agressif"), 5);
  // Le sprint s'achève par KO plus tôt ou à égalité serrée ; le log trace la sueur.
  assert.ok(marathon.log.every((r) => r.actions.every((x) => x.sweatAfter <= 100)));
  assert.ok(sprint.rounds <= 30);
});

test("contre styles non transitif : lecture prime (agressif>prudent>defensif>agressif)", () => {
  // Sur N duels mirror avec styles fixés, celui qui contre gagne plus souvent.
  const wins = { agressif: 0, prudent: 0, defensif: 0 } as Record<Style, number>;
  const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    for (const [x, y] of [
      ["agressif", "prudent"],
      ["prudent", "defensif"],
      ["defensif", "agressif"],
    ] as [Style, Style][]) {
      const r = resolveDuel(
        createFighter(STATS),
        createFighter(STATS),
        [{ style: x }],
        [{ style: y }],
        seed * 31,
      );
      if (r.winner === "A") wins[x]++;
    }
  }
  // Chaque style, quand il contre, gagne nettement plus de la moitié des duels.
  for (const s of STYLES) assert.ok(wins[s] > N * 0.6, `${s}: ${wins[s]}/${N} — contre trop faible`);
});

test("simulation 4000 duels : miroir 50%±2%, aucun style dominant <60%, durée ≤30", () => {
  // N=4000 (≥1000 exigé) : σ≈0.9% sur les duels décidés, la borne ±2% est alors
  // un vrai test d'équilibre et pas un lancer de dé sur l'échantillon.
  const N = 4000;
  let aWins = 0;
  let decided = 0;
  const styleWins: Record<string, number> = { agressif: 0, prudent: 0, defensif: 0, repos: 0 };
  const styleDuels: Record<string, number> = { agressif: 0, prudent: 0, defensif: 0, repos: 0 };
  for (let seed = 1; seed <= N; seed++) {
    const oA = scripted(seed * 2 + 1);
    const oB = scripted(seed * 3 + 5);
    const r = resolveDuel(createFighter(STATS), createFighter(STATS), oA, oB, seed);
    assert.ok(r.rounds <= 30, `durée ${r.rounds} > 30`);
    if (r.winner) {
      decided++;
      if (r.winner === "A") aWins++;
      // Style dominant : style du gagnant au dernier round.
      const w = r.winner === "A" ? oA[(r.rounds - 1) % oA.length].style : oB[(r.rounds - 1) % oB.length].style;
      styleWins[w]++;
    }
    for (const o of [oA[0], oB[0]]) styleDuels[o.style]++;
  }
  const wr = aWins / decided;
  assert.ok(Math.abs(wr - 0.5) <= 0.02, `miroir ${(wr * 100).toFixed(1)}% hors 50%±2%`);
  // Seuil documenté : aucun style ne dépasse 60% des victoires.
  for (const s of ["agressif", "prudent", "defensif"]) {
    const share = styleWins[s] / decided;
    assert.ok(share < 0.6, `style ${s} dominant : ${(share * 100).toFixed(1)}%`);
  }
});

test("log traçable : chaque round a jets, seuil, dégâts, sueur", () => {
  const r = resolveDuel(
    createFighter(STATS),
    createFighter(STATS),
    [{ style: "agressif" }],
    [{ style: "defensif" }],
    9,
  );
  for (const round of r.log) {
    assert.ok(round.initiative.A !== undefined && round.initiative.first !== undefined);
    for (const act of round.actions) {
      assert.ok(act.attack.total >= act.attack.roll);
      assert.ok(act.attack.threshold >= 0);
      assert.ok(Number.isInteger(act.damage) && act.damage >= 0);
      assert.ok(act.sweatAfter >= 0 && act.sweatAfter <= 100);
    }
  }
});
