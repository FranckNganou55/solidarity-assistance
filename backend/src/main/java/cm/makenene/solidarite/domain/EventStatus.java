package cm.makenene.solidarite.domain;

public enum EventStatus {
    OPEN,      // assistance en cours : les cotisations sont ouvertes
    CLOSED,    // assistance cloturee (date de cloture atteinte ou cloture manuelle)
    CANCELLED  // assistance annulee
}
