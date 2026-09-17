// Génération seedée de gladiateurs — zéro dépendance, déterministe (même seed ⇒ bits identiques).
// Types locaux volontaires : aucune import depuis src/engine (intégration par vague ultérieure).

export type Attributes = {
  force: number;
  agilite: number;
  endurance: number;
  technique: number;
  coupDoeil: number;
};

export type CombatStyle = "agressif" | "prudent" | "défensif";

export type Origin =
  | "Gaulle"
  | "Thrace"
  | "Numidie"
  | "Germanie"
  | "Grèce"
  | "Hispanie"
  | "Syrie";

export type Gladiator = {
  seed: number;
  name: string;
  origin: Origin;
  style: CombatStyle;
  attributes: Attributes;
  hp: number; // PV dérivés de l'Endurance
};

/** PRNG mulberry32 — ~5 lignes, déterministe, suffit largement pour un jeu PBEM. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRAENOMINA = [
  "Lucius", "Marcus", "Gaius", "Quintus", "Publius", "Titus", "Sextus",
  "Decimus", "Gnaeus", "Spurius", "Manius", "Servius", "Appius", "Vibius",
  "Numerius",
] as const;

const NOMINA = [
  "Cornelius", "Julius", "Claudius", "Valerius", "Fabius", "Aemilius",
  "Livius", "Durus", "Ferox", "Rapax", "Victor", "Maurus", "Celer",
  "Fronto", "Galba",
] as const;

const ORIGINS: readonly Origin[] = [
  "Gaulle", "Thrace", "Numidie", "Germanie", "Grèce", "Hispanie", "Syrie",
];

const STYLES: readonly CombatStyle[] = ["agressif", "prudent", "défensif"];

const STAT_NAMES = ["force", "agilite", "endurance", "technique", "coupDoeil"] as const;
const MIN = 1;
const MAX = 20;

/**
 * Répartit un budget total de points entre les 5 attributs, bornes [1,20] respectées.
 * Budget fixe ± petit delta : aucune stat dominante possible à la création (cap 20).
 */
function rollAttributes(rng: () => number): Attributes {
  const stats: Record<string, number> = {};
  for (const s of STAT_NAMES) stats[s] = MIN;
  // Total ~58 ± 5 réparti : base 5 (1×5) + points à distribuer ⇒ aucune stat dominante (cap 20).
  let budget = 48 + Math.floor(rng() * 11); // +48..58 ⇒ total 53..63
  while (budget > 0) {
    const s = STAT_NAMES[Math.floor(rng() * STAT_NAMES.length)];
    if (stats[s] < MAX) {
      stats[s]++;
      budget--;
    } else if (STAT_NAMES.every((k) => stats[k] >= MAX)) {
      break; // ponytail: unreachable avec budget ≤ 63 < 100, garde défensive
    }
  }
  return {
    force: stats.force,
    agilite: stats.agilite,
    endurance: stats.endurance,
    technique: stats.technique,
    coupDoeil: stats.coupDoeil,
  };
}

export function generateGladiator(seed: number): Gladiator {
  const rng = mulberry32(seed);
  const attributes = rollAttributes(rng);
  const name = `${PRAENOMINA[Math.floor(rng() * PRAENOMINA.length)]} ${NOMINA[Math.floor(rng() * NOMINA.length)]}`;
  return {
    seed,
    name,
    origin: ORIGINS[Math.floor(rng() * ORIGINS.length)],
    style: STYLES[Math.floor(rng() * STYLES.length)],
    attributes,
    hp: attributes.endurance * 5,
  };
}
