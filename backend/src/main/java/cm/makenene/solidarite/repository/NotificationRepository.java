package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<AppNotification, Long> {
    List<AppNotification> findTop50ByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    List<AppNotification> findTop50ByRecipientIdAndGroupIdOrderByCreatedAtDesc(Long recipientId, Long groupId);
    List<AppNotification> findAllByRecipientIdAndReadAtIsNull(Long recipientId);
    long countByRecipientIdAndReadAtIsNull(Long recipientId);
    long countByRecipientIdAndGroupIdAndReadAtIsNull(Long recipientId, Long groupId);
    Optional<AppNotification> findByIdAndRecipientId(Long id, Long recipientId);
    Optional<AppNotification> findByIdAndRecipientIdAndGroupId(Long id, Long recipientId, Long groupId);
}
