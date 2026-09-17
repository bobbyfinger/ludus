import { test } from "node:test";
import assert from "node:assert/strict";
import { startScheduler } from "../../src/cron/scheduler.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test("startScheduler appelle tick à chaque interval", async () => {
  let count = 0;
  const s = startScheduler(() => {}, () => {}, 10, () => {
    count++;
  });
  await sleep(55);
  s.stop();
  const atStop = count;
  await sleep(30);
  assert.ok(atStop >= 3, `ticks attendus >=3, reçu ${atStop}`);
  assert.equal(count, atStop, "stop() doit arrêter les ticks");
});

test("startScheduler accepte un tick async", async () => {
  let done = 0;
  const s = startScheduler(() => {}, () => {}, 5, async () => {
    await sleep(1);
    done++;
  });
  await sleep(30);
  s.stop();
  assert.ok(done >= 1, "au moins un tick async complété");
});

test("startScheduler avale un tick qui reject (pas d'unhandled rejection)", async () => {
  const errors: unknown[][] = [];
  const orig = console.error;
  console.error = (...a: unknown[]) => errors.push(a);
  const s = startScheduler(() => {}, () => {}, 5, async () => {
    throw new Error("boom saveState");
  });
  await sleep(20);
  s.stop();
  console.error = orig;
  assert.ok(errors.length >= 1, "erreur loggée");
  assert.match(String(errors[0]), /boom saveState/);
});
