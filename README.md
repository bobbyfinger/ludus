# LVDVS — Sang & Sueur ressuscité

Sang & Sueur est mort ? Pas son idée. **LVDVS** ressuscite le jeu PBEM d'école de gladiateurs.
Recrue des esclaves, des condamnés et des affamés ; fais-en des gladiateurs — ou de la viande.
Chaque tour : entraînement, économie, paris, complots, et l'arène qui décide de tout.
Moteur de jeu TypeScript **zéro dépendance runtime**, génération seedée, interface web Rome antique.
Rome n'a jamais été tendre. Nous non plus.

## Features par vague

| Vague | Contenu | Release |
|-------|---------|---------|
| **P0** | Moteur de combat seedé, génération procédurale de gladiateurs (`mulberry32`), Docker + CI | [v0.1.0](../releases/tag/v0.1.0) |
| **P1** | École & économie (achats/ventes/salaires), staff, persistance | [v0.2.0](../releases/tag/v0.2.0) |
| **P2** | Portraits SVG procéduraux, rapports de combat, gazette | [v0.3.0](../releases/tag/v0.3.0) |
| **P3** | Site complet : serveur HTTP zéro dépendance, pages landing/dashboard/orders/reports/gazette, orchestrateur de jeu | [v0.4.0](../releases/tag/v0.4.0) |
| **P4** | Tournoi automatique par cron interne, actions directes sur le dashboard (PRG) | ✅ livré — `startScheduler` (TOURNOI_MS, défaut 6 h) déclenche le duel du jour + sauvegarde ; `POST /api/action/:action` (acheter/vendre/soigner/forger/entrainer) → 303 /dashboard |

## Captures

Portraits générés par `portraitSVG(generateGladiator(seed))` — déterministes, même seed → même visage :

| Seed 3 | Seed 17 | Seed 42 | Seed 99 |
|--------|---------|---------|---------|
| ![Gladiateur seed 3](docs/assets/gladiator-3.svg) | ![Gladiateur seed 17](docs/assets/gladiator-17.svg) | ![Gladiateur seed 42](docs/assets/gladiator-42.svg) | ![Gladiateur seed 99](docs/assets/gladiator-99.svg) |

Pages du site :

- [Aperçu landing](docs/assets/landing-preview.html) — sortie brute de `landingPage()`
- [Aperçu dashboard](docs/assets/dashboard-preview.html) — `dashboardPage(initGame(42))`

## Lancer

```bash
npm install && npm test        # moteur + pages, node:test, zéro config
docker compose up --build      # → http://localhost:3000
```

## Stack

- **TypeScript, zéro dépendance runtime** — stdlib Node uniquement
- **Node 22** (`--experimental-strip-types`, pas d'étape de build)
- **node:test** pour les tests
- Docker + CI (GitHub Actions)

## Releases

[v0.1.0](../releases/tag/v0.1.0) · [v0.2.0](../releases/tag/v0.2.0) · [v0.3.0](../releases/tag/v0.3.0) · [v0.4.0](../releases/tag/v0.4.0)

## Licence

MIT
