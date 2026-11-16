package cm.makenene.solidarite.entity;

import cm.makenene.solidarite.domain.RequestStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Demande d'assistance faite par un membre.
 */
@Entity
@Table(name = "assistance_requests", indexes = @Index(name = "idx_req_member", columnList = "member_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssistanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private AssociationGroup group;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "member_id")
    private Member member;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "type_id")
    private AssistanceType type;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "document_url", length = 300)
    private String documentUrl;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RequestStatus status = RequestStatus.PENDING;

    /** Etat du compteur au moment de la demande (tracabilite). */
    private Integer cycleCountAtRequest;
    private Integer minRequiredAtRequest;
    private boolean eligible;

    @Column(length = 500)
    private String decisionComment;

    private Long decidedBy;
    private Instant decidedAt;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "event_id")
    private AssistanceEvent event;

    private Instant createdAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }
}
