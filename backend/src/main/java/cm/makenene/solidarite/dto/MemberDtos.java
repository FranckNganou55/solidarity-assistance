package cm.makenene.solidarite.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public class MemberDtos {

    public record MemberView(
            Long id, String lastName, String firstName, String fullName, String phone,
            String city, String quarter, String photoUrl, String email,
            boolean active, Long roleId, String roleCode, String roleName, boolean superAdmin, boolean groupAdmin,
            boolean mustChangePassword, int cycleContributions, int totalContributions,
            int requiredAssistances, Integer requiredAssistancesOverride, String bureauPosition, boolean eligibleForAssistance,
            Instant createdAt, Instant lastLoginAt,
            java.util.List<String> permissions, String photoShape) {}

    public record MemberCreateRequest(
            @NotBlank(message = "Le nom est obligatoire") String lastName,
            @NotBlank(message = "Le prenom est obligatoire") String firstName,
            @NotBlank(message = "Le numero de telephone est obligatoire")
            @Pattern(regexp = "^[0-9+ ]{8,20}$", message = "Numero de telephone invalide") String phone,
            @NotBlank(message = "La ville est obligatoire") String city,
            String quarter,
            String photoUrl,
            @Email(message = "Email invalide") String email,
            Long roleId,
            String password,
            Integer requiredAssistancesOverride, String bureauPosition, String photoShape) {}

    public record PublicRegistrationRequest(
            @NotBlank(message = "Le nom est obligatoire") @Size(max = 80) String lastName,
            @NotBlank(message = "Le prenom est obligatoire") @Size(max = 80) String firstName,
            @NotBlank(message = "Le numero de telephone est obligatoire")
            @Pattern(regexp = "^[0-9+ ]{8,20}$", message = "Numero de telephone invalide") String phone,
            @NotBlank(message = "La ville est obligatoire") @Size(max = 80) String city,
            @NotBlank(message = "Le quartier est obligatoire") @Size(max = 80) String quarter,
            @Email(message = "Email invalide") @Size(max = 120) String email,
            @NotBlank(message = "Le mot de passe est obligatoire")
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).{8,72}$", message = "Le mot de passe doit contenir au moins 8 caracteres, une lettre et un chiffre") String password,
            Long groupId) {}

    public record MemberUpdateRequest(
            String lastName, String firstName, String phone, String city, String quarter,
            String photoUrl, String email, Long roleId, Boolean active,
            Integer requiredAssistancesOverride, String bureauPosition, String photoShape) {}

    public record MemberCreatedResponse(MemberView member, String temporaryPassword) {}

    public record ResetPasswordResponse(String temporaryPassword) {}

    public record MeSummary(
            MemberView member, int cycleContributions, int requiredAssistances, boolean eligible,
            int missingToEligibility, int totalContributions, java.math.BigDecimal totalContributedAmount,
            long openEvents, long pendingContributions, long myRequests) {}
}
