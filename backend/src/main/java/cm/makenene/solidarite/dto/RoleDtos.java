package cm.makenene.solidarite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public class RoleDtos {

    public record PermissionView(String code, String labelFr, String labelEn, String group) {}

    public record RoleView(Long id, String code, String name, String description,
                           boolean systemRole, List<String> permissions, long memberCount) {}

    public record RoleRequest(
            @NotBlank(message = "Le code est obligatoire")
            @Pattern(regexp = "^[A-Z0-9_]{2,40}$", message = "Code en majuscules, chiffres et _ uniquement") String code,
            @NotBlank(message = "Le nom est obligatoire") String name,
            String description,
            List<String> permissions) {}
}
