package cm.makenene.solidarite.web;
import cm.makenene.solidarite.dto.NotificationDtos;
import cm.makenene.solidarite.service.NotificationService;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService service;
    public NotificationController(NotificationService service) { this.service = service; }
    @GetMapping public NotificationDtos.NotificationList mine() { return service.mine(); }
    @PostMapping("/{id}/read") public void read(@PathVariable Long id) { service.markRead(id); }
    @PostMapping("/read-all") public void readAll() { service.markAllRead(); }
}
