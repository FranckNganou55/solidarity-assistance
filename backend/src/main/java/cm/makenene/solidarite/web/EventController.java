package cm.makenene.solidarite.web;

import cm.makenene.solidarite.domain.EventStatus;
import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.service.ContributionService;
import cm.makenene.solidarite.service.EventService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final ContributionService contributionService;

    public EventController(EventService eventService, ContributionService contributionService) {
        this.eventService = eventService;
        this.contributionService = contributionService;
    }

    @GetMapping
    public CommonDtos.PageResponse<EventDtos.EventView> list(@RequestParam(required = false) String status,
                                                             @RequestParam(required = false) Long typeId,
                                                             @RequestParam(required = false) Long beneficiaryId,
                                                             @RequestParam(required = false) String q,
                                                             @RequestParam(defaultValue = "0") int page,
                                                             @RequestParam(defaultValue = "20") int size) {
        EventStatus st = status == null || status.isBlank() ? null : EventStatus.valueOf(status.toUpperCase());
        return eventService.search(st, typeId, beneficiaryId, q,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/recent")
    public List<EventDtos.EventView> recent() { return eventService.recent(); }

    @GetMapping("/{id}")
    public EventDtos.EventView get(@PathVariable Long id) { return eventService.detail(id); }

    @GetMapping("/{id}/contributions")
    public List<EventDtos.ContributionView> contributions(@PathVariable Long id) {
        return contributionService.byEvent(id);
    }

    @GetMapping("/{id}/participants")
    public List<EventDtos.EventParticipantView> participants(@PathVariable Long id) {
        return contributionService.eventParticipants(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_EVENT_CREATE')")
    public EventDtos.EventView create(@Valid @RequestBody EventDtos.EventCreateRequest req) {
        return eventService.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_EVENT_EDIT')")
    public EventDtos.EventView update(@PathVariable Long id, @RequestBody EventDtos.EventUpdateRequest req) {
        return eventService.update(id, req);
    }

    /** Fixe la date de cloture de l'assistance. */
    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('PERM_EVENT_CLOSE')")
    public EventDtos.EventView close(@PathVariable Long id, @RequestBody(required = false) EventDtos.CloseRequest req) {
        return eventService.close(id, req);
    }

    /** Rouvrir une assistance cloturee : administrateur uniquement. */
    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasAuthority('PERM_EVENT_REOPEN')")
    public EventDtos.EventView reopen(@PathVariable Long id) { return eventService.reopen(id); }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('PERM_EVENT_CANCEL')")
    public EventDtos.EventView cancel(@PathVariable Long id, @RequestBody(required = false) EventDtos.CancelRequest req) {
        return eventService.cancel(id, req == null ? null : req.reason());
    }

    /** Le membre connecte soumet sa cotisation. */
    @PostMapping("/{id}/contributions")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_SUBMIT')")
    public EventDtos.ContributionView submit(@PathVariable Long id,
                                             @Valid @RequestBody EventDtos.ContributionSubmitRequest req) {
        return contributionService.submit(id, req);
    }
}
