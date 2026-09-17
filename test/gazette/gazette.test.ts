import { test } from "node:test";
import assert from "node:assert/strict";
import { gazetteDuJour, type DuelGazette } from "../../src/gazette/index.ts";

const DUELS: DuelGazette[] = [
  { narration: "Marcus terrasse un rétiaire au troisième assaut.", vainqueur: "Marcus", bourse: 120 },
  { narration: "Duel sanglant sous le soleil de midi.", vainqueur: "Crixus", bourse: 350 },
  { narration: "Égalité parfaite, la foule hue.", vainqueur: null, bourse: 80 },
];
const RUMEURS = ["Le laniste aurait des dettes.", "Un mirmillon s'entraînerait la nuit."];

test("structure : titres présents, chaque duel listé exactement une fois", () => {
  const md = gazetteDuJour(7, DUELS, RUMEURS);
  assert.match(md, /^# ACTA ARENAE — Jour 7\n/);
  assert.match(md, /^## À la une$/m);
  assert.match(md, /^## Résultats$/m);
  assert.match(md, /^## Rumeurs$/m);
  // Marcus/Crixus apparaissent chacun exactement une fois (narration ≠ noms de résultats)
  assert.equal(md.split("Crixus").length - 1, 1);
  assert.equal((md.match(/^- /gm) ?? []).length, 3 + 2); // 3 résultats + 2 rumeurs
  assert.match(md, /^- Match nul — bourse : 80 deniers$/m);
});

test("à la une = le duel à la plus grosse bourse (premier en cas d'égalité)", () => {
  const md = gazetteDuJour(1, DUELS, []);
  assert.match(md, /## À la une\n\nDuel sanglant sous le soleil de midi\./);
  const exAequo: DuelGazette[] = [
    { narration: "Premier récit.", vainqueur: "A", bourse: 100 },
    { narration: "Second récit.", vainqueur: "B", bourse: 100 },
  ];
  assert.match(gazetteDuJour(2, exAequo, []), /Premier récit\./);
});

test("cas vide : édition courte cohérente + rumeurs", () => {
  const md = gazetteDuJour(3, [], RUMEURS);
  assert.match(md, /^# ACTA ARENAE — Jour 3\n/);
  assert.match(md, /Le sable reposa ce jour\./);
  assert.ok(!md.includes("## Résultats"));
  assert.match(md, /- Le laniste aurait des dettes\./);
});

test("déterminisme : même entrée ⇒ même sortie", () => {
  assert.equal(gazetteDuJour(9, DUELS, RUMEURS), gazetteDuJour(9, DUELS, RUMEURS));
});
