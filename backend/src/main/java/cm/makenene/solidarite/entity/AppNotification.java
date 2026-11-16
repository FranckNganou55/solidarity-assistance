package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "app_notifications", indexes = @Index(name = "idx_app_notifications_recipient_created", columnList = "recipient_id, created_at"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AppNotification {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "group_id")
    private AssociationGroup group;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private Member recipient;
    @Column(name = "notification_type", nullable = false, length = 40)
    private String type;
    @Column(nullable = false, length = 160)
    private String title;
    @Column(nullable = false, length = 500)
    private String message;
    @Column(name = "entity_type", length = 40)
    private String entityType;
    private Long entityId;
    @Column(nullable = false)
    private Instant createdAt;
    private Instant readAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
