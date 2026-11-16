# Makénéné Solidarité

Application web responsive de gestion des groupes, des membres, des assistances, des demandes et des cotisations.

## Technologies actuelles

- **Backend et vues serveur :** Laravel 13 / PHP 8.3 (`backend-laravel/`)
- **Interface :** Vue 3, Vue Router et Pinia (`backend-laravel/resources/js/`)
- **Build frontend :** Vite
- **Base de données :** PostgreSQL (`makenene_solidarite`, port local `5433`)

Le code actif de l’application Laravel et Vue se trouve dans `backend-laravel`. Les pièces jointes téléversées sont stockées dans `backend-laravel/storage/app/public/uploads`.

## Prérequis

Sur le poste de développement, installer et rendre accessibles dans le `PATH` :

- PHP **8.3 ou supérieur compatible avec Laravel 13**, avec les extensions Laravel requises et PDO PostgreSQL (`pdo_pgsql`)
- Composer
- Node.js et npm
- PostgreSQL, avec le service et la base accessibles selon la configuration locale

Le script fourni attend PostgreSQL sur `127.0.0.1:5433`. Il ne démarre pas le serveur PostgreSQL lui-même. Le cluster PostgreSQL local existant se trouve dans `backend/data/postgres` : ce dossier contient les fichiers internes de la base, il ne faut ni le déplacer ni le supprimer pour démarrer Laravel.

## Première installation

Ouvrir PowerShell à la racine du dépôt :

```powershell
cd backend-laravel
composer install
npm install
```

Vérifier que `backend-laravel/.env` existe. Pour le créer depuis le modèle (uniquement s’il n’existe pas), exécuter depuis `backend-laravel` :

```powershell
Copy-Item .env.example .env
```

Renseigner ensuite les paramètres PostgreSQL (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`). Le fichier `.env` contient des secrets et ne doit pas être partagé.

Pour une installation réellement neuve uniquement, générer une clé Laravel si `APP_KEY` est vide :

```powershell
php artisan key:generate
```

Ne pas régénérer la clé d’une installation existante : cela invaliderait les sessions et données chiffrées. Créer le lien public des fichiers téléversés si nécessaire :

```powershell
php artisan storage:link
```

Avant toute migration, vérifier l’état du schéma sans modifier la base :

```powershell
php -d extension=php_pdo_pgsql.dll artisan migrate:status
```

Les migrations Laravel du projet complètent le schéma métier existant. **Ne pas exécuter** `php artisan migrate:fresh`, `php artisan db:wipe` ou un seeder destructif sur la base contenant les données existantes. Toute migration de données ou de schéma doit être précédée d’une sauvegarde PostgreSQL vérifiée.

## Démarrer l’application en local

1. Démarrer le service PostgreSQL et vérifier que la base configurée dans `.env` est accessible sur le port `5433`.
2. Depuis PowerShell, à la racine du dépôt, lancer :

   ```powershell
   .\scripts\start-local.ps1
   ```

3. Ouvrir l’application : **http://127.0.0.1:8082/login**.

Le script démarre le serveur Laravel sur `127.0.0.1:8082` et le serveur de développement Vite sur `127.0.0.1:3000`. Il vérifie les ports et les dépendances locales avant de démarrer. Pour utiliser les commandes Artisan séparément, activer l’extension PHP PostgreSQL comme dans le script (`-d extension=php_pdo_pgsql.dll`).

## Commandes utiles

À exécuter depuis `backend-laravel` :

```powershell
# Vérifier les migrations appliquées (lecture seule)
php -d extension=php_pdo_pgsql.dll artisan migrate:status

# Lister les routes web et API
php artisan route:list
php artisan route:list --path=api --except-vendor

# Compiler les fichiers Vue/CSS pour une livraison
npm run build
```

Les tests automatisés peuvent être lancés avec `php artisan test`, une fois les variables d’environnement et la base de test correctement configurées.

## Déploiement

Le script `start-local.ps1` et le serveur Vite de développement sont destinés au poste local, pas à un serveur public. Un déploiement doit servir Laravel depuis `backend-laravel/public`, utiliser HTTPS, une configuration `.env` de production (`APP_ENV=production`, `APP_DEBUG=false`), une base PostgreSQL sauvegardée et un stockage persistant pour `storage/app/public/uploads`.

Préparer les dépendances et les assets de production depuis `backend-laravel` :

```sh
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

Les migrations de production doivent être revues et exécutées après sauvegarde, avec `php artisan migrate --force`. Ne pas copier le `.env` local ni ses secrets vers un dépôt public.
