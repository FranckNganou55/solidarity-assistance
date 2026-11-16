# Frontend — Makénéné Solidarité (React Native / Expo)

Application **mobile-first** fonctionnant sur **Android, iOS et web** à partir du même code
(React Native + `expo-router`).

## Démarrage

```bash
npm install

# Développement web (proxy /api vers l'API Spring Boot sur :8080)
npx expo start --web

# Développement mobile (Expo Go)
EXPO_PUBLIC_API_URL=http://<ip-locale>:8080 npx expo start
```

En développement web, Metro sert l'application sur `http://localhost:8081` mais **n'expose pas**
l'API : le plus simple est de travailler avec le build exporté + `server.js` (voir plus bas),
qui sert le bundle statique **et** proxifie `/api` et `/uploads`.

## Build web + serveur

```bash
npx expo export --platform web           # génère ./dist
PORT=3000 API_TARGET=http://127.0.0.1:8080 node server.js
```

`server.js` :

- sert les fichiers de `dist/` (avec repli sur `index.html` pour les routes profondes) ;
- **proxifie** `/api/*` et `/uploads/*` vers l'API Spring Boot (`API_TARGET`),
  ce qui évite tout problème de CORS et permet d'utiliser des URLs relatives côté app.

## Structure

```
app/
├── _layout.tsx            # provider global (thème, langue, session) + toasts
├── index.tsx              # routage initial (session + mot de passe à changer)
├── login.tsx              # connexion par numéro de téléphone
├── change-password.tsx    # changement imposé à la première connexion
├── (tabs)/
│   ├── _layout.tsx        # barre d'onglets
│   ├── index.tsx          # accueil : cycle de solidarité, stats, assistances ouvertes
│   ├── assistances.tsx    # liste + création (si permission EVENT_MANAGE)
│   ├── cotisations.tsx    # mes cotisations + file de validation (trésorier)
│   ├── demandes.tsx       # mes demandes + traitement (gestionnaire)
│   └── profil.tsx         # profil, langue, thème, espace administration, déconnexion
├── assistance/[id].tsx    # détail : cotiser, clôturer, rouvrir (admin), annuler
└── admin/
    ├── membres.tsx        # CRUD membres, réinit. mot de passe, reset cycle, historique
    ├── roles.tsx          # création de rôles + matrice des 21 permissions
    ├── types.tsx          # types d'assistance
    ├── parametres.tsx     # nom, logo (upload), couleurs, devise, règle minimum, défauts
    └── audit.tsx          # journal d'audit
src/
├── api.ts                 # client HTTP typé + base URL auto (relative en web)
├── store.tsx              # contexte global : session, thème, langue, toasts, useResource
├── theme.ts               # palettes claire/sombre dérivées du logo
├── i18n.ts                # dictionnaires FR / EN
├── ui.tsx                 # composants (Screen, Card, Field, Sheet, Badge, Progress…)
├── cards.tsx              # cartes évènement / cotisation / demande
├── guard.tsx              # protection des écrans par permission
├── upload.ts              # sélection + envoi de photo / logo (web et mobile)
├── permissions.ts         # constantes des permissions
└── utils.ts               # formats (FCFA, dates), couleurs de statut
```

## Notes

- Les couleurs et la langue choisies sont **persistées localement** (`AsyncStorage`).
- Le menu d'administration n'apparaît que pour les rôles possédant les permissions correspondantes ;
  le serveur revérifie systématiquement (aucune sécurité côté client uniquement).
- Sur mobile, une photo peut être choisie dans la galerie (`expo-image-picker`) puis envoyée à l'API.
