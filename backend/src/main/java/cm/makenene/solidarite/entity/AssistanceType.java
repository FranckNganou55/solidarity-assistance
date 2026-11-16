package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Type d'assistance (deces, maladie, mariage, accident...).
 * Cree uniquement par les roles disposant de la permission ASSISTANCE_TYPE_MANAGE.
 */
@Entity
@Table(name = "assistance_types")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AssistanceType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private AssociationGroup group;

    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Column(length = 400)
    private String description;

    /** Emoji / icone courte affichee dans l'app. */
    @Column(length = 16)
    private String icon;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    private Long createdBy;
    private Instant createdAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }
}
