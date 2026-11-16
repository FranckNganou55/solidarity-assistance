package cm.makenene.solidarite.dto;

import cm.makenene.solidarite.entity.AuditLog;

import java.time.Instant;

public final class AuditDtos {
    private AuditDtos() {}

    public record AuditEntry(
            Long id,
            Long actorId,
            String actorName,
            String action,
            String entityType,
            Long entityId,
            String details,
            Instant createdAt
    ) {
        public static AuditEntry from(AuditLog entry) {
            return new AuditEntry(entry.getId(), entry.getActorId(), entry.getActorName(), entry.getAction(),
                    entry.getEntityType(), entry.getEntityId(), entry.getDetails(), entry.getCreatedAt());
        }
    }
}
