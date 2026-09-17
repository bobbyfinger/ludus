// Orchestrateur du jeu : état global, duel du jour, ordres, sérialisable tel quel.
import {
  acheterGladiateur,
  avanceJournee,
  creerLudus,
  revenusDuel,
  type Ludus,
} from "../school/index.ts";
import { generateGladiator } from "../gen/gladiator.ts";
import { createFighter, mulberry32, resolveDuel, type Style } from "../engine/index.ts";
import { narrateDuel } from "../report/index.ts";
import { gazetteDuJour } from "../gazette/index.ts";

export type DuelEntry = { narration: string; winner: string | null; bourse: number };

export type GameState = Ludus & {
  duelsHistory: DuelEntry[];
  gazettes: string[];
  /** seed → style de combat pour le prochain duel (ordres du joueur). */
  orders: Record<string, Style>;
};

// gen parle "défensif"/"coupDoeil", engine "defensif"/"coupdoeil" : traduction minimale.
const toEngineStyle = (s: string): Style =>
  s === "défensif" ? "defensif" : (s as Style);

const STYLES: Style[] = ["agressif", "prudent", "defensif"];
const isStyle = (s: unknown): s is Style => STYLES.includes(s as Style);

export function initGame(seed: number): GameState {
  let ludus = creerLudus(1, "Ludus Sang & Sueur");
  for (let k = 0; k < 4; k++) ludus = acheterGladiateur(ludus, (seed + k * 101) >>> 0);
  return { ...ludus, duelsHistory: [], gazettes: [], orders: {} };
}

/**
 * Duel du jour : 2 combattants du roster tirés par le seed, résolution, narration,
 * gazette, bourse encaissée, journée suivante. Roster < 2 ⇒ état inchangé.
 */
export function duelDuJour(state: GameState, seed: number): GameState {
  if (state.roster.length < 2) return state;
  const rng = mulberry32(seed);
  const i = Math.floor(rng() * state.roster.length);
  let j = Math.floor(rng() * (state.roster.length - 1));
  if (j >= i) j++;
  const [a, b] = [state.roster[i], state.roster[j]];
  const bourse = 50 + Math.floor(rng() * 200); // 50–249 sesterces, déterministe

  const styleOf = (g: typeof a): Style =>
    state.orders[g.seed] ?? toEngineStyle(g.style);
  const result = resolveDuel(
    createFighter({
      force: a.attributes.force,
      agilite: a.attributes.agilite,
      endurance: a.attributes.endurance,
      technique: a.attributes.technique,
      coupdoeil: a.attributes.coupDoeil,
    }),
    createFighter({
      force: b.attributes.force,
      agilite: b.attributes.agilite,
      endurance: b.attributes.endurance,
      technique: b.attributes.technique,
      coupdoeil: b.attributes.coupDoeil,
    }),
    [{ style: styleOf(a) }],
    [{ style: styleOf(b) }],
    seed,
  );

  const winner = result.winner === null ? null : result.winner === "A" ? a : b;
  const narration = narrateDuel(result, a.name, b.name);
  const duel: DuelEntry = { narration, winner: winner?.name ?? null, bourse };
  const gazette = gazetteDuJour(state.jour, [{ narration, vainqueur: duel.winner, bourse }], []);

  // Nul ⇒ aucun encaissement ; sinon bourse au vainqueur, consolation au perdant.
  const gagnant =
    winner === null
      ? state
      : revenusDuel(state, winner.seed, (winner === a ? b : a).seed, bourse, Math.floor(bourse / 4));
  // ponytail: les PV/sueur du duel ne sont pas répercutés sur le roster (récupération
  // implicite entre journées) ; à changer si la blessure persistante devient un enjeu.
  return {
    ...avanceJournee(gagnant),
    duelsHistory: [...state.duelsHistory, duel],
    gazettes: [...state.gazettes, gazette],
    orders: {}, // ordres consommés par le duel
  };
}

/** Stocke les ordres (seed → style) pour le prochain duel ; styles invalides ignorés. */
export function traiterOrdres(state: GameState, orders: Record<string, unknown>): GameState {
  const valid: Record<string, Style> = {};
  for (const [seed, style] of Object.entries(orders))
    if (isStyle(style)) valid[seed] = style;
  return { ...state, orders: valid };
}

// Ré-export pratique pour main.ts (portrait par seed depuis l'orchestrateur).
export { generateGladiator };
