// Point d'entrée : charge/crée l'état, branche le serveur HTTP, écoute sur PORT.
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
import { generateGladiator } from "../gen/gladiator.ts";
import { portraitSVG } from "../portrait/portrait.ts";

const DATA = process.env.DATA_PATH ?? "data/ludus.json";

let state: GameState;
try {
  state = (await loadState(DATA)) as GameState;
} catch {
  state = initGame(1);
}
await saveState(DATA, state);

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
  submitOrders: async (body: unknown) => {
    state = traiterOrdres(state, (body ?? {}) as Record<string, unknown>);
    state = duelDuJour(state, state.jour);
    await saveState(DATA, state);
  },
});

server.listen(Number(process.env.PORT ?? 3000));
