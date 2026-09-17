// Point d'entrée : charge/crée l'état, branche le serveur HTTP, écoute sur PORT.
import { createServer } from "../server/index.ts";
import {
  dashboardPage,
  gazettePage,
  landingPage,
  ordersPage,
  reportsPage,
} from "../web/index.ts";
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
  reports: () => reportsPage(state.duelsHistory),
  gazette: () => gazettePage(state.gazettes.at(-1) ?? ""),
  state: () => state,
  portrait: (seed: number) => portraitSVG(generateGladiator(seed)),
  submitOrders: async (body: unknown) => {
    state = traiterOrdres(state, (body ?? {}) as Record<string, unknown>);
    state = duelDuJour(state, state.jour);
    await saveState(DATA, state);
  },
});

server.listen(Number(process.env.PORT ?? 3000));
