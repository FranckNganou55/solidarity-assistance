# Makénéné Solidarité

Application web responsive de gestion des groupes, membres, assistances, demandes et cotisations.

## Stack actuelle

- Backend : Laravel / PHP dans `backend-laravel`
- Frontend : Vue.js dans `backend-laravel/resources/js`
- Base : PostgreSQL existant, port local `5433`
- Pièces jointes : `backend-laravel/storage/app/public/uploads` (disque public Laravel)
- Fichiers de la base PostgreSQL : `backend/data/postgres` (répertoire du serveur PostgreSQL, distinct des fichiers Laravel)

## Démarrage local

1. Vérifier que PostgreSQL est démarré et que `backend-laravel/.env` pointe vers la base existante `makenene_solidarite`.
2. Depuis PowerShell, exécuter `./scripts/start-local.ps1`.
3. Ouvrir `http://127.0.0.1:8082/login`.

Le script démarre Laravel sur `127.0.0.1:8082` et Vite sur `127.0.0.1:3000`. Il ne recrée pas la base et ne supprime aucune donnée. L’extension PDO PostgreSQL de PHP doit être disponible (`php_pdo_pgsql.dll`).

## Migrations de base

Les migrations Laravel ne remplacent pas le schéma métier historique. Elles ajoutent uniquement les éléments nécessaires au nouveau backend. Ne pas exécuter `migrate:fresh`, `db:wipe` ou un seeder destructif sur la base existante.

Contrôle en lecture seule : `php artisan migrate:status` depuis `backend-laravel`.

## Vérification

- Frontend Laravel/Vue : `cd backend-laravel; npm run build`
- Backend : `cd backend-laravel; php artisan test --compact`
- Routes API : `php artisan route:list --path=api --except-vendor`

Les identifiants de base et clés privées restent dans `backend-laravel/.env`, qui ne doit pas être partagé.
