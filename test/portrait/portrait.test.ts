import test from "node:test";
import assert from "node:assert/strict";
import { generateGladiator } from "../../src/gen/gladiator.ts";
import { portraitSVG, portraitHash } from "../../src/portrait/portrait.ts";

test("déterminisme : même gladiateur ⇒ SVG identique byte-à-byte", () => {
  const g = generateGladiator(42);
  assert.equal(portraitSVG(g), portraitSVG(g));
  assert.equal(portraitHash(g), portraitHash(g));
  assert.equal(portraitHash(g), portraitHash(generateGladiator(42)));
});

test("unicité : ≥50 seeds ⇒ ≥45 SVG distincts", () => {
  const hashes = new Set(Array.from({ length: 50 }, (_, i) => portraitHash(generateGladiator(i))));
  assert.ok(hashes.size >= 45, `seulement ${hashes.size} portraits distincts`);
});

test("structure : <svg… viewBox …</svg>", () => {
  const svg = portraitSVG(generateGladiator(7));
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.includes('viewBox="0 0 120 160"'));
  assert.ok(svg.endsWith("</svg>"));
});

test("influence origin : 2 origins différentes ⇒ fond différent", () => {
  const a = generateGladiator(1);
  const b = { ...a, origin: "Syrie" as const };
  const c = { ...a, origin: "Thrace" as const };
  assert.notEqual(portraitSVG(b), portraitSVG(c));
});

test("influence style : 2 styles différents ⇒ coiffe différente", () => {
  const a = generateGladiator(2);
  const b = { ...a, style: "agressif" as const };
  const c = { ...a, style: "défensif" as const };
  assert.notEqual(portraitSVG(b), portraitSVG(c));
});
