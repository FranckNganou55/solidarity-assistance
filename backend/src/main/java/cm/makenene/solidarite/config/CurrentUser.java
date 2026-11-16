package cm.makenene.solidarite.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

    public AuthPrincipal principal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthPrincipal p)) {
            throw ApiException.unauthorized("Authentification requise");
        }
        return p;
    }

    public Long id() { return principal().memberId(); }

    public boolean hasPermission(String permission) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("PERM_" + permission));
    }

    public boolean isAdmin() { return principal().isAdmin(); }
    public boolean isSuperAdmin() { return principal().isSuperAdmin(); }
    public boolean isPrincipalAdmin() { return principal().isPrincipalAdmin(); }
    public Long groupId() { return principal().groupId(); }
    public Long optionalGroupId() {
        try { return principal().groupId(); } catch (RuntimeException ignored) { return null; }
    }
    public Long requireGroupId() {
        Long id = groupId();
        if (id == null) throw ApiException.badRequest("Sélectionnez un groupe avant d’effectuer cette action");
        return id;
    }
}
