const fs = require('fs');
const path = require('path');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, ImageRun,
  LevelFormat, PageBreak, PageNumber, Packer, Paragraph, ShadingType, Table, TableCell,
  TableRow, TextRun, VerticalAlign, WidthType,
} = require('docx');

const root = path.resolve(__dirname, '..');
const logoPath = path.join(root, 'logo-fm-mak.jpeg');
const outputPath = path.join(root, 'Guide_utilisation_Makenene_Solidarite.docx');
const navy = '264557';
const coral = 'F3856A';
const pale = 'EAF1F3';
const light = 'F6F8F6';
const ink = '1B2A33';
const muted = '66757B';
const line = 'DDE5E3';
const tableWidths = [2600, 7200];

const body = (text, options = {}) => new Paragraph({
  children: [new TextRun({ text, font: 'Aptos', size: 22, color: ink, ...options.run })],
  spacing: { after: 120, line: 276, ...options.spacing },
  alignment: options.alignment,
  keepNext: options.keepNext,
});

const bullet = (text) => new Paragraph({
  numbering: { reference: 'guide-bullets', level: 0 },
  children: [new TextRun({ text, font: 'Aptos', size: 21, color: ink })],
  spacing: { after: 80, line: 264 },
});

const heading = (text, level = HeadingLevel.HEADING_1) => new Paragraph({
  text,
  heading: level,
  keepNext: true,
  spacing: { before: level === HeadingLevel.HEADING_1 ? 280 : 180, after: 100 },
});

const cell = (text, width, isHeader = false, fill = null) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: { type: ShadingType.CLEAR, fill: fill ?? (isHeader ? navy : 'FFFFFF') },
  margins: { top: 100, bottom: 100, left: 120, right: 120 },
  verticalAlign: VerticalAlign.CENTER,
  children: [new Paragraph({
    children: [new TextRun({ text, font: 'Aptos', size: isHeader ? 20 : 19, bold: isHeader, color: isHeader ? 'FFFFFF' : ink })],
    spacing: { after: 0, line: 240 },
  })],
});

const table = (headers, rows, widths = tableWidths) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths,
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color: line },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: line },
    left: { style: BorderStyle.SINGLE, size: 4, color: line },
    right: { style: BorderStyle.SINGLE, size: 4, color: line },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 3, color: line },
    insideVertical: { style: BorderStyle.SINGLE, size: 3, color: line },
  },
  rows: [
    new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], true)) }),
    ...rows.map((row, rowIndex) => new TableRow({
      cantSplit: true,
      children: row.map((value, i) => cell(value, widths[i], false, rowIndex % 2 ? 'FFFFFF' : light)),
    })),
  ],
});

const callout = (title, text, color = pale) => new Table({
  width: { size: 9800, type: WidthType.DXA },
  columnWidths: [9800],
  borders: {
    top: { style: BorderStyle.SINGLE, size: 4, color },
    bottom: { style: BorderStyle.SINGLE, size: 4, color },
    left: { style: BorderStyle.SINGLE, size: 18, color: coral },
    right: { style: BorderStyle.SINGLE, size: 4, color },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 0, color },
    insideVertical: { style: BorderStyle.SINGLE, size: 0, color },
  },
  rows: [new TableRow({ cantSplit: true, children: [new TableCell({
    width: { size: 9800, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: color },
    margins: { top: 150, bottom: 150, left: 220, right: 180 },
    children: [
      new Paragraph({ children: [new TextRun({ text: title, font: 'Aptos Display', size: 21, bold: true, color: navy })], spacing: { after: 70 } }),
      new Paragraph({ children: [new TextRun({ text, font: 'Aptos', size: 20, color: ink })], spacing: { after: 0, line: 264 } }),
    ],
  })] })],
});

const guideHeader = () => new Header({ children: [new Paragraph({
  alignment: AlignmentType.RIGHT,
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: line, space: 6 } },
  children: [new TextRun({ text: 'MAKÉNÉNÉ SOLIDARITÉ  |  GUIDE D’UTILISATION', font: 'Aptos', size: 16, bold: true, color: muted })],
})] });

const content = [];

content.push(new Paragraph({ spacing: { before: 2000, after: 260 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'MAKÉNÉNÉ SOLIDARITÉ', font: 'Aptos Display', size: 30, bold: true, color: navy, characterSpacing: 28 })] }));
content.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 },
  children: [new ImageRun({ data: fs.readFileSync(logoPath), type: 'jpg', transformation: { width: 190, height: 190 } })] }));
content.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 150 },
  children: [new TextRun({ text: 'GUIDE D’UTILISATION', font: 'Aptos Display', size: 38, bold: true, color: navy })] }));
content.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
  children: [new TextRun({ text: 'Gérer les membres, les cycles de solidarité, les assistances et les cotisations', font: 'Aptos', size: 23, color: muted })] }));
content.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: coral, space: 12 } }, spacing: { after: 320 }, children: [] }));
content.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
  children: [new TextRun({ text: 'Application web responsive', font: 'Aptos', size: 21, bold: true, color: navy })] }));
content.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: 'Édition de novembre 2026', font: 'Aptos', size: 19, color: muted })] }));
content.push(new Paragraph({ children: [new PageBreak()] }));

content.push(heading('1. À quoi sert l’application ?'));
content.push(body('L’application gère plusieurs groupes ou associations dans un même espace. Chaque groupe possède ses membres, ses rôles, ses assistances, ses cotisations, ses paramètres et son historique. Les membres cotisent dans les assistances ouvertes; le trésorier confirme la réception avant validation.'));
content.push(heading('Connexion et première visite', HeadingLevel.HEADING_2));
content.push(bullet('Ouvrez l’adresse de l’application communiquée par l’association. En local, elle est généralement accessible à http://localhost:3000.'));
content.push(bullet('Connectez-vous avec votre numéro de téléphone et votre mot de passe.'));
content.push(bullet('Lors d’une première connexion avec un mot de passe temporaire, choisissez un nouveau mot de passe lorsque l’application le demande.'));
content.push(bullet('Le menu latéral regroupe les pages sur ordinateur. Sur téléphone, utilisez la navigation mobile. Les pages visibles dépendent du rôle et des permissions du compte.'));

content.push(heading('Repères de navigation', HeadingLevel.HEADING_2));
content.push(table(['Zone', 'Usage'], [
  ['Vue générale', 'Accueil, assistances, cotisations et demandes.'],
  ['Barre supérieure', 'Le super administrateur choisit un groupe dans la liste. Un membre d’un seul groupe voit uniquement le nom de son groupe. Les données affichées changent avec le groupe actif.'],
  ['Gestion', 'Membres, types d’assistance et journal d’audit, selon les permissions du rôle. Les rôles et leurs permissions sont dans Administration.'],
  ['Administration', 'Membres du bureau, rôles, affectations de rôles et, pour le super administrateur uniquement, création des groupes.'],
  ['Paramètres', 'Entrée directe du menu vertical : identité et règles du groupe actif. Les préférences de langue et de thème restent accessibles au compte.'],
  ['Profil', 'Informations du compte, préférences personnelles et changement de mot de passe.'],
]));

content.push(heading('Les groupes et les niveaux d’administration', HeadingLevel.HEADING_2));
content.push(table(['Profil', 'Droits et responsabilités'], [
  ['Super administrateur de l’application', 'Seul profil qui crée les groupes. Il voit tous les groupes, peut sélectionner leur contexte et gérer les membres ou les rattachements entre associations.'],
  ['Administrateur principal d’un groupe', 'Gère uniquement son groupe : crée des membres, attribue les rôles autorisés, nomme le bureau, gère les paramètres et peut autoriser une assistance sous le seuil. Il ne peut pas créer un groupe.'],
  ['Membre', 'Se connecte avec son téléphone et son mot de passe. Il consulte uniquement les pages permises par son rôle et les données du groupe auquel il appartient.'],
]));
content.push(bullet('Les comptes sont créés par le super administrateur ou l’administrateur principal du groupe. L’inscription publique est désactivée. Le numéro de téléphone sert d’identifiant de connexion.'));
content.push(bullet('Un membre peut appartenir à plusieurs groupes. Le super administrateur peut rattacher un membre existant à une autre association; son cycle de cotisations démarre séparément dans chaque groupe.'));

content.push(heading('2. Le cycle d’assistance : réglage et fonctionnement'));
content.push(callout('Seuils indépendants par groupe', 'Chaque groupe définit un seuil général dans ses Paramètres. Un seuil individuel peut ensuite remplacer cette valeur pour un membre. Les compteurs et historiques restent séparés par groupe.'));
content.push(heading('Modifier le seuil général', HeadingLevel.HEADING_2));
content.push(body('Avec le rôle Administrateur (ou la permission de gestion des paramètres) :'));
content.push(bullet('Ouvrez Paramètres dans le menu vertical.'));
content.push(bullet('Dans Règles de solidarité, modifiez « Assistances minimum avant d’être assisté ». Le système exige au moins 1.'));
content.push(bullet('Enregistrez les paramètres. Les membres sans seuil particulier sont évalués avec cette nouvelle valeur.'));
content.push(bullet('Le changement s’applique à tous les membres sans seuil personnalisé du groupe actif, y compris les membres du bureau.'));
content.push(heading('Définir un seuil particulier', HeadingLevel.HEADING_2));
content.push(body('Dans Gestion → Membres, créez ou modifiez une fiche et renseignez « Minimum personnalisé ». Un nombre supérieur ou égal à 1 remplace le seuil général pour ce membre. Laissez le champ vide ou effacez sa valeur pour rétablir automatiquement le seuil général. Le réglage individuel s’applique aussi aux membres qui occupent une fonction au bureau.'));
content.push(callout('Priorité des seuils', 'Le seuil individuel du membre est prioritaire. En son absence, l’application utilise le seuil général configuré dans Paramètres → Règles de solidarité.'));
content.push(heading('Ce que mesure le compteur', HeadingLevel.HEADING_2));
content.push(table(['Élément', 'Règle'], [
  ['Progression de cycle', 'Une cotisation augmente le compteur seulement après confirmation de la réception de l’argent et validation par le trésorier. Une soumission en attente ou rejetée ne compte pas.'],
  ['Éligibilité', 'Le membre peut demander une assistance lorsque son compteur atteint ou dépasse le seuil qui lui est applicable.'],
  ['Remise à zéro', 'Lorsque l’assistance est accordée et créée pour le membre, le compteur de cycle revient à zéro. Le total historique des cotisations reste conservé.'],
  ['Exemple', 'Avec un seuil de 2, un membre doit avoir 2 cotisations validées pour demander une assistance. Après attribution de l’assistance, son cycle recommence à 0/2.'],
]));

content.push(heading('3. Parcours d’un membre'));
content.push(heading('Cotiser à une assistance', HeadingLevel.HEADING_2));
content.push(bullet('Ouvrez Assistances et choisissez une assistance au statut Ouverte.'));
content.push(bullet('Ouvrez sa fiche, saisissez le montant, choisissez le mode de paiement et ajoutez une note ou référence si utile.'));
content.push(bullet('Soumettez la cotisation. Elle apparaît comme En attente jusqu’à son traitement par le trésorier.'));
content.push(bullet('Une cotisation par membre et par assistance est autorisée. La cotisation est faite pour le compte du membre connecté.'));

content.push(heading('Demander une assistance', HeadingLevel.HEADING_2));
content.push(bullet('Consultez votre progression dans l’accueil ou le profil. Elle est affichée sous la forme compteur / seuil.'));
content.push(bullet('Lorsque le seuil est atteint, ouvrez Demandes, puis Nouvelle demande. Choisissez un type d’assistance et expliquez le motif.'));
content.push(bullet('Suivez le statut de la demande dans Mes demandes. Une demande en attente doit être examinée par un gestionnaire.'));
content.push(bullet('Si le seuil n’est pas atteint, l’application indique le nombre de cotisations validées encore nécessaires.'));
content.push(bullet('L’administrateur principal peut créer directement une assistance sous le seuil en activant l’autorisation exceptionnelle. L’action est réservée aux comptes habilités et l’identité de l’autorisateur est conservée dans la fiche de l’assistance.'));

content.push(heading('Suivre ses cotisations', HeadingLevel.HEADING_2));
content.push(body('Dans Cotisations, le membre consulte l’état de ses versements. La fiche distingue l’attente de validation, le rejet éventuel et la cotisation validée. Lorsqu’elle est validée, les informations de réception du paiement et le trésorier vérificateur sont conservés dans l’historique.'));

content.push(heading('4. Parcours du trésorier'));
content.push(body('Le trésorier traite les versements dans Cotisations → À traiter. Pour chaque cotisation :'));
content.push(bullet('Ouvrez la fiche de vérification et comparez le membre, l’assistance, le montant, le mode de paiement et la note éventuelle.'));
content.push(bullet('Si l’argent a bien été reçu, confirmez la réception dans la fiche. Une référence de reçu ou de transaction peut être ajoutée.'));
content.push(bullet('Validez la cotisation. Cette action augmente le compteur de cycle et le total historique du membre.'));
content.push(bullet('Si l’argent n’a pas été reçu ou si le versement est incorrect, rejetez la cotisation avec un motif. Un versement rejeté ne fait pas progresser le cycle.'));
content.push(callout('À retenir', 'La validation est bloquée tant que le trésorier n’a pas confirmé avoir effectivement reçu l’argent.'));

content.push(heading('5. Parcours du gestionnaire d’assistances'));
content.push(heading('Traiter une demande', HeadingLevel.HEADING_2));
content.push(bullet('Ouvrez Demandes et sélectionnez l’onglet des demandes à traiter.'));
content.push(bullet('Vérifiez le membre, son compteur de cycle, le type et le motif. Une demande standard doit respecter le seuil du groupe ou le seuil particulier du membre.'));
content.push(bullet('À l’approbation, fixez si nécessaire la date de clôture et l’objectif de collecte. L’application crée l’assistance associée.'));
content.push(heading('Créer ou clôturer une assistance', HeadingLevel.HEADING_2));
content.push(bullet('Les types d’assistance sont gérés par un rôle autorisé dans Gestion → Types d’assistance. Les options créer, modifier et supprimer sont des permissions distinctes.'));
content.push(bullet('Un rôle autorisé peut créer une assistance avec type, bénéficiaire, motif, date de clôture et objectif facultatif. L’administrateur principal peut autoriser explicitement un bénéficiaire sous son seuil.'));
content.push(bullet('Une assistance peut être clôturée par l’action de gestion ou à l’échéance de sa date. Après clôture, les cotisations ne sont plus acceptées.'));
content.push(bullet('La date de demande et la date de clôture sont consultables dans l’historique. Après clôture, seules les permissions de modification après clôture, de réouverture ou d’annulation peuvent agir; l’administrateur principal du groupe les possède par défaut.'));

content.push(heading('6. Administration et gestion des comptes'));
content.push(heading('Membres et rôles', HeadingLevel.HEADING_2));
content.push(bullet('Dans Gestion → Membres, l’administrateur principal crée un membre pour son groupe avec nom, prénom, téléphone, ville et quartier. Photo, courriel et seuil individuel sont facultatifs. Un mot de passe temporaire est fourni à la création.'));
content.push(bullet('Dans Administration → Rôles, définissez les permissions. Les actions créer, modifier, supprimer, archiver et attribuer un rôle sont séparées. Dans Administration → Affectations des rôles, attribuez ensuite le rôle à un membre déjà créé.'));
content.push(heading('Membres du bureau', HeadingLevel.HEADING_2));
content.push(bullet('Après avoir créé le membre et attribué son rôle applicatif dans Gestion → Membres, ouvrez Administration pour le nommer à une fonction du bureau. Cette page affiche la liste des personnes actuellement nommées. Toute personne nommée reste un membre ordinaire pour les cotisations et le cycle d’assistance.'));
content.push(bullet('Utilisez Modifier pour changer sa fonction, Remplacer pour confier le même poste à un autre membre actif, ou Retirer du bureau pour supprimer uniquement sa nomination. Le compte, les permissions et l’historique de cotisation du membre restent conservés.'));
content.push(bullet('Les membres nommés portent aussi la mention « Membre du bureau » dans la liste et la fiche des membres, en plus de l’intitulé de leur fonction.'));
content.push(bullet('L’administrateur principal est le responsable technique et associatif de son groupe. Le super administrateur gère la plateforme et crée les groupes. Les rôles techniques et les fonctions du bureau sont deux notions distinctes.'));
content.push(bullet('Archiver un membre désactive son accès à ce groupe. Si le membre n’appartient plus à aucun autre groupe actif, sa connexion est désactivée. Les comptes archivés restent dans l’historique et peuvent être réactivés par un rôle autorisé.'));
content.push(heading('Créer un groupe (super administrateur)', HeadingLevel.HEADING_2));
content.push(bullet('Ouvrez Administration → Groupes et associations. Seul le super administrateur voit cette entrée.')); 
content.push(bullet('Saisissez le nom, la description, la ville, les contacts, la monnaie, les couleurs du thème et le seuil général. Ajoutez le logo du groupe.')); 
content.push(bullet('Renseignez le membre qui deviendra administrateur principal. Le système crée son compte et son rôle dans ce nouveau groupe. Son téléphone est son identifiant; au premier accès, il doit changer le mot de passe temporaire.')); 
content.push(bullet('Pour rattacher un membre déjà créé à un autre groupe, sélectionnez-le depuis le groupe actif, puis ajoutez-le à l’association cible. Chaque groupe conserve ses propres rôles et compteurs.')); 
content.push(heading('Paramètres et préférences', HeadingLevel.HEADING_2));
content.push(bullet('Paramètres permet de mettre à jour le nom et le logo de l’association, la devise, les couleurs, le seuil général et les valeurs par défaut.'));
content.push(bullet('Les préférences de langue et de thème de l’utilisateur peuvent être réglées depuis son profil ou la barre supérieure sur grand écran.'));
content.push(bullet('Le Journal d’audit conserve les principales actions de gestion, selon les permissions du compte.'));
content.push(heading('Notifications', HeadingLevel.HEADING_2));
content.push(bullet('La cloche en haut affiche les notifications récentes et le nombre de notifications non lues. Les alertes sont actualisées automatiquement.'));
content.push(bullet('Les personnes habilitées à valider les cotisations dans le groupe actif sont averties lors d’une nouvelle soumission. Le membre reçoit une alerte lorsque sa cotisation est validée. Un son discret est émis lorsque l’application reçoit une nouvelle alerte dans le navigateur.'));

content.push(heading('7. Résolution rapide des situations courantes'));
content.push(table(['Situation', 'Que faire ?'], [
  ['Le membre ne peut pas demander d’assistance', 'Vérifiez son compteur et son seuil. Seules les cotisations validées après réception effective du paiement augmentent le compteur.'],
  ['Une cotisation reste en attente', 'Le trésorier doit l’examiner, confirmer la réception des fonds, puis la valider ou la rejeter.'],
  ['Un membre ne peut plus se connecter', 'Vérifiez si son compte est marqué Archivé. Un gestionnaire autorisé peut le réactiver.'],
  ['Un menu ou une action est absent', 'Les pages et actions sont filtrées par les permissions du rôle. Demandez à l’administrateur système de vérifier l’attribution du rôle et ses permissions.'],
  ['Le seuil général ne semble pas changer', 'Vérifiez que vous avez la permission de gestion des paramètres et que vous avez enregistré le formulaire. Les seuils particuliers restent prioritaires.'],
]));

content.push(new Paragraph({ spacing: { before: 220, after: 60 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: line, space: 8 } }, children: [] }));
content.push(body('Makénéné Solidarité — guide établi à partir des fonctions actuellement disponibles dans l’application.', { run: { size: 18, color: muted }, alignment: AlignmentType.CENTER }));

const doc = new Document({
  creator: 'Makénéné Solidarité',
  title: 'Guide d’utilisation — Makénéné Solidarité',
  subject: 'Guide pratique des assistances, cotisations et cycles de solidarité',
  description: 'Guide utilisateur basé sur les fonctions disponibles en novembre 2026.',
  numbering: { config: [{
    reference: 'guide-bullets',
    levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
  }] },
  styles: {
    default: { document: { run: { font: 'Aptos', size: 22, color: ink }, paragraph: { spacing: { after: 120, line: 276 } } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Aptos Display', size: 32, bold: true, color: navy },
        paragraph: { outlineLevel: 0, spacing: { before: 280, after: 120, line: 300 }, keepNext: true,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: coral, space: 5 } } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Aptos Display', size: 25, bold: true, color: navy },
        paragraph: { outlineLevel: 1, spacing: { before: 190, after: 80, line: 280 }, keepNext: true } },
    ],
  },
  sections: [{
    properties: { page: { margin: { top: 850, right: 900, bottom: 850, left: 900 } } },
    headers: { default: guideHeader(), even: guideHeader() },
    footers: { default: new Footer({ children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Édition novembre 2026   ·   Page ', font: 'Aptos', size: 16, color: muted }), new TextRun({ children: [PageNumber.CURRENT], font: 'Aptos', size: 16, color: muted })],
    })] }) },
    children: content,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log(outputPath);
}).catch((error) => { console.error(error); process.exitCode = 1; });
