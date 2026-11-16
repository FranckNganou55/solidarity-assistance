package cm.makenene.solidarite.entity;

import cm.makenene.solidarite.domain.EventStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Une assistance = un evenement. Les membres cotisent lorsqu'une assistance est ouverte.
 */
@Entity
@Table(name = "events", indexes = {
        @Index(name = "idx_events_status", columnList = "status"),
        @Index(name = "idx_events_beneficiary", columnList = "beneficiary_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssistanceEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private AssociationGroup group;

    @Column(nullable = false, unique = true, length = 30)
    private String reference;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "type_id")
    private AssistanceType type;

    /** Membre qui recoit l'assistance. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "beneficiary_id")
    private Member beneficiary;

    @Column(length = 1000)
    private String description;

    @Column(name = "supporting_document_url", length = 300)
    private String supportingDocumentUrl;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status = EventStatus.OPEN;

    /** Date de cloture fixee par le gestionnaire : plus aucune cotisation au-dela. */
    private LocalDate closingDate;

    /** Date originale de la demande membre (distincte de la date d'approbation). */
    private Instant requestedAt;

    /** Objectif de collecte (optionnel). */
    private BigDecimal targetAmount;

    private Instant closedAt;
    private Long closedBy;

    @Column(nullable = false)
    private boolean eligibilityOverridden;
    private Long eligibilityOverrideBy;

    private Long createdBy;
    private Instant createdAt;
    private Instant updatedAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}
