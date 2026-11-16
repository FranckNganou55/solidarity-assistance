package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.dto.MemberDtos;
import cm.makenene.solidarite.service.ContributionService;
import cm.makenene.solidarite.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;
    private final ContributionService contributionService;

    public MemberController(MemberService memberService, ContributionService contributionService) {
        this.memberService = memberService;
        this.contributionService = contributionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PERM_MEMBER_VIEW','PERM_EVENT_CREATE','PERM_EVENT_CLOSE','PERM_REQUEST_VIEW')")
    public CommonDtos.PageResponse<MemberDtos.MemberView> list(@RequestParam(required = false) String q,
                                                              @RequestParam(required = false) Long roleId,
                                                              @RequestParam(required = false) Boolean active,
                                                              @RequestParam(defaultValue = "0") int page,
                                                              @RequestParam(defaultValue = "20") int size) {
        return memberService.search(q, roleId, active,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.ASC, "firstName")));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_MEMBER_VIEW')")
    public MemberDtos.MemberView get(@PathVariable Long id) { return memberService.toView(memberService.get(id)); }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_MEMBER_CREATE')")
    public MemberDtos.MemberCreatedResponse create(@Valid @RequestBody MemberDtos.MemberCreateRequest req) {
        return memberService.create(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_MEMBER_EDIT')")
    public MemberDtos.MemberView update(@PathVariable Long id, @RequestBody MemberDtos.MemberUpdateRequest req) {
        return memberService.update(id, req);
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasAuthority('PERM_ROLE_ASSIGN')")
    public MemberDtos.MemberView assignRole(@PathVariable Long id, @RequestBody RoleAssignmentRequest req) {
        return memberService.assignRole(id, req.roleId());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('PERM_MEMBER_ARCHIVE')")
    public MemberDtos.MemberView setStatus(@PathVariable Long id, @RequestBody StatusRequest req) {
        return memberService.update(id, new MemberDtos.MemberUpdateRequest(null, null, null, null, null, null, null, null, req.active(), null, null, null));
    }

    public record RoleAssignmentRequest(Long roleId) {}
    public record StatusRequest(Boolean active) {}

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_MEMBER_DELETE')")
    public CommonDtos.MessageResponse disable(@PathVariable Long id) {
        memberService.delete(id);
        return new CommonDtos.MessageResponse("Membre desactive");
    }

    @PostMapping("/{id}/reset-password")
    @PreAuthorize("hasAuthority('PERM_MEMBER_RESET_PASSWORD')")
    public MemberDtos.ResetPasswordResponse resetPassword(@PathVariable Long id) {
        return memberService.resetPassword(id);
    }

    @PostMapping("/{id}/reset-cycle")
    @PreAuthorize("hasAuthority('PERM_MEMBER_EDIT')")
    public CommonDtos.MessageResponse resetCycle(@PathVariable Long id) {
        memberService.resetCycle(id, "Reinitialisation manuelle du compteur de cycle");
        return new CommonDtos.MessageResponse("Compteur de cycle remis a zero");
    }

    @GetMapping("/{id}/contributions")
    @PreAuthorize("hasAnyAuthority('PERM_CONTRIBUTION_VIEW_ALL','PERM_MEMBER_VIEW')")
    public List<EventDtos.ContributionView> contributions(@PathVariable Long id) {
        return contributionService.byMember(id);
    }
}
