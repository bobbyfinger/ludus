import test from "node:test";
import assert from "node:assert/strict";
import { generateGladiator } from "../../src/gen/gladiator.ts";
import { creerLudus, acheterGladiateur } from "../../src/school/index.ts";
import { portraitSVG } from "../../src/portrait/portrait.ts";
import {
  escapeHtml,
  landingPage,
  dashboardPage,
  ordersPage,
  reportsPage,
  gazettePage,
  mdToHtml,
} from "../../src/web/pages.ts";

const PALETTE = ["#C2B280", "#B3552E", "#7A1F1F", "#C9A227", "#8C6A3F"];

const pages = () => {
  const ludus = acheterGladiateur(creerLudus(1, "Ludus Test"), 7);
  return {
    landing: landingPage(),
    dashboard: dashboardPage(ludus),
    orders: ordersPage(ludus.roster),
    reports: reportsPage([{ title: "Duel du soir", narration: "Marcus tombe." }]),
    gazette: gazettePage("# Titre\n- item\n**gras**"),
  };
};

test("chaque page : doctype, head/style inline, fermeture </html>", () => {
  for (const [nom, html] of Object.entries(pages())) {
    assert.ok(html.startsWith("<!DOCTYPE html>"), `${nom}: doctype`);
    assert.ok(html.includes("<style>"), `${nom}: CSS inline`);
    assert.ok(html.endsWith("</html>\n") || html.endsWith("</html>"), `${nom}: </html>`);
  }
});

test("palette Rome présente dans le CSS de chaque page", () => {
  for (const [nom, html] of Object.entries(pages())) {
    for (const hex of PALETTE) assert.ok(html.includes(hex), `${nom}: ${hex} absent`);
  }
});

test("landing : pitch LUDUS, arène SVG, CTA /dashboard", () => {
  const html = pages().landing;
  assert.ok(html.includes("LVDVS"));
  assert.ok(html.includes("Sang &amp; Sueur"));
  assert.ok(html.includes("aria-label=\"L'arène du ludus\"")); // illustration arène inline
  assert.ok(html.includes('href="/dashboard"'));
});

test("dashboard : portraits SVG injectés, argent, jour, actions POST", () => {
  const html = pages().dashboard;
  const g = generateGladiator(7);
  assert.ok(html.includes(portraitSVG(g)), "portraitSVG inline par gladiateur");
  assert.ok(html.includes("sesterces"), "argent affiché");
  assert.ok(html.includes("Jour 1"), "jour affiché");
  for (const a of ["acheter", "vendre", "soigner", "forger", "entrainer"]) {
    assert.ok(html.includes(`/api/action/${a}`), `action ${a}`);
  }
  assert.ok(html.includes('method="post"'));
});

test("orders : formulaire POST /api/orders avec choix de style par gladiateur", () => {
  const html = pages().orders;
  assert.ok(html.includes('action="/api/orders"'));
  assert.ok(html.includes('method="post"'));
  for (const s of ['value="agressif"', 'value="prudent"', 'value="défensif"']) {
    assert.ok(html.includes(s), `option ${s}`);
  }
  assert.ok(html.includes('name="seed" value="7"'));
});

test("reports : titres et narrations rendus, échappés", () => {
  const html = reportsPage([{ title: "Duel <sanglant>", narration: "Un <gladiateur> tombe." }]);
  assert.ok(html.includes("Duel &lt;sanglant&gt;"));
  assert.ok(html.includes("Un &lt;gladiateur&gt; tombe."));
  assert.ok(!html.includes("<sanglant>"));
});

test("gazette : markdown minimal (titres, puces, gras), échappé", () => {
  const html = pages().gazette;
  assert.ok(html.includes("<h1>Titre</h1>"));
  assert.ok(html.includes("<li>item</li>"));
  assert.ok(html.includes("<strong>gras</strong>"));
  const evil = mdToHtml("# <script>x</script>\n- **a<b>**");
  assert.ok(!evil.includes("<script>"));
  assert.ok(evil.includes("&lt;script&gt;"));
  assert.ok(evil.includes("<strong>a&lt;b&gt;</strong>"));
});

test("escapeHtml : &, <, >, \" neutralisés", () => {
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
});
