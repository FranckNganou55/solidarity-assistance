package cm.makenene.solidarite.entity;

import cm.makenene.solidarite.domain.ContributionMethod;
import cm.makenene.solidarite.domain.ContributionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "contributions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_contribution_event_member", columnNames = {"event_id", "member_id"})
}, indexes = @Index(name = "idx_contrib_member", columnList = "member_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Contribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "event_id")
    private AssistanceEvent event;

    /** Membre qui cotise. */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContributionMethod method = ContributionMethod.CASH;

    @Column(length = 255)
    private String note;

    @Column(name = "proof_photo_url", length = 300)
    private String proofPhotoUrl;

    @Column(name = "proof_photo_shape", nullable = false, length = 10)
    @Builder.Default
    private String proofPhotoShape = "SQUARE";

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ContributionStatus status = ContributionStatus.PENDING;

    /** Cycle d'assistance du membre au moment de la cotisation (historique). */
    private Integer cycleNumber;

    private Instant submittedAt;
    private Instant validatedAt;
    private Long validatedBy;
    private String rejectionReason;

    /**
     * Verification du tresorier : confirme qu'il a effectivement percu l'argent du membre
     * avant de valider la cotisation.
     */
    @Builder.Default
    @Column(nullable = false)
    private boolean paymentReceived = false;

    /** Reference du recu / de l'operation Mobile Money (optionnelle). */
    @Column(length = 80)
    private String receiptReference;

    private Instant paymentReceivedAt;
    private Long paymentReceivedBy;

    @PrePersist
    void onCreate() { if (this.submittedAt == null) this.submittedAt = Instant.now(); }
}
