// Staff du ludus : médecin, forgeron, entraîneur — zéro hasard, fonctions pures.
// Types locaux duck-typés structurellement compatibles avec src/gen/gladiator.ts
// (aucun import croisé, intégration par vague ultérieure).

export type Attributes = {
  force: number;
  agilite: number;
  endurance: number;
  technique: number;
  coupDoeil: number;
};

export type StatName = keyof Attributes;

// Gladiator de src/gen + champs d'état gérés par le staff.
export type StaffGladiator = {
  seed: number;
  name: string;
  attributes: Attributes;
  hp: number;
  blessureJours: number; // jours de convalescence restants
  equipement: number; // niveau 0..5
  progression: number; // points d'entraînement carrière cumulés 0..5
};

export const COUT_MEDECIN = 30; // sesterces, fixe
export const COUT_ENTRAINEMENT = 25; // sesterces, fixe
export const coutForge = (g: StaffGladiator): number => 40 * (g.equipement + 1); // 40, 80, 120, 160, 200

/** Médecin : remet blessureJours à 0. Coût fixe 30 s. */
export function soigner(g: StaffGladiator): StaffGladiator {
  return { ...g, blessureJours: 0 };
}

/** Forgeron : équipement +1 (max 5), coût croissant 40×(n+1). Refus au cap. */
export function ameliorer(g: StaffGladiator): StaffGladiator {
  if (g.equipement >= 5) throw new Error("équipement déjà au maximum (5)");
  return { ...g, equipement: g.equipement + 1 };
}

/** Entraîneur : +1 sur stat (max 20) si plafond de progression carrière (max 5) non atteint. Coût 25 s. */
export function entrainer(g: StaffGladiator, stat: StatName): StaffGladiator {
  if (g.progression >= 5) throw new Error("plafond de progression atteint (5)");
  if (g.attributes[stat] >= 20) throw new Error(`${stat} déjà au maximum (20)`);
  return {
    ...g,
    attributes: { ...g.attributes, [stat]: g.attributes[stat] + 1 },
    progression: g.progression + 1,
  };
}
