package cm.makenene.solidarite.web;

import cm.makenene.solidarite.repository.AuditLogRepository;
import cm.makenene.solidarite.dto.AuditDtos;
import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.service.StatsService;
import cm.makenene.solidarite.config.CurrentUser;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class StatsController {

    private final StatsService statsService;
    private final AuditLogRepository auditLogRepository;
    private final CurrentUser currentUser;

    public StatsController(StatsService statsService, AuditLogRepository auditLogRepository, CurrentUser currentUser) {
        this.statsService = statsService;
        this.auditLogRepository = auditLogRepository;
        this.currentUser = currentUser;
    }

    @GetMapping("/stats/dashboard")
    public Map<String, Object> dashboard() { return statsService.dashboard(); }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAuthority('PERM_AUDIT_VIEW')")
    public CommonDtos.PageResponse<AuditDtos.AuditEntry> audit() {
        return CommonDtos.PageResponse.of(auditLogRepository.findAllByGroupIdOrderByCreatedAtDesc(currentUser.requireGroupId(), PageRequest.of(0, 100)), AuditDtos.AuditEntry::from);
    }
}
