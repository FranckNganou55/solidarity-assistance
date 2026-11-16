package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.AuthPrincipal;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.entity.AuditLog;
import cm.makenene.solidarite.repository.AuditLogRepository;
import cm.makenene.solidarite.repository.AssociationGroupRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final AuditLogRepository repository;
    private final CurrentUser currentUser;
    private final AssociationGroupRepository groups;

    public AuditService(AuditLogRepository repository, CurrentUser currentUser, AssociationGroupRepository groups) {
        this.repository = repository;
        this.currentUser = currentUser;
        this.groups = groups;
    }

    public void log(String action, String entityType, Long entityId, String details) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        AuthPrincipal principal = auth != null && auth.getPrincipal() instanceof AuthPrincipal p ? p : null;
        Long groupId = principal == null ? null : principal.groupId();
        repository.save(AuditLog.builder()
                .group(groupId == null ? null : groups.findById(groupId).orElse(null))
                .actorId(principal != null ? principal.memberId() : null)
                .actorName(principal != null ? principal.fullName() : "systeme")
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build());
    }
}
