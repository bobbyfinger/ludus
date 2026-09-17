// Scheduler minimal : setInterval + tick injecté (tournoi du jour), arrêtable pour les tests.
// ponytail: getState/setState ne sont pas consommés ici (le tick injecté ferme lui-même
// sur l'état) — gardés pour la signature convenue avec l'orchestrateur (main.ts).
export function startScheduler(
  _getState: () => unknown,
  _setState: (state: unknown) => void,
  intervalMs: number,
  tick: () => void | Promise<void>,
): { stop: () => void } {
  const id = setInterval(
    () => void Promise.resolve(tick()).catch((e) => console.error("tick:", e)),
    intervalMs,
  );
  return { stop: () => clearInterval(id) };
}
