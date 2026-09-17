import { test } from "node:test";
import assert from "node:assert/strict";
import { generateGladiator, mulberry32 } from "../../src/gen/gladiator.ts";

const N = 1000;
const seeds = Array.from({ length: N }, (_, i) => i);

test("déterminisme : même seed ⇒ gladiateur identique bit pour bit", () => {
  for (const seed of [0, 1, 42, 123456789, 4294967295]) {
    assert.deepEqual(generateGladiator(seed), generateGladiator(seed));
  }
  // Le PRNG lui-même est stable
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test("distribution : total de points dans bornes, stats bornées, hp dérivé", () => {
  const totals: number[] = [];
  const perStat: Record<string, number[]> = {};
  for (const seed of seeds) {
    const g = generateGladiator(seed);
    const attrs = Object.entries(g.attributes);
    for (const [, v] of attrs) assert.ok(v >= 1 && v <= 20, `stat ${v} hors [1,20]`);
    const total = attrs.reduce((s, [, v]) => s + v, 0);
    assert.ok(total >= 53 && total <= 63, `total ${total} hors [53,63]`);
    totals.push(total);
    for (const [k, v] of attrs) (perStat[k] ??= []).push(v);
    assert.equal(g.hp, g.attributes.endurance * 5);
  }
  // Écart-type par stat borné : aucune stat systématiquement dominante
  for (const [k, vals] of Object.entries(perStat)) {
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const varr = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
    const sd = Math.sqrt(varr);
    assert.ok(sd > 1 && sd < 8, `écart-type ${k} = ${sd} suspect`);
  }
  // Moyennes des stats proches entre elles (±2) : équilibre à la création
  const means = Object.values(perStat).map(
    (vals) => vals.reduce((s, v) => s + v, 0) / vals.length
  );
  assert.ok(Math.max(...means) - Math.min(...means) < 2, "déséquilibre entre stats");
});

test("distribution : chaque origine et style représenté", () => {
  const origins = new Set(), styles = new Set();
  for (const seed of seeds) {
    origins.add(generateGladiator(seed).origin);
    styles.add(generateGladiator(seed).style);
  }
  assert.equal(origins.size, 7);
  assert.equal(styles.size, 3);
});

test("unicité raisonnable des noms (couverture dense de l'espace 15×15=225)", () => {
  // ponytail: espace de noms = 225 combinaisons ; sur 1000 tirages l'attendu
  // est ~223 distincts — on exige une couverture ≥ 90 % de l'espace.
  const names = new Set(seeds.map((s) => generateGladiator(s).name));
  assert.ok(names.size >= 200, `seulement ${names.size} noms distincts`);
});
