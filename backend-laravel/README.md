# Makénéné Solidarité — Laravel et Vue

Laravel sert l’API, la page Blade d’entrée et les ressources compilées par Vite. Le frontend Vue se trouve dans `resources/js`; il utilise le logo public `public/logo-fm-mak.jpeg` et conserve les styles de l’application.

## Organisation Vue

- `resources/js/Components/ui`, `forms`, `tables` : composants d’interface réutilisables.
- `resources/js/Pages` : pages du tableau de bord, des assistances, des évènements, des cotisations, des membres et de l’administration.
- `resources/js/Layouts` : layouts authentifié et de connexion.
- `resources/js/Services` : accès API et authentification.
- `resources/js/Store/index.js` : état partagé Pinia.
- `resources/js/Composables/useAuth.js` : accès réutilisable à l’authentification.
- `resources/js/app.js` : entrée Vue/Vite.

## Démarrage local

Depuis la racine du projet, exécuter `scripts/start-local.ps1`. L’application est servie par Laravel à `http://127.0.0.1:8082/login`; Vite sert les modules de développement sur le port `3000`. La base PostgreSQL existante reste configurée sur le port `5433`.

Pour compiler les ressources de production, exécuter `npm run build` dans ce dossier. Pour vérifier l’API et les routes : `php artisan route:list --except-vendor`; pour les tests : `php artisan test --compact`.
