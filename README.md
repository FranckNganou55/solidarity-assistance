# Makénéné Solidarité

Application web responsive de gestion multi-groupes des membres, assistances, événements, demandes et cotisations.

## Stack et dossiers actifs

- **Application backend et serveur web :** Laravel 13 / PHP 8.3 — `backend-laravel/`
- **Interface :** Vue 3, Vue Router et Pinia — `backend-laravel/resources/js/`
- **Assets frontend :** Vite
- **Base active :** MySQL 8 de Wampserver, base `makenene-solidarite`, `127.0.0.1:3306`
- **Fichiers téléversés :** `backend-laravel/storage/app/public/uploads`

Le code Laravel/Vue de `backend-laravel/` est l’application utilisée. Le dossier `frontend-vue/` et les anciens dossiers `backend/` et `frontend/` visibles à la racine ne sont pas les points d’entrée du démarrage actuel.

## Prérequis

- Wampserver démarré avec le service **MySQL** actif sur le port `3306`.
- PHP 8.3 compatible Laravel 13, avec `pdo_mysql` activé.
- Composer, Node.js et npm accessibles dans PowerShell.
- Le fichier `backend-laravel/.env` configuré pour la base locale.

La base `makenene-solidarite` existe déjà dans MySQL et contient les données migrées depuis PostgreSQL. Une sauvegarde de migration, incluant l’archive PostgreSQL, se trouve dans `backend-laravel/storage/app/migration-backups/2026-11-18-pre-mysql/`. Traitez ce dossier comme une sauvegarde privée et conservez-en une copie sûre.

### Initialiser une nouvelle base avec les données de démonstration

Le dépôt contient un seeder avec des groupes et membres **fictifs et anonymisés**. Il ne copie pas les données réelles de l’association. Sur une base MySQL neuve, activez temporairement `SEED_DEMO_DATA=true` dans `backend-laravel/.env`, puis lancez depuis `backend-laravel/` :

```powershell
php artisan migrate --seed
```

Les identifiants temporaires générés sont enregistrés localement dans `storage/app/private/demo-credentials.txt`, sous `backend-laravel/`. Ce fichier est ignoré par Git. Les comptes doivent changer leur mot de passe à la première connexion. Après le seeding, remettez `SEED_DEMO_DATA=false`. Si la base contient déjà d’autres groupes, le seeder ignore les exemples et conserve les données présentes.

## Installation ou préparation du poste

Depuis PowerShell à la racine du dépôt :

```powershell
cd backend-laravel
composer install
npm install
```

Si `backend-laravel/.env` n’existe pas, créez-le depuis le modèle :

```powershell
Copy-Item .env.example .env
```

Puis configurez les valeurs de connexion MySQL dans `.env` :

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=makenene-solidarite
DB_USERNAME=VOTRE_UTILISATEUR_MYSQL
DB_PASSWORD=VOTRE_MOT_DE_PASSE
DB_TIMEZONE=+00:00
```

Utilisez un compte MySQL limité à cette base, plutôt que de partager ses identifiants. Ne publiez jamais `.env`. L’application utilise aussi les variables `MAIL_*` de ce fichier pour Brevo ; utilisez un expéditeur autorisé dans Brevo et vérifiez les journaux transactionnels pour confirmer la remise effective des messages.

Pour une installation neuve seulement, si `APP_KEY` est vide, générez-la avec `php artisan key:generate`. Ne régénérez pas la clé d’une installation existante : cela invaliderait les sessions et les données chiffrées. Créez le lien de stockage si nécessaire :

```powershell
php artisan storage:link
```

La base MySQL actuelle contient les données de l’application. Avant toute opération de schéma, vérifiez l’état des migrations :

```powershell
php artisan migrate:status
```

**Ne lancez pas** `php artisan migrate:fresh`, `php artisan db:wipe` ou un seeder destructif sur cette base. Ces commandes peuvent supprimer les données. Faites une sauvegarde vérifiée avant toute migration de production.

## Démarrer l’application en local

1. Démarrez MySQL depuis Wampserver.
2. Ouvrez PowerShell à la racine du dépôt et lancez :

   ```powershell
   .\scripts\start-local.ps1
   ```

3. Ouvrez **http://127.0.0.1:8082/login**.

Le script vérifie MySQL, PHP `pdo_mysql`, le fichier `.env` et les dépendances Vue. Il lance Laravel sur le port `8082` et Vite sur `3000`. Les journaux sont écrits dans `backend-laravel/storage/logs/local-api*.log` et `local-vite*.log`. Le script ne démarre pas Wampserver/MySQL.

## Commandes utiles

À exécuter depuis `backend-laravel/` :

```powershell
# État des migrations, sans modification de la base
php artisan migrate:status

# Routes web et API
php artisan route:list --except-vendor
php artisan route:list --path=api --except-vendor

# Compilation frontend pour livraison
npm run build
```

Pour lancer les tests automatisés, configurez d’abord une base de test distincte, puis exécutez `php artisan test`.

## Courriels Brevo

La configuration SMTP est lue depuis les variables `MAIL_*` de `backend-laravel/.env`. Renseignez les paramètres SMTP fournis par Brevo et un expéditeur/domaine autorisé. L’acceptation d’un message par le relais SMTP ne garantit pas sa livraison dans la boîte du destinataire : consultez les journaux transactionnels Brevo et vérifiez aussi les courriers indésirables et les rejets.

## Déploiement

`start-local.ps1` et le serveur Vite de développement servent au poste local. Pour un déploiement, configurez le serveur web afin qu’il pointe vers `backend-laravel/public`, activez HTTPS, définissez `APP_ENV=production` et `APP_DEBUG=false`, et conservez les secrets hors du dépôt. Prévoyez une base MySQL sauvegardée, un stockage persistant pour les fichiers et une sauvegarde testée avant les migrations.

Depuis `backend-laravel/`, préparez les dépendances et les assets :

```sh
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

Après revue et sauvegarde de la base, appliquez les migrations de production avec `php artisan migrate --force`. N’utilisez pas le `.env` local sur un serveur public.

---
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

La stack actuelle remplace celle du document initial : **Laravel/PHP 8.3, Vue.js 3, Vite et MySQL 8 (Wampserver en local)**. L’application Laravel se trouve dans `backend-laravel/` ; les pages et composants Vue sont organisés dans `backend-laravel/resources/js/`. Laravel porte les modèles, contrôleurs, requêtes, middlewares, services, routes web/API, migrations et ressources. MySQL conserve les données métier ; les fichiers téléversés sont conservés dans le stockage persistant Laravel.

Le déploiement doit servir l’application depuis `backend-laravel/public`, avec HTTPS, `APP_DEBUG=false`, secrets conservés hors du dépôt, sauvegardes MySQL régulières et testées, stockage persistant des fichiers, migrations relues avant exécution et journalisation des actions sensibles. Le script de développement `scripts/start-local.ps1` n’est pas un serveur de production.

### 10. Critères d’acceptation essentiels

- Les permissions et l’accès aux groupes sont appliqués côté serveur ; un utilisateur ne peut pas consulter ou modifier les données d’un groupe auquel il n’a pas accès.
- Le super administrateur seul peut créer, modifier ou supprimer un groupe ; les administrateurs principaux restent limités à leurs groupes.
- Les membres du bureau sont aussi présents dans les listes de membres et peuvent cotiser selon les mêmes règles.
- Un membre inactif ne peut plus ouvrir de session, tandis que ses historiques restent consultables par les personnes habilitées.
- Le seuil collectif, le seuil individuel, la valeur zéro, l’exception d’éligibilité, le minimum de cotisation, la preuve et la validation/invalidation des cotisations respectent les règles décrites ci-dessus.
- La page Événements ne montre que les assistances ouvertes ; chaque menu présente son propre contenu et ses statistiques ne redirigent pas vers l’accueil par erreur.
- Les changements sensibles sont audités ; les textes et préférences fonctionnent en français et en anglais, en thème clair et sombre, sur mobile et ordinateur.
