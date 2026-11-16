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

## Cahier des charges — version actualisée

**Version de référence : 2.0 — 16 novembre 2026**
Cette section remplace, pour le projet actuel, les choix qui ont évolué depuis le cahier des charges initial. Elle décrit le périmètre fonctionnel attendu ; elle ne constitue pas à elle seule une recette de toutes les fonctions.

### 1. Objet et périmètre

Makénéné Solidarité est une application web responsive de gestion de groupes/associations, de leurs membres, des demandes d’assistance, des événements et des cotisations. Les cotisations sont collectées uniquement lorsqu’une assistance est ouverte. Le versement se fait hors application ; celle-ci enregistre la déclaration et sa preuve, puis le responsable habilité confirme la réception effective de l’argent.

L’application est multi-groupes : un membre peut appartenir à plusieurs groupes. Les données, paramètres, listes et statistiques doivent respecter le groupe actif et les groupes auxquels l’utilisateur a accès.

### 2. Comptes, groupes et habilitations

- La connexion utilise l’identifiant du membre, qui correspond à son numéro de téléphone, et son mot de passe. Le mot de passe initial doit être changé lors de la première connexion.
- Le **super administrateur** gère l’application entière et peut créer, modifier et supprimer les groupes. Lui seul voit l’option de création des groupes.
- Chaque groupe possède un **administrateur principal**. Il gère les membres de son groupe et ne peut créer des membres que dans les groupes où il a cette habilitation.
- Un membre peut appartenir à plusieurs groupes ; il ne voit que ses groupes. S’il n’en possède qu’un, son groupe est affiché sans filtre de changement.
- Les rôles sont attribués à des membres déjà créés. Les membres du bureau restent également des membres ordinaires pour les cotisations, l’historique et les règles d’assistance.
- Les rôles et les permissions se gèrent dans le menu **Administration**. Chaque opération doit avoir une permission distincte (consulter, créer, modifier, supprimer, valider, etc.) et être contrôlée par le backend comme par l’interface.
- Un membre inactif est archivé, ne peut plus se connecter et conserve son historique.

### 3. Membres et profils

La fiche membre comprend au minimum le nom, le prénom, le téléphone/identifiant, la ville, le quartier et le statut. La photo et l’adresse e-mail sont facultatives. L’application permet la recherche et le filtrage des membres et des membres du bureau par nom ou identifiant. Une photo sélectionnée doit être prévisualisée avant enregistrement ; son affichage peut être rond ou carré.

Le profil permet de consulter et, selon les permissions, de modifier les informations autorisées, la photo, le mot de passe, la langue et le thème. L’historique d’un membre n’est pas supprimé avec son compte.

### 4. Seuil d’éligibilité et cycle d’assistance

- Le seuil minimum d’assistances à effectuer avant de pouvoir demander une assistance est configurable par un responsable habilité. Il est saisi manuellement, accepte la valeur **0** et peut être réglé pour tout le groupe.
- Une valeur personnalisée peut aussi être définie dans la fiche d’un membre par une personne habilitée. Les membres ordinaires ne peuvent pas modifier leur propre seuil.
- À la création d’un membre, le seuil général courant du groupe s’applique par défaut.
- Le système vérifie l’éligibilité à la soumission d’une demande. Un membre non éligible voit son compteur et le seuil applicable. Un administrateur principal peut autoriser une assistance exceptionnelle à un membre non éligible ; cette décision est interdite aux membres ordinaires et doit être traçable.
- Le compteur progresse selon les assistances auxquelles le membre a contribué, après validation de sa cotisation, une seule fois par assistance. Les cycles et l’historique des cotisations sont conservés. Toute remise à zéro de compteur suit les règles du cycle configurées et ne supprime jamais l’historique.

### 5. Types, demandes, assistances et événements

- Les types d’assistance sont créés et gérés uniquement par les rôles autorisés.
- Un membre éligible peut soumettre une demande avec le type, le bénéficiaire, les informations de l’événement et, si nécessaire, un document justificatif téléversé.
- Les demandes entrantes apparaissent dans **À traiter**. Le responsable habilité peut les approuver ou les rejeter, puis ouvrir l’assistance et fixer sa date de clôture.
- Une assistance suit les états de demande, traitement/ouverture, clôture ou rejet. À la clôture, elle n’accepte plus de nouvelles cotisations. Toute modification postérieure est réservée à un administrateur habilité et inscrite au journal d’audit.
- Le menu **Événements** affiche uniquement les assistances ouvertes pour lesquelles les membres peuvent cotiser ; il ne reprend pas le tableau de bord. Le détail d’un événement présente les membres ayant cotisé et ceux dont la cotisation est en attente.
- Les dates saisies dans l’application disposent d’un calendrier. Les listes nécessaires proposent une recherche et des filtres pertinents, dont le nom et l’identifiant.

### 6. Cotisations et notifications

- Depuis une assistance ouverte, chaque membre du groupe concerné peut déclarer sa cotisation. Le montant minimal est paramétrable par les responsables ; le montant proposé peut commencer à 0 FCFA, mais la soumission est refusée tant que le minimum n’est pas atteint.
- La soumission peut inclure une preuve de paiement sous forme d’image. Le paiement lui-même n’est pas exécuté par l’application.
- Le trésorier ou un rôle autorisé vérifie la déclaration et ne valide qu’après réception réelle de l’argent. La cotisation validée peut ensuite être invalidée ou corrigée par une personne habilitée, avec mise à jour des totaux et journalisation de l’opération.
- Une cotisation, une assistance et un événement doivent être accessibles depuis les listes concernées pour faciliter la navigation. Les filtres et vues de cotisation couvrent tous les membres du groupe, y compris ceux qui exercent un rôle au bureau.
- Les notifications apparaissent dans la cloche de l’en-tête. Une notification sonore accompagne notamment la soumission d’une cotisation et sa validation, lorsque le navigateur et les réglages de l’utilisateur l’autorisent.

### 7. Pages et tableaux de bord

L’interface comprend la connexion et le profil, l’accueil, les statistiques personnelles, les assistances, les événements ouverts, les cotisations, les demandes, les membres, les types d’assistance, le journal d’audit, l’administration (groupes selon le rôle, bureau, rôles et permissions) et les paramètres.

L’accueil présente les statistiques du groupe aux super administrateurs et administrateurs principaux : effectif, assistances réalisées, montants cotisés et graphiques de cotisations et d’assistances. **Mes statistiques** présente les données personnelles. Les raccourcis et cartes statistiques renvoient vers les pages ou listes correspondantes ; les cotisations à vérifier ouvrent directement la file **À traiter**.

### 8. Identité visuelle, langues et accessibilité

- Utiliser le logo officiel fourni sans le déformer ni le recolorer ; le logo fourni pour le fond sert de visuel d’arrière-plan et doit couvrir l’écran sans empêcher la lecture.
- Conserver une interface professionnelle, claire, responsive et adaptée au téléphone, à la tablette et à l’ordinateur, avec menu latéral persistant sur grand écran et navigation adaptée aux petits écrans.
- La charte applicative privilégie le vert institutionnel `#1E6F5C`, le bleu secondaire `#2D9CDB`, le succès `#27AE60`, l’alerte `#F2994A`, l’erreur `#EB5757`, les fonds `#F7F9FB` et les cartes blanches. Le thème sombre reste disponible avec des contrastes lisibles.
- Les préférences français/anglais et clair/sombre sont conservées. Tout libellé d’interface ajouté doit être traduit dans les deux langues ; les noms et descriptions saisis par les membres ne sont pas traduits automatiquement.
- Prévoir des états de chargement, d’erreur et de liste vide, des messages de validation compréhensibles, des commandes accessibles au clavier, des zones tactiles suffisantes et une option de réduction des animations.

### 9. Architecture et exploitation

La stack actuelle remplace celle du document initial : **Laravel/PHP 8.3, Vue.js 3, Vite et PostgreSQL**. L’application Laravel se trouve dans `backend-laravel/` ; les pages et composants Vue sont organisés dans `backend-laravel/resources/js/`. Laravel porte les modèles, contrôleurs, requêtes, middlewares, services, routes web/API, migrations et ressources. PostgreSQL conserve les données métier ; les fichiers téléversés sont conservés dans le stockage persistant Laravel.

Le déploiement doit servir l’application depuis `backend-laravel/public`, avec HTTPS, `APP_DEBUG=false`, secrets conservés hors du dépôt, sauvegardes PostgreSQL régulières et testées, stockage persistant des fichiers, migrations relues avant exécution et journalisation des actions sensibles. Le script de développement `scripts/start-local.ps1` n’est pas un serveur de production.

### 10. Critères d’acceptation essentiels

- Les permissions et l’accès aux groupes sont appliqués côté serveur ; un utilisateur ne peut pas consulter ou modifier les données d’un groupe auquel il n’a pas accès.
- Le super administrateur seul peut créer, modifier ou supprimer un groupe ; les administrateurs principaux restent limités à leurs groupes.
- Les membres du bureau sont aussi présents dans les listes de membres et peuvent cotiser selon les mêmes règles.
- Un membre inactif ne peut plus ouvrir de session, tandis que ses historiques restent consultables par les personnes habilitées.
- Le seuil collectif, le seuil individuel, la valeur zéro, l’exception d’éligibilité, le minimum de cotisation, la preuve et la validation/invalidation des cotisations respectent les règles décrites ci-dessus.
- La page Événements ne montre que les assistances ouvertes ; chaque menu présente son propre contenu et ses statistiques ne redirigent pas vers l’accueil par erreur.
- Les changements sensibles sont audités ; les textes et préférences fonctionnent en français et en anglais, en thème clair et sombre, sur mobile et ordinateur.
