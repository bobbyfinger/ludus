# Vague P4 — décisions

## Tournoi cron

- Tournoi automatique déclenché par un cron **interne au serveur** (pas de crontab système, pas de
  dépendance) : un timer Node dans le process suffit. La sandbox DSH n'a pas de cron OS de toute façon.
- Intervalle : **une journée de jeu par tour** (cohérent avec `avanceJournee` / salaires quotidiens).
  Un duel de tournoi par intervalle, seed dérivé du numéro du jour → rejouable/déterministe.
- `ponytail:` pas de persistance du timer — si le serveur redémarre, le cron repart à l'heure
  ronde suivante ; ajouter une reprise sur état persisté si un jour ça compte.

## Actions dashboard (PRG)

- Les boutons Acheter/Vendre/Soigner/Entraîner/Forger postent sur `/api/action/*` qui répond
  **303 → /dashboard** (Post/Redirect/Get) : pas de re-post au refresh, pas de JS côté client.
- Formulaires HTML natifs (`<form method="post">`), seed passé en champ caché — zéro JS, zéro fetch.

## Assets générés

- `docs/assets/gladiator-{3,17,42,99}.svg` : sorties exactes de `portraitSVG(generateGladiator(seed))`.
- `landing-preview.html` / `dashboard-preview.html` : sorties brutes de `landingPage()` et
  `dashboardPage(initGame(42))` — servent de captures dans le README.
- Génération via un script Node jetable (`node --experimental-strip-types`), script supprimé
  après usage : les assets sont des artefacts, pas du code à maintenir.
