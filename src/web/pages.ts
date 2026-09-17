// Pages HTML complètes (doctype → </html>) — fonctions pures, zéro framework, zéro asset externe.
// DA Rome antique : sable/terracotta/sang/or/bronze, serif lapidaire small-caps, frises mosaïque CSS, SPQR/lauriers SVG.
import type { Gladiator } from "../gen/gladiator.ts";
import type { Ludus } from "../school/index.ts";
import { portraitSVG } from "../portrait/portrait.ts";
import { coutGladiateur, estBlesse, totalStats } from "../school/index.ts";

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Palette centralisée — les tests vérifient la présence de ces hex dans le CSS.
const CSS = `
:root{--sable:#C2B280;--terracotta:#B3552E;--sang:#7A1F1F;--or:#C9A227;--bronze:#8C6A3F;--encre:#2b1d12;--papyrus:#f3e9d2}
*{box-sizing:border-box}
body{margin:0;font-family:Georgia,'Times New Roman',serif;color:var(--encre);
  background:var(--sable);
  background-image:radial-gradient(circle at 20% 30%, rgba(255,244,214,.35) 0 2px, transparent 3px),
    radial-gradient(circle at 70% 60%, rgba(122,31,31,.06) 0 3px, transparent 4px),
    linear-gradient(160deg, #d8c79b, var(--sable) 55%, #b39a68);
  background-size:37px 37px, 53px 53px, 100% 100%}
h1,h2,h3{font-variant:small-caps;letter-spacing:.12em;margin:.2em 0}
h1{font-size:2rem;color:var(--sang)}
a{color:var(--sang)}
.frise{height:10px;background:repeating-linear-gradient(90deg,
  var(--or) 0 12px, var(--terracotta) 12px 24px, var(--sang) 24px 34px, var(--bronze) 34px 46px)}
.stele{max-width:920px;margin:1.5rem auto;padding:1.5rem 2rem;background:var(--papyrus);
  border:4px double var(--bronze);box-shadow:0 6px 18px rgba(43,29,18,.35)}
.cta{display:inline-block;padding:.6rem 1.6rem;background:var(--sang);color:var(--papyrus);
  font-variant:small-caps;letter-spacing:.15em;text-decoration:none;border:2px solid var(--or)}
.cta:hover{background:var(--terracotta)}
.roster{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem}
.carte{border:2px solid var(--bronze);background:#faf3e0;padding:.6rem;text-align:center}
.carte svg{width:100%;max-width:120px;display:block;margin:0 auto}
.stat{font-size:.85rem;color:var(--bronze)}
.blesse{color:var(--sang);font-weight:bold}
.boutons{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin-top:.5rem}
button,input[type=submit]{font-family:inherit;font-variant:small-caps;letter-spacing:.08em;
  background:var(--bronze);color:var(--papyrus);border:1px solid var(--sang);padding:.25rem .7rem;cursor:pointer}
button:hover{background:var(--terracotta)}
form.inline{display:inline}
select{font-family:inherit}
.rapport{border-left:4px solid var(--sang);padding:.4rem 1rem;margin:1rem 0;background:#efe2c4}
.gazette h1{border-bottom:3px double var(--or);padding-bottom:.3rem}
.gazette li{margin:.3rem 0}
`;

// Lauriers + SPQR décoratifs, inline.
function embleme(): string {
  return `<svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SPQR">
  <text x="60" y="26" text-anchor="middle" font-family="Georgia,serif" font-size="18" fill="#7A1F1F" letter-spacing="4">SPQR</text>
  <path d="M8 20 Q28 4 44 18 M8 20 Q28 36 44 22" stroke="#C9A227" fill="none" stroke-width="2"/>
  <path d="M112 20 Q92 4 76 18 M112 20 Q92 36 76 22" stroke="#C9A227" fill="none" stroke-width="2"/>
</svg>`;
}

function page(title: string, body: string, extraClass = ""): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${CSS}</style>
</head>
<body>
<div class="frise"></div>
<main class="stele ${extraClass}">
${embleme()}
${body}
</main>
<div class="frise"></div>
</body>
</html>`;
}

/** Illustration d'arène : sable, murs, torches — SVG inline, décoratif. */
function areneSVG(): string {
  return `<svg width="560" height="240" viewBox="0 0 560 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="L'arène du ludus">
  <defs>
    <radialGradient id="sable" cx="50%" cy="40%"><stop offset="0%" stop-color="#d8c79b"/><stop offset="100%" stop-color="#C2B280"/></radialGradient>
  </defs>
  <rect width="560" height="240" fill="url(#sable)"/>
  <ellipse cx="280" cy="120" rx="240" ry="90" fill="#b89d6b"/>
  <path d="M0 0 L120 60 L120 180 L0 240 Z M560 0 L440 60 L440 180 L560 240 Z" fill="#8C6A3F"/>
  <rect x="0" y="0" width="560" height="14" fill="#7A1F1F"/>
  <rect x="0" y="14" width="560" height="6" fill="#C9A227"/>
  <g stroke="#B3552E" stroke-width="4">
    <line x1="120" y1="60" x2="440" y2="60"/><line x1="120" y1="90" x2="440" y2="90"/>
    <line x1="120" y1="150" x2="440" y2="150"/><line x1="120" y1="180" x2="440" y2="180"/>
  </g>
  <g>
    <rect x="128" y="52" width="8" height="16" fill="#8C6A3F"/>
    <path d="M132 30 L138 52 L126 52 Z" fill="#C9A227"/><circle cx="132" cy="26" r="5" fill="#B3552E" opacity=".9"/>
    <rect x="424" y="52" width="8" height="16" fill="#8C6A3F"/>
    <path d="M428 30 L434 52 L422 52 Z" fill="#C9A227"/><circle cx="428" cy="26" r="5" fill="#B3552E" opacity=".9"/>
  </g>
  <path d="M200 150 L230 105 L260 150 M300 150 L330 105 L360 150" stroke="#7A1F1F" stroke-width="6" fill="none" stroke-linecap="round"/>
</svg>`;
}

export function landingPage(): string {
  return page("LUDUS — Sang & Sueur renaît", `
<h1>LVDVS</h1>
<p style="font-style:italic">Sang &amp; Sueur renaît de ses cendres. L'école de gladiateurs ouvre à nouveau ses portes.</p>
${areneSVG()}
<p>Le sable est ratissé, les torches allumées. Recrutez des hommes, forgez leurs armes,
conduisez-les à la victoire — ou tombez avec eux. L'arène ne pardonne pas l'hésitation.</p>
<p><a class="cta" href="/dashboard">Entrer dans l'arène</a></p>
<p><a href="/gazette">Lire la Gazette du Sand</a> · <a href="/reports">Comptes-rendus des duels</a> · <a href="/orders">Ordres du jour</a></p>
`, "landing");
}

export function dashboardPage(ludus: Ludus): string {
  const cartes = ludus.roster
    .map((g) => {
      const lignes = Object.entries(g.attributes)
        .map(([k, v]) => `${k} ${v}`)
        .join(" · ");
      return `<div class="carte">
  <h3>${escapeHtml(g.name)}</h3>
  ${portraitSVG(g)}
  <p class="stat">${escapeHtml(g.origin)} · ${escapeHtml(g.style)} · stats ${totalStats(g)}</p>
  <p class="stat">${lignes}</p>
  <p class="stat">PV ${g.hp} ${estBlesse(g) ? '<span class="blesse">— blessé</span>' : ""} · valeur ${coutGladiateur(g)} s.</p>
  <div class="boutons">
    <form class="inline" method="post" action="/api/action/vendre"><input type="hidden" name="seed" value="${g.seed}"><button>Vendre</button></form>
    <form class="inline" method="post" action="/api/action/soigner"><input type="hidden" name="seed" value="${g.seed}"><button>Soigner</button></form>
    <form class="inline" method="post" action="/api/action/entrainer"><input type="hidden" name="seed" value="${g.seed}"><button>Entraîner</button></form>
    <form class="inline" method="post" action="/api/action/forger"><input type="hidden" name="seed" value="${g.seed}"><button>Forger</button></form>
  </div>
</div>`;
    })
    .join("\n");
  return page(`${ludus.nom} — tableau de bord`, `
<h1>${escapeHtml(ludus.nom)}</h1>
<p><strong>Jour ${ludus.jour}</strong> · Caisse : <strong>${ludus.argent} sesterces</strong> · ${ludus.roster.length} gladiateur(s)</p>
<div class="boutons" style="justify-content:flex-start">
  <form class="inline" method="post" action="/api/action/acheter"><button>Acheter un gladiateur</button></form>
</div>
<h2>Le roster</h2>
<div class="roster">
${cartes || "<p>Aucun gladiateur. La caisse attend mieux qu'un champion mort de faim.</p>"}
</div>
<p><a href="/orders">Donner les ordres du jour</a> · <a href="/reports">Comptes-rendus</a> · <a href="/gazette">Gazette</a></p>
`, "dashboard");
}

export function ordersPage(roster: Gladiator[]): string {
  const formes = roster
    .map(
      (g) => `<div class="carte">
  <h3>${escapeHtml(g.name)}</h3>
  <form method="post" action="/api/orders">
    <input type="hidden" name="seed" value="${g.seed}">
    <label>Style de combat :
      <select name="style">
        <option value="agressif"${g.style === "agressif" ? " selected" : ""}>Agressif</option>
        <option value="prudent"${g.style === "prudent" ? " selected" : ""}>Prudent</option>
        <option value="défensif"${g.style === "défensif" ? " selected" : ""}>Défensif</option>
      </select>
    </label>
    <div><input type="submit" value="Donner l'ordre"></div>
  </form>
</div>`,
    )
    .join("\n");
  return page("Ordres du jour", `
<h1>Ordres du jour</h1>
<p>Un gladiateur, un style. L'arène se moque des discours.</p>
<div class="roster">
${formes || "<p>Aucun gladiateur sous contrat.</p>"}
</div>
<p><a href="/dashboard">Retour au ludus</a></p>
`, "orders");
}

export function reportsPage(duels: { title: string; narration: string }[]): string {
  const rapports = duels
    .map((d) => `<section class="rapport"><h2>${escapeHtml(d.title)}</h2><p>${escapeHtml(d.narration)}</p></section>`)
    .join("\n");
  return page("Comptes-rendus des duels", `
<h1>Comptes-rendus</h1>
${rapports || "<p>Aucun duel livré. Le sable est encore propre.</p>"}
<p><a href="/dashboard">Retour au ludus</a></p>
`, "reports");
}

/** Markdown minimal → HTML : #/## titres, puces '-', **gras**. Échappe d'abord. ~30 lignes, pas de lib. */
export function mdToHtml(md: string): string {
  const lignes = escapeHtml(md).split("\n");
  const out: string[] = [];
  let dansListe = false;
  const gras = (s: string): string => s.replaceAll(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const l of lignes) {
    const t = l.trim();
    if (t.startsWith("## ")) out.push(`<h2>${gras(t.slice(3))}</h2>`);
    else if (t.startsWith("# ")) out.push(`<h1>${gras(t.slice(2))}</h1>`);
    else if (t.startsWith("- ")) {
      if (!dansListe) {
        out.push("<ul>");
        dansListe = true;
      }
      out.push(`<li>${gras(t.slice(2))}</li>`);
    } else if (t === "") {
      if (dansListe) {
        out.push("</ul>");
        dansListe = false;
      }
    } else out.push(`<p>${gras(t)}</p>`);
  }
  if (dansListe) out.push("</ul>");
  return out.join("\n");
}

export function gazettePage(md: string): string {
  return page("Gazette du Sand", `
<div class="gazette">
${mdToHtml(md)}
</div>
<p><a href="/dashboard">Retour au ludus</a></p>
`, "gazette");
}
