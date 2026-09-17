// Orchestrateur du jeu : état global, duel du jour, ordres, sérialisable tel quel.
import {
  acheterGladiateur,
  avanceJournee,
  creerLudus,
  revenusDuel,
  vendreGladiateur,
  type Ludus,
} from "../school/index.ts";
import {
  COUT_ENTRAINEMENT,
  COUT_MEDECIN,
  ameliorer,
  coutForge,
  entrainer,
  soigner,
  type StaffGladiator,
  type StatName,
} from "../staff/staff.ts";
import { generateGladiator, type Gladiator } from "../gen/gladiator.ts";
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

// ---- Actions du joueur (vague P4) -----------------------------------------

export type ActionResult = { state: GameState; ok: boolean; reason?: string };

const refus = (state: GameState, reason: string): ActionResult => ({ state, ok: false, reason });

/** Gladiator (gen) vu par le staff : champs d'état absents → défauts. */
const toStaff = (g: Gladiator): StaffGladiator =>
  ({ blessureJours: 0, equipement: 0, progression: 0, ...g });

/** Débite `montant` si les fonds suffisent, sinon null (refus). */
function debit(state: GameState, montant: number): GameState | null {
  if (state.argent < montant) return null;
  return { ...state, argent: state.argent - montant };
}

const STATS: StatName[] = ["force", "agilite", "endurance", "technique", "coupDoeil"];

/**
 * Dispatch d'une action joueur : 'acheter' | 'vendre' | 'soigner' | 'forger' |
 * 'entrainer'. Pur et immuable : les refus retournent l'état source tel quel.
 */
export function dispatchAction(
  state: GameState,
  action: string,
  payload: { seed?: number | string; stat?: string } = {},
): ActionResult {
  const seedNum = payload.seed === undefined
    ? NaN
    : typeof payload.seed === "number"
      ? payload.seed
      : Number(payload.seed);

  switch (action) {
    case "acheter": {
      // seed payload, sinon seed dérivée du jour (déterministe).
      const seed = Number.isNaN(seedNum)
        ? (state.jour * 1000 + state.roster.length) >>> 0
        : seedNum;
      const res = acheterGladiateur(state, seed);
      if (res === state) return refus(state, "fonds insuffisants");
      return { state: res as GameState, ok: true };
    }
    case "vendre": {
      const res = vendreGladiateur(state, seedNum);
      if (res === state) return refus(state, "seed inconnu");
      return { state: res as GameState, ok: true };
    }
    case "soigner":
    case "forger":
    case "entrainer": {
      const g = state.roster.find((x) => x.seed === seedNum);
      if (!g) return refus(state, "seed inconnu");
      const staff = toStaff(g);
      let cout: number;
      let apres: StaffGladiator;
      try {
        if (action === "soigner") {
          cout = COUT_MEDECIN;
          apres = soigner(staff);
        } else if (action === "forger") {
          cout = coutForge(staff);
          apres = ameliorer(staff); // jette au cap 5 → refus propre via catch
        } else {
          const stat = payload.stat as StatName;
          if (!STATS.includes(stat)) return refus(state, "stat invalide");
          cout = COUT_ENTRAINEMENT;
          apres = entrainer(staff, stat); // jette aux caps → refus propre via catch
        }
      } catch (e) {
        return refus(state, e instanceof Error ? e.message : String(e));
      }
      const paye = debit(state, cout);
      if (!paye) return refus(state, "fonds insuffisants");
      return {
        // apres est `g` enrichi des champs staff : structurellement un Gladiator complet.
        state: { ...paye, roster: state.roster.map((x) => (x.seed === seedNum ? apres : x)) as Gladiator[] },
        ok: true,
      };
    }
    default:
      return refus(state, "action inconnue");
  }
}

// Ré-export pratique pour main.ts (portrait par seed depuis l'orchestrateur).
export { generateGladiator };
