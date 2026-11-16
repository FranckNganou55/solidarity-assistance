package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private AssociationGroup group;

    private Long actorId;
    private String actorName;
    @Column(length = 60)
    private String action;
    @Column(length = 40)
    private String entityType;
    private Long entityId;
    @Column(length = 1000)
    private String details;
    private Instant createdAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }
}
