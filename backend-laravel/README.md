# Makénéné Solidarité — application Laravel

L’application fonctionne sous Laravel/PHP et MySQL. Toutes les pages web sont rendues par des vues Blade (`resources/views`) et utilisent un petit module JavaScript sans framework (`resources/js/blade.js`) pour les interactions et appels API. Le bundle navigateur est livré dans `public/build/assets`. Node.js et npm ne sont pas nécessaires pour installer, démarrer ou déployer l’application.

## Démarrage local

Prérequis : PHP 8.3 avec `pdo_mysql`, Composer, et MySQL Wampserver démarré.

Depuis la racine du dépôt, configurez `backend-laravel/.env` si nécessaire, puis lancez :

```powershell
cd backend-laravel
composer install
php artisan migrate --seed
cd ..
.\scripts\start-local.ps1
```

Le site est servi par Laravel à `http://127.0.0.1:8082`. Le script démarre un seul serveur PHP et vérifie que les fichiers compilés sont présents. La base locale `makenene-solidarite` contient des données réelles : ne lancez pas `migrate:fresh` ni `db:wipe`.

## Vues Blade et assets

- Les pages publiques, la connexion et les pages de l’espace connecté sont dans `resources/views/pages/`, `resources/views/auth/` et `resources/views/layouts/`.
- Les routes web passent par `PageController`, qui sélectionne une vue Blade pour chaque page; les opérations métier restent dans les contrôleurs API Laravel, services, requêtes et modèles.
- Le navigateur charge `public/build/assets/app.js` et `public/build/assets/app.css` depuis `resources/views/layouts/application.blade.php`.
- Vite et Node.js ne sont que des outils facultatifs de compilation des assets; ils ne sont pas nécessaires au démarrage ni au déploiement si le bundle versionné est présent.
- Aucune commande Node.js/npm n’est exécutée au démarrage ou sur le serveur de déploiement.
- Lorsqu’une nouvelle version du frontend est préparée, le bundle compilé doit être livré avec le code Laravel dans `public/build/assets/`.

## Déploiement

Installez les dépendances PHP avec Composer, configurez `.env` et le service MySQL, puis faites pointer le serveur web vers `public/`. Activez HTTPS, `APP_DEBUG=false`, un stockage persistant pour les fichiers téléversés et des sauvegardes régulières. Les assets précompilés sont inclus dans Git : pas d’étape npm sur le serveur. Pour reconstruire les assets en développement, installez les dépendances du `package-lock.json` puis lancez `npm run build`.

Commandes de contrôle :

```powershell
php artisan about
php artisan route:list --except-vendor
php artisan test --compact
```

Les tests utilisent une base de test SQLite en mémoire définie dans `phpunit.xml`; ne remplacez pas cette configuration par la base MySQL réelle.
