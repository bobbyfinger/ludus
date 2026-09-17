// Comptes-rendus narratifs de duel : texte français auditable dérivé du log chiffré.
import { mulberry32, type DuelResult, type RoundLog, type Side } from "../engine/index.ts";

// PRNG seedé par le duel lui-même (le log est une fonction pure du seed) : même duel ⇒ même texte.
function hashLog(log: RoundLog[]): number {
  let h = 0x811c9dc5;
  for (const c of JSON.stringify(log)) h = Math.imul(h ^ c.charCodeAt(0), 0x01000193);
  return h >>> 0;
}

const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

type Round = { n: number; hpA: number; hpB: number; sweA: number; sweB: number; notes: string[] };

// Analyse un round du log et produit les phrases chiffrées des moments marquants.
function analyze(r: RoundLog, prev: { hpA: number; hpB: number } | null): Round {
  const hp: Record<Side, number> = { A: prev?.hpA ?? 0, B: prev?.hpB ?? 0 };
  const swe: Record<Side, number> = { A: 0, B: 0 };
  const notes: string[] = [];
  for (const a of r.actions) {
    const def: Side = a.side === "A" ? "B" : "A";
    hp[def] = a.hpAfter;
    swe[a.side] = a.sweatAfter;
    if (a.hit && a.damage >= 8)
      notes.push(
        `Au round ${r.round}, ${a.side} envoie un coup lourd (` +
          `total ${a.attack.total.toFixed(1)} contre seuil ${a.attack.threshold.toFixed(1)}, ${a.damage} dégâts, adversaire à ${a.hpAfter} PV)`,
      );
    else if (a.hit && a.hpAfter <= 10 && a.hpAfter > 0)
      notes.push(
        `Au round ${r.round}, ${a.side} touche (` +
          `${a.attack.total.toFixed(1)} vs ${a.attack.threshold.toFixed(1)}) et met son rival à ${a.hpAfter} PV`,
      );
  }
  if (prev) {
    const leadBefore = prev.hpA === prev.hpB ? null : prev.hpA > prev.hpB ? "A" : "B";
    const leadNow = hp.A === hp.B ? null : hp.A > hp.B ? "A" : "B";
    if (leadBefore && leadNow && leadBefore !== leadNow)
      notes.push(`Au round ${r.round}, le combat se retourne : ${leadNow} passe devant (${hp.A} PV contre ${hp.B})`);
  }
  for (const s of ["A", "B"] as const)
    if (swe[s] >= 75) notes.push(`Au round ${r.round}, ${s} sue à ${swe[s].toFixed(0)} %`);
  return { n: r.round, hpA: hp.A, hpB: hp.B, sweA: swe.A, sweB: swe.B, notes };
}

export function narrateDuel(result: DuelResult, nameA: string, nameB: string): string {
  const rng = mulberry32(hashLog(result.log));
  const name: Record<Side, string> = { A: nameA, B: nameB };
  const first = result.log[0];
  const lines: string[] = [];

  lines.push(
    pick(rng, [
      `${nameA} (${first.orders.A}) affronte ${nameB} (${first.orders.B}) dans l'arène.`,
      `Duel : ${nameA} ouvre en ${first.orders.A}, ${nameB} répond en ${first.orders.B}.`,
      `${nameA} et ${nameB} s'élancent — styles : ${first.orders.A} contre ${first.orders.B}.`,
    ]),
  );

  let prev: { hpA: number; hpB: number } | null = null;
  const marked: Round[] = [];
  let quiet = 0;
  for (const r of result.log) {
    const a = analyze(r, prev);
    if (a.notes.length > 0) marked.push(a);
    else quiet++;
    prev = { hpA: a.hpA, hpB: a.hpB };
  }

  // ponytail: plafond ~6 rounds racontés ; au-delà on résume, bornant le CR à ~4 ko même pour 30 rounds.
  const shown = marked.slice(0, 6);
  const body: string[] = [];
  if (shown.length > 0)
    body.push(pick(rng, ["Les moments clés :", "Récit du combat :", "Ce qu'il faut retenir :"]));
  for (const m of shown)
    for (const note of m.notes) body.push(note.replace(/\b([AB])\b/g, (_s, s: string) => name[s as Side]));
  if (quiet > 0)
    body.push(
      pick(rng, [
        `${quiet} rounds d'observation et de feintes sans coup décisif.`,
        `Les ${quiet} autres rounds s'égrènent sans fracas.`,
      ]),
    );

  const last = result.log[result.log.length - 1];
  const final = analyze(last, null);
  if (result.winner) {
    const l = result.winner;
    const w = l === "A" ? final : { hpA: final.hpB, hpB: final.hpA, sweA: final.sweB, sweB: final.sweA };
    body.push(
      pick(rng, [
        `Verdict après ${result.rounds} rounds : ${name[l]} l'emporte (${w.hpA} PV contre ${w.hpB}, sueur ${w.sweA.toFixed(0)}/${w.sweB.toFixed(0)}).`,
        `Après ${result.rounds} rounds, ${name[l]} s'impose — ${w.hpA} PV restants contre ${w.hpB}, sueur ${w.sweA.toFixed(0)} % contre ${w.sweB.toFixed(0)} %.`,
      ]),
    );
  } else {
    body.push(
      pick(rng, [
        `Après ${result.rounds} rounds, ni ${nameA} ni ${nameB} ne domine : match nul (${final.hpA} PV chacun).`,
        `Double effort, double échec : nul après ${result.rounds} rounds (${final.hpA} contre ${final.hpB} PV).`,
      ]),
    );
  }

  return [...lines, ...body].join(" ");
}
