import { test } from "node:test";
import assert from "node:assert/strict";
import {
  soigner,
  ameliorer,
  entrainer,
  coutForge,
  COUT_MEDECIN,
  COUT_ENTRAINEMENT,
  type StaffGladiator,
} from "../../src/staff/staff.ts";

const g = (over: Partial<StaffGladiator> = {}): StaffGladiator => ({
  seed: 1,
  name: "Lucius Ferox",
  attributes: { force: 10, agilite: 10, endurance: 10, technique: 10, coupDoeil: 10 },
  hp: 50,
  blessureJours: 0,
  equipement: 0,
  progression: 0,
  ...over,
});

test("médecin : blessureJours à 0, coût fixe 30, objet source intact", () => {
  const blessé = g({ blessureJours: 7 });
  const guéri = soigner(blessé);
  assert.equal(guéri.blessureJours, 0);
  assert.equal(COUT_MEDECIN, 30);
  assert.equal(blessé.blessureJours, 7); // pur : pas de mutation
  assert.notEqual(guéri, blessé);
});

test("forgeron : +1 par appel, coûts exacts 40/80/120/160/200, jamais >5, refus au cap", () => {
  let cur = g();
  for (const coût of [40, 80, 120, 160, 200]) {
    assert.equal(coutForge(cur), coût);
    cur = ameliorer(cur);
    assert.ok(cur.equipement <= 5);
  }
  assert.equal(cur.equipement, 5);
  assert.throws(() => ameliorer(cur), /maximum/);
});

test("entraîneur : +1 dans [1,20], progression max 5, coût 25, refus aux bornes", () => {
  assert.equal(COUT_ENTRAINEMENT, 25);
  let cur = g();
  for (let i = 1; i <= 5; i++) {
    cur = entrainer(cur, "force");
    assert.equal(cur.attributes.force, 10 + i);
    assert.equal(cur.progression, i);
  }
  assert.equal(cur.progression, 5);
  assert.throws(() => entrainer(cur, "agilite"), /progression/); // plafond carrière

  const maxStat = g({
    attributes: { force: 20, agilite: 10, endurance: 10, technique: 10, coupDoeil: 10 },
  });
  assert.throws(() => entrainer(maxStat, "force"), /maximum/); // stat déjà à 20
  const out = entrainer(maxStat, "agilite"); // mais une autre stat passe
  assert.equal(out.attributes.agilite, 11);
});

test("pureté : aucune mutation des attributs sources", () => {
  const base = g();
  const out = entrainer(base, "technique");
  assert.equal(base.attributes.technique, 10);
  assert.deepEqual(base.attributes, g().attributes);
  assert.equal(out.attributes.technique, 11);
});
