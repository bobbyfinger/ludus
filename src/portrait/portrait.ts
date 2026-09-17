// Portraits SVG procéduraux — zéro dépendance, déterministes (dérivés uniquement de la seed).
import { mulberry32, type Gladiator, type Origin, type CombatStyle } from "../gen/gladiator.ts";

const SKINS = ["#f1c7a1", "#d9a066", "#a9714b", "#7a4a2b", "#5a3620"];
const HAIRS = ["#1b1b1b", "#4a2c17", "#8a6a3b", "#b0a08a", "#6b3fa0"];

const BG: Record<Origin, string> = {
  Gaulle: "#7ec850", Thrace: "#6fa8dc", Numidie: "#e6b85c", Germanie: "#8fa3ad",
  "Grèce": "#a8d8ea", Hispanie: "#d98f5c", Syrie: "#d9c48a",
};

// Coiffe selon le style : crête / casque léger / casque intégral à visière.
function helmet(style: CombatStyle, skin: string): string {
  if (style === "agressif")
    return `<path d="M30 40 Q60 18 90 40 L90 52 Q60 40 30 52 Z" fill="#b0b0b0"/><rect x="56" y="8" width="8" height="34" fill="#c0392b"/>`;
  if (style === "prudent")
    return `<path d="M30 44 Q60 24 90 44 L90 54 Q60 44 30 54 Z" fill="#9aa5b1"/><circle cx="60" cy="34" r="6" fill="${skin}"/>`;
  return `<path d="M28 38 Q60 16 92 38 L92 58 Q60 46 28 58 Z" fill="#7f8c8d"/><rect x="32" y="50" width="56" height="10" rx="3" fill="#34495e"/>`;
}

function hair(style: number, color: string): string {
  if (style === 0) return ""; // chauve
  if (style === 1) return `<path d="M32 44 Q60 24 88 44 L88 36 Q60 20 32 36 Z" fill="${color}"/>`; // court
  if (style === 2) return `<path d="M30 46 Q60 22 90 46 L92 74 L84 52 Q60 36 36 52 L28 74 Z" fill="${color}"/>`; // long
  return `<rect x="52" y="12" width="16" height="34" fill="${color}"/>`; // mohawk
}

export function portraitSVG(g: Gladiator): string {
  const rng = mulberry32(g.seed);
  const skin = SKINS[Math.floor(rng() * SKINS.length)];
  const hairColor = HAIRS[Math.floor(rng() * HAIRS.length)];
  const hairStyle = Math.floor(rng() * 4);
  const beard = rng() < 0.5;
  const scars = Math.floor(rng() * 4);

  const scarShapes = Array.from({ length: scars }, (_, i) => {
    const y = 62 + i * 14;
    return `<path d="M${40 + i * 6} ${y} l10 6 M${44 + i * 6} ${y - 2} l2 10" stroke="#8a3b3b" stroke-width="1.5"/>`;
  }).join("");

  return (
    `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="120" height="160" fill="${BG[g.origin]}"/>` +
    `<rect x="20" y="130" width="80" height="30" fill="#5d4a3a"/>` + // épaules/tunique
    `<circle cx="60" cy="66" r="30" fill="${skin}"/>` + // tête
    (beard ? `<path d="M34 70 Q60 108 86 70 Q80 96 60 98 Q40 96 34 70 Z" fill="${hairColor}"/>` : "") +
    `<circle cx="50" cy="64" r="3" fill="#1b1b1b"/><circle cx="70" cy="64" r="3" fill="#1b1b1b"/>` + // yeux
    scarShapes +
    hair(hairStyle, hairColor) +
    helmet(g.style, skin) +
    `</svg>`
  );
}

/** Hash court du SVG, pratique pour les snapshots. */
export function portraitHash(g: Gladiator): string {
  const svg = portraitSVG(g);
  let h = 0x811c9dc5;
  for (let i = 0; i < svg.length; i++) {
    h ^= svg.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
