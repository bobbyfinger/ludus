// LUDUS — moteur de duel (Sang & Sueur). Lib pure, zéro dépendance.

export type Style = "agressif" | "prudent" | "defensif";
export type StyleOrRest = Style | "repos";
export type Stats = {
  force: number;
  agilite: number;
  endurance: number;
  technique: number;
  coupdoeil: number;
};
export type Fighter = Stats & { hp: number; maxHp: number; sweat: number };
export type Order = { style: StyleOrRest };
export type Side = "A" | "B";

// Contre non transitif : X > Y = X lit et contre Y. agressif>prudent>defensif>agressif.
const CONTRE: Record<Style, Style> = {
  agressif: "prudent",
  prudent: "defensif",
  defensif: "agressif",
};

const STYLE_MOD: Record<StyleOrRest, { atk: number; def: number; sweat: number; init: number }> = {
  agressif: { atk: 3, def: -1, sweat: 3, init: 2 },
  prudent: { atk: 0, def: 1, sweat: 1, init: 0 },
  defensif: { atk: -2, def: 3, sweat: 0, init: -2 },
  repos: { atk: -99, def: -2, sweat: -12, init: 0 },
};

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const STAT_MAX = 20;

export function createFighter(stats: Stats): Fighter {
  const s = {
    force: clamp(Math.round(stats.force), 1, STAT_MAX),
    agilite: clamp(Math.round(stats.agilite), 1, STAT_MAX),
    endurance: clamp(Math.round(stats.endurance), 1, STAT_MAX),
    technique: clamp(Math.round(stats.technique), 1, STAT_MAX),
    coupdoeil: clamp(Math.round(stats.coupdoeil), 1, STAT_MAX),
  };
  return { ...s, maxHp: 20 + s.endurance * 2, hp: 20 + s.endurance * 2, sweat: 0 };
}

// Fatigue : sueur > 50 → dégradation croissante de Force/Agilité (max 10 à 100).
export function fatigue(sweat: number): number {
  return sweat <= 50 ? 0 : (sweat - 50) / 5;
}

export type RoundLog = {
  round: number;
  orders: { A: StyleOrRest; B: StyleOrRest };
  initiative: { A: number; B: number; first: Side };
  actions: {
    side: Side;
    attack: { roll: number; bonus: number; total: number; threshold: number }; // threshold = jet+bonus défensif adverse
    hit: boolean;
    damage: number;
    hpAfter: number;
    sweatAfter: number;
  }[];
};

export type DuelResult = {
  winner: Side | null;
  rounds: number;
  log: RoundLog[];
};

export const MAX_ROUNDS = 30;

export type OrderSource =
  | Order[]
  | ((round: number, pub: { hp: number; sweat: number; opp: { hp: number; sweat: number } }) => Order);

// ponytail: ordres invalides (style inconnu) → STYLE_MOD[style] undefined, crash volontaire au premier accès.
function orderAt(orders: OrderSource, round: number, self: Fighter, opp: Fighter): Order {
  return typeof orders === "function"
    ? orders(round, { hp: self.hp, sweat: self.sweat, opp: { hp: opp.hp, sweat: opp.sweat } })
    : orders[round % orders.length];
}

export function resolveDuel(
  fighterA: Fighter,
  fighterB: Fighter,
  ordersA: OrderSource,
  ordersB: OrderSource,
  seed: number,
): DuelResult {
  const A = { ...fighterA };
  const B = { ...fighterB };
  const rng = mulberry32(seed);
  const log: RoundLog[] = [];

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Ordres soumis secrètement, résolus simultanément.
    const oA = orderAt(ordersA, round, A, B).style;
    const oB = orderAt(ordersB, round, B, A).style;
    const mA = STYLE_MOD[oA];
    const mB = STYLE_MOD[oB];

    // Lecture de l'adversaire : bonus/malus si on contre (ou subit) son style.
    const readA = oA === "repos" || oB === "repos" ? 0 : CONTRE[oA] === oB ? 3 : CONTRE[oB] === oA ? -3 : 0;
    const readB = -readA;

    // Initiative : Coup d'œil + modificateur d'ordre + jet. Le premier frappe avec +1.
    const initA = A.coupdoeil + mA.init + rng() * 10;
    const initB = B.coupdoeil + mB.init + rng() * 10;
    const first: Side = initA >= initB ? "A" : "B";

    const eff = (f: Fighter, style: StyleOrRest) => ({
      force: Math.max(1, f.force - fatigue(f.sweat)),
      agilite: Math.max(1, f.agilite - fatigue(f.sweat)),
      def: STYLE_MOD[style].def,
    });

    const entry: RoundLog = {
      round: round + 1,
      orders: { A: oA, B: oB },
      initiative: { A: initA, B: initB, first },
      actions: [],
    };

    const attackRoll = (att: Fighter, def: Fighter, oAtt: StyleOrRest, oDef: StyleOrRest, read: number, firstBonus: number) => {
      const a = eff(att, oAtt);
      const d = eff(def, oDef);
      const roll = rng() * 10;
      const bonus = a.force / 2 + att.technique + STYLE_MOD[oAtt].atk + read + firstBonus;
      const total = roll + bonus;
      const threshold = d.agilite + d.def + rng() * 10;
      const hit = total > threshold;
      // Dégâts : marge compte, Endurance amortit, fatigue de l'attaquant réduit le coup.
      const dmg = hit
        ? Math.max(1, Math.round(a.force / 2 + (total - threshold) / 3 - def.endurance / 4))
        : 0;
      return { roll, bonus, total, threshold, hit, dmg };
    };

    // Résolution simultanée : les deux attaques sont calculées sur l'état de début de round.
    const results = (["A", "B"] as const).map((side) => {
      const att = side === "A" ? A : B;
      const def = side === "A" ? B : A;
      const oAtt = side === "A" ? oA : oB;
      const oDef = side === "A" ? oB : oA;
      const read = side === "A" ? readA : readB;
      const firstBonus = side === first ? 1 : 0;
      return { side, ...attackRoll(att, def, oAtt, oDef, read, firstBonus), oAtt, att };
    });

    for (const r of results) {
      const def = r.side === "A" ? B : A;
      if (r.hit) def.hp = Math.max(0, def.hp - r.dmg);
      r.att.sweat = clamp(r.att.sweat + STYLE_MOD[r.oAtt].sweat + r.att.force / 5, 0, 100);
      entry.actions.push({
        side: r.side,
        attack: { roll: +r.roll.toFixed(2), bonus: +r.bonus.toFixed(2), total: +r.total.toFixed(2), threshold: +r.threshold.toFixed(2) },
        hit: r.hit,
        damage: r.dmg,
        hpAfter: def.hp,
        sweatAfter: r.att.sweat,
      });
    }

    log.push(entry);
    if (A.hp <= 0 || B.hp <= 0) break;
  }

  // Vainqueur : PV, puis sueur (moins fatigué). Double KO ou égalité parfaite → nul.
  let winner: Side | null = null;
  if (A.hp <= 0 && B.hp <= 0) winner = null;
  else if (B.hp <= 0) winner = "A";
  else if (A.hp <= 0) winner = "B";
  else if (A.hp !== B.hp) winner = A.hp > B.hp ? "A" : "B";
  else if (A.sweat !== B.sweat) winner = A.sweat < B.sweat ? "A" : "B";

  return { winner, rounds: log.length, log };
}
