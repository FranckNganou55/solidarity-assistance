package cm.makenene.solidarite.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {

    public record LoginRequest(
            @NotBlank(message = "L'identifiant est obligatoire") String phone,
            @NotBlank(message = "Le mot de passe est obligatoire") String password) {}

    public record LoginResponse(String token, long expiresIn, boolean mustChangePassword, MemberDtos.MemberView member) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 6, message = "Le nouveau mot de passe doit contenir au moins 6 caracteres") String newPassword) {}
}
