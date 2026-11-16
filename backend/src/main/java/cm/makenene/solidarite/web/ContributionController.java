package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.service.ContributionService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contributions")
public class ContributionController {

    private final ContributionService contributionService;

    public ContributionController(ContributionService contributionService) {
        this.contributionService = contributionService;
    }

    @GetMapping("/mine")
    public List<EventDtos.ContributionView> mine() { return contributionService.mine(); }

    @GetMapping("/pending")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_VIEW_ALL')")
    public List<EventDtos.ContributionView> pending() { return contributionService.pending(); }

    @GetMapping("/validated")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_VALIDATE')")
    public List<EventDtos.ContributionView> validated() { return contributionService.validated(); }

    /** Validation par le tresorier apres verification de la perception de l'argent. */
    @PostMapping("/{id}/validate")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_VALIDATE')")
    public EventDtos.ContributionView validate(@PathVariable Long id,
                                               @RequestBody(required = false) EventDtos.ValidateContributionRequest req) {
        return contributionService.validate(id, req);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_REJECT')")
    public EventDtos.ContributionView reject(@PathVariable Long id,
                                             @RequestBody(required = false) EventDtos.ValidateContributionRequest req) {
        return contributionService.reject(id, req == null ? null : req.comment());
    }

    @PostMapping("/{id}/invalidate")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_VALIDATE')")
    public EventDtos.ContributionView invalidate(@PathVariable Long id,
                                                  @RequestBody(required = false) EventDtos.InvalidateContributionRequest req) {
        return contributionService.invalidate(id, req == null ? null : req.comment());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_CONTRIBUTION_VALIDATE')")
    public EventDtos.ContributionView editInvalidated(@PathVariable Long id,
            @Valid @RequestBody EventDtos.EditInvalidatedContributionRequest req) {
        return contributionService.editInvalidated(id, req);
    }
}
