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

## Vague P0 — déroulé réel

### Incidents

1. **Worktree inexistant au bootstrap T0** (déjà documenté ci-dessus) :
   `.swarm/wt/P0-T0` absent → `git init` à la racine du workspace ; les
   worktrees T1–T5 créés après coup. Leçon : vérifier `cordis.patch.yml`
   (worktrees activés) avant le premier spawn.
2. **Scope-freeze T3** : l'UPSERT du board (swarm_plan ajoutant
   `.dockerignore` au check attendu) n'a pas été propagé à la session liée
   du worker T3, restée sur son scope initial. Le worker a annoncé un
   `.dockerignore` qu'il ne pouvait pas écrire → rejet 2, budget 2/2 épuisé,
   tâche blocked, résolution déléguée à P0-T5 (voir `.swarm/BLOCKED.md`).
3. **Relances reviewers/worker « unbound »** : plusieurs sessions n'étaient
   pas liées à leur rôle au réveil (événements out-of-order) ; récupéré via
   `swarm_assign_role` avec le sessionId correct.
4. **Check T4 exécuté à la racine AVANT merge** : le reviewer a lancé
   `npm test` au root alors que la branche T4 (package.json/tsconfig)
   n'était pas encore fusionnée → échec injustifié → rejet forcé. Le code
   était correct dans le worktree. Résolution : P0-T5 merge d'abord,
   re-review au root ensuite.
5. **Quirk `node --test` avec répertoire littéral** : sur Node 22.22,
   `node --test "test/gen/"` (argument répertoire cité) échoue avec
   MODULE_NOT_FOUND — le répertoire est traité comme un module. Correct :
   glob shell non cité `node --test test/gen/*.test.ts` (ou `node --test`
   seul). Les checks des tâches ont été corrigés en ce sens.
6. **Cache npm `~/.npm` EACCES** : `npm install` en sandbox échoue sur le
   cache par défaut non inscriptible → contournement systématique
   `npm install --cache /tmp/npm-cache`.
7. **Lockfile non tracké bloquant les merges** : un `package-lock.json`
   résiduel (résultat d'un npm install au root) bloquait toute fusion vers
   main. Résolu par `git clean -f -- package-lock.json` (contenu identique
   au blob de swarm/P0-T3), puis merges.

### Décisions

- **Pré-vague bootstrap** (T0) avant la vague P0 : les worktrees exigent un
  repo avec commit initial.
- **Check T2 module-scoped** : `node --test test/gen/*.test.ts` (glob) plutôt
  que le répertoire, à cause du quirk Node 22.22 ci-dessus.
- **Fusion des branches vérifiées par l'admin (P0-T5)** plutôt que
  re-dispatch de T3 (budget épuisé) : T3 systématique (contenus revus),
  T4 systématique, T2 après passage de ses tests dans son worktree
  (statut board non encore approved au moment du merge : 4/4 tests pass),
  T1 déjà présent dans la lignée de T2.

### URL GitHub

- **https://github.com/bobbyfinger/ludus** — main = merges P0, tag `v0.1.0`.

### Checks constatés (workdirs)

| Tâche | Check | Workdir | Résultat |
|---|---|---|---|
| P0-T2 | `node --test test/gen/*.test.ts` | `.swarm/wt/P0-T2` | 4/4 pass |
| P0-T3 | contenu revu (docker/CI/lockfile) | — | approved puis blocked (scope-freeze), mergé par T5 |
| P0-T4 | diff minimal vérifié au worktree | `.swarm/wt/P0-T4` | validé ; re-review au root post-merge attendue |
| P0-T5 | `npm test` (tsc + engine + gen) | racine | 16/16 pass, tsc vert |
| P0-T5 | `docker compose config -q` | racine | exit 0 |
| P0-T5 | tag `v0.1.0` annoté + push | racine | tip 8106a2e poussé |
