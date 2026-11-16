package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "association_groups")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssociationGroup {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(length = 300) private String logoUrl;
    @Column(length = 80) private String city;
    @Column(length = 500) private String description;
    @Column(length = 30) private String contactPhone;
    @Column(length = 120) private String contactEmail;
    @Column(length = 20, nullable = false) @Builder.Default private String primaryColor = "#264557";
    @Column(length = 20, nullable = false) @Builder.Default private String accentColor = "#F3856A";
    @Column(length = 20, nullable = false) @Builder.Default private String currency = "FCFA";
    @Column(name = "min_assistances_required", nullable = false) @Builder.Default private int minAssistancesRequired = 2;
    @Column(name = "min_contribution_amount", precision = 14, scale = 2, nullable = false) @Builder.Default private BigDecimal minContributionAmount = BigDecimal.ZERO;
    @Column(nullable = false) @Builder.Default private boolean active = true;
    @Column(nullable = false) private Long createdBy;
    @Column(nullable = false) private Instant createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
