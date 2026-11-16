package cm.makenene.solidarite.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public class TypeDtos {

    public record TypeView(Long id, String name, String description, String icon, boolean active,
                           Instant createdAt, long eventCount) {}

    public record TypeRequest(
            @NotBlank(message = "Le nom du type est obligatoire") String name,
            String description, String icon, Boolean active) {}
}
