package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "members", indexes = {
        @Index(name = "idx_members_phone", columnList = "phone", unique = true)
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String lastName;     // nom

    @Column(nullable = false, length = 80)
    private String firstName;    // prenom

    /** Identifiant de connexion. */
    @Column(nullable = false, unique = true, length = 30)
    private String phone;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(length = 80)
    private String quarter;      // quartier (a Makenene)

    @Column(length = 300)
    private String photoUrl;     // photo (au choix)

    @Column(name = "photo_shape", nullable = false, length = 10)
    @Builder.Default
    private String photoShape = "CIRCLE";

    @Column(length = 120)
    private String email;        // email (au choix)

    @Column(nullable = false)
    private String passwordHash;

    /** true tant que le membre n'a pas change le mot de passe par defaut. */
    @Column(nullable = false)
    private boolean mustChangePassword;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "super_admin", nullable = false)
    @Builder.Default
    private boolean superAdmin = false;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id")
    private Role role;

    /** Compteur d'assistances du cycle en cours (remis a zero a chaque cycle). */
    @Builder.Default
    @Column(nullable = false)
    private int cycleContributions = 0;

    /** Compteur historique (jamais remis a zero). */
    @Builder.Default
    @Column(nullable = false)
    private int totalContributions = 0;

    /** Nombre d'assistances minimum personnalise (sinon la regle globale s'applique). */
    private Integer requiredAssistancesOverride;

    /** Poste associatif, distinct du rôle technique et de ses permissions. */
    @Column(name = "bureau_position", length = 50)
    private String bureauPosition;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant updatedAt;
    private Instant lastLoginAt;

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }

    public String fullName() { return firstName + " " + lastName; }
}
