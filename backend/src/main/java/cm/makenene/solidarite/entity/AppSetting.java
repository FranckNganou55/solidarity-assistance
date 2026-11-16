package cm.makenene.solidarite.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "app_settings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AppSetting {

    @Id
    @Column(name = "setting_key", length = 80)
    private String key;

    @Column(name = "setting_value", length = 2000)
    private String value;

    private Instant updatedAt;

    @PrePersist @PreUpdate
    void onUpdate() { this.updatedAt = Instant.now(); }
}
