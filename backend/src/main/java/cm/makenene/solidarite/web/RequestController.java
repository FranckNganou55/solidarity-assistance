package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.service.RequestService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class RequestController {

    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public List<EventDtos.RequestView> list(@RequestParam(defaultValue = "mine") String scope) {
        return requestService.list(scope);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_REQUEST_CREATE')")
    public EventDtos.RequestView create(@Valid @RequestBody EventDtos.RequestCreateRequest req) {
        return requestService.create(req);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('PERM_REQUEST_APPROVE')")
    public EventDtos.RequestView approve(@PathVariable Long id,
                                         @RequestBody(required = false) EventDtos.ApproveRequest req) {
        return requestService.approve(id, req);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('PERM_REQUEST_REJECT')")
    public EventDtos.RequestView reject(@PathVariable Long id,
                                        @RequestBody(required = false) EventDtos.RejectRequest req) {
        return requestService.reject(id, req == null ? null : req.comment());
    }
}
