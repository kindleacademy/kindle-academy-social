# Kindle Academy · publication automatique Instagram

Chaque jour à 18h (heure de Paris), GitHub publie sur `@mainquestlab` le carrousel prévu ce jour-là dans `schedule.json`, **uniquement s'il est validé** (`"approved": true`).

## Organisation

- `posts/AAAA-MM-JJ-nom/` : les images `01.jpg`, `02.jpg`… (2 à 10, format 4:5, JPEG) et `caption.txt`.
- `schedule.json` : le planning (date, dossier, validé ou non).
- `published.json` : le journal des posts publiés (rempli automatiquement, empêche les doublons).

## Secrets à renseigner (Settings → Secrets and variables → Actions)

| Nom | Contenu |
|---|---|
| `IG_TOKEN` | Jeton longue durée de l'app Meta (connexion Instagram) |
| `GH_PAT` | Jeton GitHub « fine-grained » limité à ce dépôt, permission *Secrets : Read and write*, pour renouveler `IG_TOKEN` tout seul |
| `IG_USER_ID` | Optionnel : identifiant du compte Instagram (sinon `me`) |

## Tester sans publier

Actions → « Publier sur Instagram » → Run workflow → laisser « Vérifier sans publier » coché.

Le dépôt doit rester **public** : Instagram récupère les images directement depuis GitHub.
