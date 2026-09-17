import { test } from "node:test";
import assert from "node:assert/strict";
import {
  creerLudus,
  acheterGladiateur,
  vendreGladiateur,
  payerSalaires,
  revenusDuel,
  avanceJournee,
  coutGladiateur,
  estBlesse,
  SALAIRE_PAR_TETE,
  type Ludus,
} from "../../src/school/index.ts";
import { generateGladiator } from "../../src/gen/gladiator.ts";

// Coûts déterministes vérifiés : seed 7 ⇒ total 53 ⇒ coût 46 ; seed 42 ⇒ total 59 ⇒ coût 51.
const COUT_7 = 46;
const COUT_42 = 51;

test("état initial : 1000 sesterces, jour 1, roster vide", () => {
  const l = creerLudus(1, "Ludus Magnus");
  assert.deepEqual(l, { id: 1, nom: "Ludus Magnus", argent: 1000, jour: 1, roster: [] });
});

test("achat refusé si fonds < coût : même objet, argent et roster intacts", () => {
  const pauvre: Ludus = { ...creerLudus(1, "Pauvre"), argent: COUT_7 - 1 };
  const apres = acheterGladiateur(pauvre, 7);
  assert.equal(apres, pauvre, "refus ⇒ identité (aucun changement)");
  assert.equal(apres.argent, COUT_7 - 1);
  assert.equal(apres.roster.length, 0);
});

test("achat réussi : débit exact, gladiateur ajouté, zéro mutation de l'état d'origine", () => {
  const l = creerLudus(1, "Magnus");
  const apres = acheterGladiateur(l, 7);
  assert.equal(apres.argent, 1000 - COUT_7);
  assert.equal(apres.roster.length, 1);
  assert.equal(apres.roster[0].seed, 7);
  // Immutabilité : l'original est inchangé, le résultat est un nouvel objet
  assert.equal(l.argent, 1000);
  assert.equal(l.roster.length, 0);
  assert.notEqual(apres, l);
});

test("roster jamais négatif : vente du dernier membre, seed inconnu ⇒ identité", () => {
  let l = acheterGladiateur(creerLudus(1, "M"), 7);
  l = vendreGladiateur(l, 7);
  assert.equal(l.roster.length, 0);
  const intact = vendreGladiateur(l, 999);
  assert.equal(intact, l, "seed inconnu ⇒ aucun changement");
  assert.ok(l.roster.length >= 0);
});

test("vente : 75 % du coût, moitié prix si blessé", () => {
  const sain = acheterGladiateur(creerLudus(1, "M"), 7);
  const venduSain = vendreGladiateur(sain, 7);
  assert.equal(venduSain.argent, 1000 - COUT_7 + Math.round(COUT_7 * 0.75)); // 954 + 35 = 989
  assert.equal(venduSain.argent, 989);

  // Même gladiateur blessé (PV sous le max) → moitié prix
  const blesse: Ludus = {
    ...sain,
    roster: [{ ...sain.roster[0], hp: sain.roster[0].hp - 1 }],
  };
  assert.ok(estBlesse(blesse.roster[0]));
  const venduBlesse = vendreGladiateur(blesse, 7);
  assert.equal(venduBlesse.argent, 1000 - COUT_7 + Math.round(COUT_7 * 0.5)); // 954 + 23 = 977
  assert.equal(venduBlesse.argent, 977);
});

test("salaires : somme modeste par tête, appliquée à la journée", () => {
  const l = acheterGladiateur(acheterGladiateur(creerLudus(1, "M"), 7), 42);
  assert.equal(payerSalaires(l).argent, 1000 - COUT_7 - COUT_42 - 2 * SALAIRE_PAR_TETE); // 893
  assert.equal(payerSalaires(l).argent, 893);
  assert.equal(l.jour, 1, "payerSalaires n'avance pas le jour");
});

test("revenusDuel : bourse au vainqueur du ludus, consolation au perdant du ludus, rien si étrangers", () => {
  let l = acheterGladiateur(acheterGladiateur(creerLudus(1, "M"), 7), 42);
  // seed 7 (du ludus) bat seed 99 (étranger) : bourse 200, consolation 50 ignorée
  l = revenusDuel(l, 7, 99, 200, 50);
  assert.equal(l.argent, 1000 - COUT_7 - COUT_42 + 200); // 1103
  assert.equal(l.argent, 1103);
  // Duel interne : les deux encaissent
  const interne = revenusDuel(l, 7, 42, 200, 50);
  assert.equal(interne.argent, 1103 + 250);
  // Deux étrangers : rien
  assert.equal(revenusDuel(l, 98, 99, 200, 50), l);
});

test("2 journées simulées : soldes exacts attendus (littéraux)", () => {
  // J1 : achat seed 7 (−46) et seed 42 (−51), duel : seed 7 vainqueur, bourse 200.
  // Avancée ×2 : jour 3, salaires 2×(2 têtes × 5) = −20.
  let l = creerLudus(1, "Ludus Magnus");
  l = acheterGladiateur(l, 7); // 954
  l = acheterGladiateur(l, 42); // 903
  l = revenusDuel(l, 7, 99, 200, 50); // 1103
  l = avanceJournee(l); // jour 2, 1103 − 10 = 1093
  l = avanceJournee(l); // jour 3, 1093 − 10 = 1083
  assert.equal(l.jour, 3);
  assert.equal(l.argent, 1083);
  assert.deepEqual(l.roster.map((g) => g.seed), [7, 42]);
});

test("avanceJournee : salaires forcés peuvent créer une dette (seul chemin vers le négatif), pas d'intérêts", () => {
  // Argent trop bas pour payer, mais aucune opération d'achat/vente ne peut le rendre négatif.
  const endette: Ludus = { ...creerLudus(1, "M"), argent: 3, roster: [generateGladiator(7)] };
  const j2 = avanceJournee(endette);
  assert.equal(j2.argent, 3 - SALAIRE_PAR_TETE); // −2 : dette explicite, autorisée
  const j3 = avanceJournee(j2);
  assert.equal(j3.argent, -2 - SALAIRE_PAR_TETE); // −7 : pas d'intérêts composés
  // L'achat, lui, reste refusé plutôt que de creuser le négatif
  assert.equal(acheterGladiateur(j3, 123), j3);
});

test("déterminisme économique : coût = round(50 × totalStats / 58), identique à chaque appel", () => {
  for (const seed of [7, 42, 1, 99, 123]) {
    const g = generateGladiator(seed);
    const total = Object.values(g.attributes).reduce((s, v) => s + v, 0);
    assert.equal(coutGladiateur(g), Math.round((50 * total) / 58));
    assert.equal(coutGladiateur(g), coutGladiateur(generateGladiator(seed)));
  }
});
