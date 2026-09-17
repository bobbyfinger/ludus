# Vague P0 — note de vague

_Date: 2026-09-17 (tags posés après merge par le planner)_

## Objectif de la vague

Socle minimal LUDUS : bootstrap repo (T0), moteur de combat (T1), génération
seedée de gladiateurs (T2), docker/CI (T3). Zéro dépendance runtime, stdlib
d'abord (règles ponytail).

## Décisions P0

- **TypeScript + `node --test`**, zéro dépendance runtime (T0). Le script
  `test` de package.json reste en garde bootstrap tant que `src`/`test` sont
  vides.
- **Docker minimal** (T3) : un seul service `app` (node:22-alpine), volume
  `./data:/app/data`, port 3000 exposé. Pas de db, pas de nginx — le serveur
  arrive en P3 ; `CMD node --version` est un placeholder honnête marqué
  `ponytail:`.
- **CI GitHub Actions** (T3) : push + PR → `npm ci`, `tsc --noEmit`,
  `node --test test/`. Rien d'autre (pas de lint, pas de matrix).
- **Tag `v0.1.0`** annoté, créé localement dans le worktree T3, poussé par le
  planner après merge.

## Checks attendus par tâche

- **P0-T0 (bootstrap)** : `npm test` passe (garde bootstrap), repo GitHub
  créé et poussé, preset swarm actif.
- **P0-T1 (moteur)** : tests unitaires node/test ; simulation ≥1000 duels
  seedés — win-rate miroir 50%±2%, aucun style dominant, durée bornée.
- **P0-T2 (génération)** : même seed ⇒ gladiateur identique (snapshot) ;
  stats bornées, budget de points équilibré.
- **P0-T3 (docker/CI)** : `docker compose config -q` valide ; le workflow
  ci.yml contient exactement npm ci / tsc / node --test ; tag v0.1.0 local
  présent.

## Incident worktree bootstrap

Le répertoire `.swarm/wt/P0-T0` n'existait pas au lancement de T0 : le worker
a fait `git init` à la racine du workspace comme checkout principal au lieu
d'un worktree dédié. Conséquence : les worktrees T1–T3 ont été créés
après coup depuis ce checkout racine, sans divergence de contenu (branche
`swarm/P0-T0` fusionnée en amont). Leçon notée pour les vagues suivantes :
vérifier `cordis.patch.yml` (worktrees activés) **avant** le premier spawn.
