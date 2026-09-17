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
import { duelDuJour, dispatchAction, initGame, traiterOrdres, type GameState } from "./index.ts";
import { loadState, saveState } from "../persist/index.ts";
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
  // Actions : POST /api/action/:action (http.ts) arrive ici avec action= dans le
  // body ; dispatchAction (src/game/index.ts) branche les 5 actions métier.
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
