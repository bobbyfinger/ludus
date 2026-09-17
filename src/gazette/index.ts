export interface DuelGazette {
  narration: string;
  vainqueur: string | null;
  bourse: number;
}

/**
 * Gazette « Acta Arenae » : rendu markdown déterministe de la journée.
 * Zéro dépendance ; l'ordre d'entrée est préservé (stabilité garantie).
 */
export function gazetteDuJour(jour: number, duels: DuelGazette[], rumeurs: string[]): string {
  const lignes: string[] = [`# ACTA ARENAE — Jour ${jour}`, ""];

  if (duels.length === 0) {
    lignes.push("## À la une", "", "Le sable reposa ce jour.");
  } else {
    // À la une = plus grosse bourse ; première occurrence en cas d'égalité (stable).
    const vedette = duels.reduce((a, b) => (b.bourse > a.bourse ? b : a));
    lignes.push(
      "## À la une",
      "",
      vedette.narration,
      "",
      "## Résultats",
      "",
      ...duels.map(
        (d) =>
          `- ${d.vainqueur === null ? "Match nul" : d.vainqueur} — bourse : ${d.bourse} deniers`,
      ),
    );
  }

  lignes.push("", "## Rumeurs", "");
  if (rumeurs.length === 0) lignes.push("- Aucune rumeur ce jour.");
  else lignes.push(...rumeurs.map((r) => `- ${r}`));
  return lignes.join("\n") + "\n";
}
