package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.domain.Permission;
import cm.makenene.solidarite.dto.NotificationDtos;
import cm.makenene.solidarite.entity.AppNotification;
import cm.makenene.solidarite.entity.Member;
import cm.makenene.solidarite.repository.MemberRepository;
import cm.makenene.solidarite.repository.NotificationRepository;
import cm.makenene.solidarite.repository.GroupMembershipRepository;
import cm.makenene.solidarite.repository.AssociationGroupRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.List;

@Service
public class NotificationService {
    private final NotificationRepository notifications;
    private final MemberRepository members;
    private final CurrentUser currentUser;
    private final GroupMembershipRepository memberships;
    private final AssociationGroupRepository groups;
    public NotificationService(NotificationRepository notifications, MemberRepository members, CurrentUser currentUser,
                                GroupMembershipRepository memberships, AssociationGroupRepository groups) {
        this.notifications = notifications; this.members = members; this.currentUser = currentUser;
        this.memberships = memberships; this.groups = groups;
    }
    @Transactional(readOnly = true)
    public NotificationDtos.NotificationList mine() {
        Long id = currentUser.id();
        Long groupId = currentUser.requireGroupId();
        return new NotificationDtos.NotificationList(notifications.findTop50ByRecipientIdAndGroupIdOrderByCreatedAtDesc(id, groupId).stream().map(this::view).toList(), notifications.countByRecipientIdAndGroupIdAndReadAtIsNull(id, groupId));
    }
    @Transactional
    public void markRead(Long id) {
        notifications.findByIdAndRecipientIdAndGroupId(id, currentUser.id(), currentUser.requireGroupId()).ifPresent(n -> { if (n.getReadAt() == null) n.setReadAt(Instant.now()); });
    }
    @Transactional
    public void markAllRead() {
        notifications.findTop50ByRecipientIdAndGroupIdOrderByCreatedAtDesc(currentUser.id(), currentUser.requireGroupId()).stream().filter(n -> n.getReadAt() == null).forEach(n -> n.setReadAt(Instant.now()));
    }
    @Transactional
    public void notifyValidators(String title, String message, String entityType, Long entityId) {
        Long groupId = currentUser.requireGroupId();
        memberships.findAllByGroupIdAndActiveTrueOrderByMemberFirstNameAsc(groupId).stream()
            .filter(gm -> gm.isPrincipalAdmin() || gm.getRole().getPermissions().contains(Permission.CONTRIBUTION_VALIDATE))
            .map(gm -> gm.getMember()).distinct()
            .forEach(m -> create(m, "CONTRIBUTION_SUBMITTED", title, message, entityType, entityId));
    }
    @Transactional
    public void notifyMember(Member recipient, String type, String title, String message, String entityType, Long entityId) {
        create(recipient, type, title, message, entityType, entityId);
    }
    private void create(Member recipient, String type, String title, String message, String entityType, Long entityId) {
        Long groupId = currentUser.optionalGroupId();
        notifications.save(AppNotification.builder().group(groupId == null ? null : groups.findById(groupId).orElse(null))
                .recipient(recipient).type(type).title(title).message(message).entityType(entityType).entityId(entityId).build());
    }
    private NotificationDtos.NotificationView view(AppNotification n) {
        return new NotificationDtos.NotificationView(n.getId(), n.getType(), n.getTitle(), n.getMessage(), n.getEntityType(), n.getEntityId(), n.getCreatedAt(), n.getReadAt());
    }
}
