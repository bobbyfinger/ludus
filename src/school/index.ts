// Économie du ludus — fonctions pures, coûts déterministes, zéro mutation des états passés.
import { generateGladiator, type Gladiator } from "../gen/gladiator.ts";

export type Ludus = {
  id: number;
  nom: string;
  argent: number; // sesterces
  jour: number; // journée de jeu, démarre à 1
  roster: Gladiator[];
};

export const ARGENT_DEPART = 1000; // sesterces
export const SALAIRE_PAR_TETE = 5; // sesterces / gladiateur / journée

export function creerLudus(id: number, nom: string): Ludus {
  return { id, nom, argent: ARGENT_DEPART, jour: 1, roster: [] };
}

export const totalStats = (g: Gladiator): number =>
  Object.values(g.attributes).reduce((s, v) => s + v, 0);

/** Coût d'achat déterministe : 50 sesterces par tranche de 58 points de stats. */
export const coutGladiateur = (g: Gladiator): number =>
  Math.round((50 * totalStats(g)) / 58);

/** Blessé = PV sous le maximum de création (Endurance × 5). */
export const estBlesse = (g: Gladiator): boolean =>
  g.hp < g.attributes.endurance * 5;

/** Refus (fonds insuffisants) ⇒ même objet retourné, identifiable par identité. */
export function acheterGladiateur(ludus: Ludus, seed: number): Ludus {
  const g = generateGladiator(seed);
  const cout = coutGladiateur(g);
  if (ludus.argent < cout) return ludus;
  return { ...ludus, argent: ludus.argent - cout, roster: [...ludus.roster, g] };
}

/** Vente : 75 % du coût, moitié prix si blessé. Seed inconnu ⇒ même objet. */
export function vendreGladiateur(ludus: Ludus, seed: number): Ludus {
  const g = ludus.roster.find((x) => x.seed === seed);
  if (!g) return ludus;
  const facteur = estBlesse(g) ? 0.5 : 0.75;
  return {
    ...ludus,
    argent: ludus.argent + Math.round(coutGladiateur(g) * facteur),
    roster: ludus.roster.filter((x) => x.seed !== seed),
  };
}

export function payerSalaires(ludus: Ludus): Ludus {
  return { ...ludus, argent: ludus.argent - SALAIRE_PAR_TETE * ludus.roster.length };
}

/**
 * Encaisse un duel : bourse si le vainqueur est du ludus, consolation si le
 * perdant est du ludus (duel interne = les deux). Un ludus ne paie jamais.
 */
export function revenusDuel(
  ludus: Ludus,
  seedVainqueur: number,
  seedPerdant: number,
  bourse: number,
  consolation: number,
): Ludus {
  let argent = ludus.argent;
  if (ludus.roster.some((g) => g.seed === seedVainqueur)) argent += bourse;
  if (ludus.roster.some((g) => g.seed === seedPerdant)) argent += consolation;
  if (argent === ludus.argent) return ludus; // aucun fighter du ludus ⇒ rien à encaisser
  return { ...ludus, argent };
}

export function avanceJournee(ludus: Ludus): Ludus {
  // ponytail: salaires forcés ⇒ dette possible (argent négatif), pas d'intérêts
  // ni d'amende ; si la dette doit être punitive, c'est un choix de game design à faire alors.
  return { ...payerSalaires(ludus), jour: ludus.jour + 1 };
}
