# PILOT2 — Journal du pilote

## 2026-09-17 — Pré-vague bootstrap

- **Décision planner** : pré-vague bootstrap car les worktrees exigent un repo
  avec un commit initial. Tâche P0-T0 : git init + commit initial + création du
  repo GitHub + fichiers de base.
- **GitHub** : URL renseignée après `gh repo create` (voir ci-dessous).
- **Fichiers créés** : `cordis.patch.yml` (preset swarm : worktrees `.swarm/wt`
  activés, `maxTaskAttempts: 2`, `wakePlannerOnTaskEnd: true`,
  `reviewCheckCommand: npm test`), `package.json` (TypeScript, zéro dépendance
  runtime, devDep `typescript` seulement, script `test` =
  `tsc --noEmit && node --test test/`), `tsconfig.json` (NodeNext, strict,
  outDir `dist`), `.gitignore` (`node_modules/`, `dist/`, `data/`, `.swarm/`),
  `README.md` (pitch LUDUS), `LICENSE` (MIT), `src/.gitkeep`.

### Incidents

- **Worktree absent** : `.swarm/wt/P0-T0` n'existait pas et le workspace
  n'était pas un dépôt git (attendu pour un bootstrap, mais à noter : le
  redirection worktree n'a pas joué, les fichiers ont été écrits directement
  à la racine du workspace puis commités via `git init` à la racine).
- **Raccourci bootstrap** (`ponytail:`) : le script `test` de package.json
  est gardé par un `find` — tant qu'aucun fichier `.ts` n'existe (TS18003
  sinon), il affiche « bootstrap: no TS sources yet » et réussit. À retirer
  dès la première vague qui ajoute du code TS dans `src/` ou `test/`.
- **Schéma cordis** : le schéma exact du preset a été vérifié dans la doc du
  plugin (`cordis.patch.yml` de cursor-swarm-rules, forme de surcharge par id).
  Le preset suit cette forme documentée plutôt que le YAML logique de repli.

### URL GitHub

- **https://github.com/bobbyfinger/ludus** (public, compte `bobbyfinger`,
  créé au premier essai — pas de repli vers `ludus-pilot2`). Commit initial
  poussé sur `main` : `7140e3b`.
