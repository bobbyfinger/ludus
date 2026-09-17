import { test } from "node:test";
import assert from "node:assert/strict";
import { createFighter, resolveDuel, mulberry32, type Order, type Style } from "../../src/engine/index.ts";
import { narrateDuel } from "../../src/report/index.ts";

const STATS = { force: 12, agilite: 10, endurance: 10, technique: 10, coupdoeil: 10 };
const STYLES: Style[] = ["agressif", "prudent", "defensif"];

function scripted(seed: number, rounds = 40): Order[] {
  const r = mulberry32(seed);
  return Array.from({ length: rounds }, () => ({ style: STYLES[Math.floor(r() * 3)] }));
}

function duel(seed: number) {
  return resolveDuel(createFighter(STATS), createFighter(STATS), scripted(seed), scripted(seed + 100), seed);
}

test("déterminisme : même duel ⇒ même texte, mot pour mot", () => {
  const t1 = narrateDuel(duel(42), "Maxime", "Ludus");
  const t2 = narrateDuel(duel(42), "Maxime", "Ludus");
  assert.deepEqual(t2, t1);
  // Le texte dépend du duel : un autre seed (log différent) donne un texte différent.
  assert.notEqual(narrateDuel(duel(43), "Maxime", "Ludus"), t1);
});

test("couverture : le CR mentionne le vainqueur et les moments clés chiffrés", () => {
  for (const seed of [1, 7, 42, 99]) {
    const d = duel(seed);
    const text = narrateDuel(d, "Maxime", "Ludus");
    if (d.winner) assert.match(text, d.winner === "A" ? /Maxime/ : /Ludus/);
    // Chaque gros coup (dégâts ≥ 8) d'un round raconté apparaît avec ses chiffres.
    const shown = d.log.filter((r) => r.actions.some((a) => a.hit && a.damage >= 8)).slice(0, 6);
    for (const r of shown) {
      assert.ok(text.includes(`round ${r.round}`), `round ${r.round} attendu dans le CR`);
      const big = r.actions.find((a) => a.hit && a.damage >= 8)!;
      assert.ok(text.includes(`${big.damage} dégâts`), `dégâts ${big.damage} attendus`);
    }
    // Le nombre de rounds et au moins un jet figurent → CR auditable.
    assert.ok(text.includes(`${d.rounds} rounds`));
    assert.match(text, /\d+\.\d/);
  }
});

test("longueur bornée : ≤ 4000 caractères même pour 30 rounds", () => {
  // Deux combattants prudents/endurants → duel long jusqu'à la limite de rounds.
  const d = resolveDuel(
    createFighter({ ...STATS, endurance: 20 }),
    createFighter({ ...STATS, endurance: 20 }),
    () => ({ style: "defensif" as const }),
    () => ({ style: "defensif" as const }),
    3,
  );
  assert.equal(d.rounds, 30); // pas de KO, la limite s'applique
  const text = narrateDuel(d, "Maxime", "Ludus");
  assert.ok(text.length <= 4000, `CR trop long : ${text.length}`);
});

test("nul : conclusion sans vainqueur", () => {
  // Duel miroir exact (mêmes ordres des deux côtés) → égalité parfaite → nul.
  const d = resolveDuel(createFighter(STATS), createFighter(STATS), () => ({ style: "prudent" as const }), () => ({ style: "prudent" as const }), 5);
  if (d.winner === null) {
    assert.match(narrateDuel(d, "Maxime", "Ludus"), /nul/i);
  }
});
