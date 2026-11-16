package cm.makenene.solidarite.domain;

/** Actions distinctes configurables par rôle et limitées au groupe actif. */
public enum Permission {
    GROUP_CREATE("Créer un groupe", "Create a group", "Groupes"),
    GROUP_VIEW("Consulter les groupes", "View groups", "Groupes"),
    GROUP_MANAGE("Modifier les informations du groupe", "Manage group details", "Groupes"),

    MEMBER_VIEW("Consulter les membres", "View members", "Membres"),
    MEMBER_CREATE("Créer un membre", "Create a member", "Membres"),
    MEMBER_EDIT("Modifier un membre", "Edit a member", "Membres"),
    MEMBER_THRESHOLD_EDIT("Personnaliser le seuil d’assistance d’un membre", "Set a member assistance threshold", "Membres"),
    MEMBER_DELETE("Supprimer un membre", "Delete a member", "Membres"),
    MEMBER_ARCHIVE("Archiver ou restaurer un membre", "Archive or restore a member", "Membres"),
    MEMBER_RESET_PASSWORD("Réinitialiser le mot de passe d'un membre", "Reset a member password", "Membres"),

    ROLE_VIEW("Consulter les rôles", "View roles", "Rôles"),
    ROLE_CREATE("Créer un rôle", "Create a role", "Rôles"),
    ROLE_EDIT("Modifier un rôle et ses permissions", "Edit a role and permissions", "Rôles"),
    ROLE_DELETE("Supprimer un rôle", "Delete a role", "Rôles"),
    ROLE_ASSIGN("Attribuer un rôle à un membre", "Assign a role to a member", "Rôles"),

    ASSISTANCE_TYPE_VIEW("Consulter les types d'assistance", "View assistance types", "Types d'assistance"),
    ASSISTANCE_TYPE_CREATE("Créer un type d'assistance", "Create an assistance type", "Types d'assistance"),
    ASSISTANCE_TYPE_EDIT("Modifier un type d'assistance", "Edit an assistance type", "Types d'assistance"),
    ASSISTANCE_TYPE_DELETE("Supprimer un type d'assistance", "Delete an assistance type", "Types d'assistance"),

    EVENT_VIEW("Consulter les assistances", "View assistance events", "Assistances"),
    EVENT_CREATE("Créer une assistance", "Create an assistance", "Assistances"),
    EVENT_EDIT("Modifier une assistance ouverte", "Edit an open assistance", "Assistances"),
    EVENT_CLOSE("Clôturer une assistance", "Close an assistance", "Assistances"),
    EVENT_EDIT_CLOSED("Modifier une assistance clôturée", "Edit a closed assistance", "Assistances"),
    EVENT_REOPEN("Rouvrir une assistance", "Reopen an assistance", "Assistances"),
    EVENT_CANCEL("Annuler une assistance", "Cancel an assistance", "Assistances"),

    REQUEST_CREATE("Soumettre une demande d'assistance", "Submit an assistance request", "Demandes"),
    REQUEST_VIEW("Consulter les demandes du groupe", "View group requests", "Demandes"),
    REQUEST_APPROVE("Approuver une demande", "Approve a request", "Demandes"),
    REQUEST_REJECT("Rejeter une demande", "Reject a request", "Demandes"),
    REQUEST_OVERRIDE_ELIGIBILITY("Autoriser une demande sous le seuil", "Allow a request below the threshold", "Demandes"),

    CONTRIBUTION_SUBMIT("Soumettre une cotisation", "Submit a contribution", "Cotisations"),
    CONTRIBUTION_VIEW("Consulter ses cotisations", "View own contributions", "Cotisations"),
    CONTRIBUTION_VIEW_ALL("Consulter toutes les cotisations du groupe", "View group contributions", "Cotisations"),
    CONTRIBUTION_VALIDATE("Valider une cotisation", "Validate a contribution", "Cotisations"),
    CONTRIBUTION_REJECT("Rejeter une cotisation", "Reject a contribution", "Cotisations"),

    REPORT_VIEW("Consulter les statistiques du groupe", "View group reports", "Rapports"),
    SETTINGS_VIEW("Consulter les paramètres du groupe", "View group settings", "Paramètres"),
    SETTINGS_MANAGE("Modifier les paramètres du groupe", "Manage group settings", "Paramètres"),
    AUDIT_VIEW("Consulter le journal d'audit du groupe", "View group audit log", "Administration"),

    // Compatibilité de migration : ces actions historiques sont éclatées et masquées du catalogue.
    MEMBER_MANAGE("Compatibilité - gestion des membres", "Legacy member management", "Legacy"),
    ROLE_MANAGE("Compatibilité - gestion des rôles", "Legacy role management", "Legacy"),
    ASSISTANCE_TYPE_MANAGE("Compatibilité - gestion des types", "Legacy type management", "Legacy"),
    EVENT_MANAGE("Compatibilité - gestion des assistances", "Legacy event management", "Legacy"),
    REQUEST_MANAGE("Compatibilité - gestion des demandes", "Legacy request management", "Legacy");

    private final String labelFr;
    private final String labelEn;
    private final String group;
    Permission(String labelFr, String labelEn, String group) { this.labelFr = labelFr; this.labelEn = labelEn; this.group = group; }
    public String labelFr() { return labelFr; }
    public String labelEn() { return labelEn; }
    public String group() { return group; }
}
