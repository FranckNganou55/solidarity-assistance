package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "group_members", uniqueConstraints = @UniqueConstraint(name = "uk_group_member", columnNames = {"group_id", "member_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class GroupMembership {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "group_id", nullable = false)
    private AssociationGroup group;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "member_id", nullable = false)
    private Member member;
    @ManyToOne(fetch = FetchType.EAGER, optional = false) @JoinColumn(name = "role_id", nullable = false)
    private Role role;
    @Column(name = "is_principal_admin", nullable = false) @Builder.Default private boolean principalAdmin = false;
    @Column(nullable = false) @Builder.Default private boolean active = true;
    @Column(name = "cycle_contributions", nullable = false) @Builder.Default private int cycleContributions = 0;
    @Column(name = "total_contributions", nullable = false) @Builder.Default private int totalContributions = 0;
    @Column(name = "required_assistances_override") private Integer requiredAssistancesOverride;
    @Column(name = "bureau_position", length = 50) private String bureauPosition;
    @Column(name = "joined_at", nullable = false) private Instant joinedAt;
    @PrePersist void onCreate() { if (joinedAt == null) joinedAt = Instant.now(); }
}
