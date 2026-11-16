package cm.makenene.solidarite.dto;
import java.time.Instant;
import java.util.List;
public class NotificationDtos {
    public record NotificationView(Long id, String type, String title, String message, String entityType, Long entityId, Instant createdAt, Instant readAt) {}
    public record NotificationList(List<NotificationView> notifications, long unreadCount) {}
}
