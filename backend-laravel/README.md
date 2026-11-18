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

## Base de données locale

Le projet utilise MySQL 8 de Wampserver. Démarrez le service MySQL et configurez dans `backend-laravel/.env` le nom `makenene-solidarite`, l’hôte `127.0.0.1`, le port `3306`, ainsi qu’un utilisateur MySQL autorisé sur cette base. Le fuseau horaire de connexion doit rester `+00:00`.

Les données de PostgreSQL ont été transférées vers cette base. Une sauvegarde complète de PostgreSQL et une sauvegarde de la base MySQL avant migration sont conservées dans `storage/app/migration-backups/2026-11-18-pre-mysql/`. Ne lancez pas `migrate:fresh` sur cette base : cette commande supprimerait son schéma et ses données.

## Démarrage local

Depuis le dossier racine du dépôt, exécutez `scripts/start-local.ps1`. Le script vérifie que MySQL écoute sur le port `3306` et que PHP charge `pdo_mysql`, puis démarre Laravel sur `http://127.0.0.1:8082` et Vite sur le port `3000`. La base active de l’application est `makenene-solidarite` sur MySQL.

Pour compiler les ressources de production, exécutez `npm run build` dans `backend-laravel`. Pour vérifier l’API et les routes : `php artisan route:list --except-vendor`; pour lancer les tests : `php artisan test --compact`.
