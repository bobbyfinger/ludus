// Point d'entrée : charge/crée l'état, branche le serveur HTTP, écoute sur PORT.
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { createServer } from "../server/http.ts";
import {
  dashboardPage,
  gazettePage,
  landingPage,
  ordersPage,
  reportsPage,
} from "../web/pages.ts";
import { duelDuJour, initGame, traiterOrdres, type GameState } from "./index.ts";
import { loadState, saveState } from "../persist/index.ts";
import { acheterGladiateur, vendreGladiateur, type Ludus } from "../school/index.ts";
import { startScheduler } from "../cron/scheduler.ts";
import { generateGladiator } from "../gen/gladiator.ts";
import { portraitSVG } from "../portrait/portrait.ts";

const DATA = process.env.DATA_PATH ?? "data/ludus.json";

// Fix ENOENT : créer récursivement le dossier de données AVANT loadState/saveState
// (data/ n'existe pas dans un checkout frais, writeFile échouait avec ENOENT).
await mkdir(dirname(DATA), { recursive: true });

let state: GameState;
try {
  state = (await loadState(DATA)) as GameState;
} catch {
  state = initGame(1);
}
await saveState(DATA, state);

// ponytail: dispatchAction (P4-T2, src/game/index.ts) pas encore exporté dans ce
// worktree — équivalent local minimal (acheter/vendre via school) ; soigner/forger/
// entrainer attendent la migration du roster par P4-T2 (champs staff manquants sur
// Gladiator). À remplacer par l'import dès que P4-T2 atterrit.
function dispatchAction(
  state: GameState,
  action: string,
  payload: { seed?: string | number; stat?: string },
): { state: GameState; ok: boolean; reason?: string } {
  const seed = Number(payload.seed);
  if (!Number.isFinite(seed)) return { state, ok: false, reason: "seed requis" };
  // school rend un Ludus (sans les champs de jeu) → on re-grafe l'historique/ordres.
  const graft = (l: Ludus): GameState => ({
    ...l,
    duelsHistory: state.duelsHistory,
    gazettes: state.gazettes,
    orders: state.orders,
  });
  if (action === "acheter") {
    const next = acheterGladiateur(state, seed >>> 0);
    return next === state
      ? { state, ok: false, reason: "fonds insuffisants" }
      : { state: graft(next), ok: true };
  }
  if (action === "vendre") {
    const next = vendreGladiateur(state, seed);
    return next === state
      ? { state, ok: false, reason: "seed inconnu" }
      : { state: graft(next), ok: true };
  }
  return { state, ok: false, reason: `action '${action}' non supportée (P4-T2)` };
}

/** Parse un body POST : JSON plat OU form-encoded (URLSearchParams). */
function parseBody(body: string): Record<string, string> {
  try {
    const j = JSON.parse(body) as Record<string, unknown>;
    if (j && typeof j === "object") {
      return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]));
    }
  } catch {
    // pas du JSON → form-encoded
  }
  return Object.fromEntries(new URLSearchParams(body));
}

const server = createServer({
  landing: () => landingPage(),
  dashboard: () => dashboardPage(state),
  orders: () => ordersPage(state.roster),
  reports: () =>
    reportsPage(
      state.duelsHistory.map((d) => ({
        title: `Duel — victoire de ${d.winner ?? "personne"} (+${d.bourse})`,
        narration: d.narration,
      })),
    ),
  gazette: () => gazettePage(state.gazettes.at(-1) ?? ""),
  state: () => state,
  portrait: (seed: string) =>
    portraitSVG(
      generateGladiator(
        Number.isFinite(Number(seed))
          ? Number(seed)
          : [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 1),
      ),
    ),
  // ponytail: http.ts ne route que POST /api/orders → les actions passent par un
  // champ "action" du body ; le chemin POST /api/action/:action et la réponse 303
  // vers /dashboard (PRG) exigent un changement dans src/server/http.ts (hors scope).
  submitOrders: async (body: string) => {
    const data = parseBody(body);
    if (typeof data.action === "string" && data.action) {
      const r = dispatchAction(state, data.action, { seed: data.seed, stat: data.stat });
      state = r.state;
      if (!r.ok) console.warn(`action ${data.action}: ${r.reason}`);
    } else {
      state = traiterOrdres(state, data);
      state = duelDuJour(state, state.jour);
    }
    await saveState(DATA, state);
  },
});

// Tournoi du jour automatique : TOURNOI_MS (défaut 6 h) → duel du jour + sauvegarde.
const TOURNOI_MS = Number(process.env.TOURNOI_MS ?? 6 * 3600 * 1000);
startScheduler(
  () => state,
  (s) => {
    state = s as GameState;
  },
  TOURNOI_MS,
  async () => {
    state = duelDuJour(state, state.jour);
    await saveState(DATA, state);
  },
);

server.listen(Number(process.env.PORT ?? 3000));
