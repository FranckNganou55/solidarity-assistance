package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.MemberDtos;
import cm.makenene.solidarite.service.MemberService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/administration/bureau")
public class BureauController {
    private final MemberService memberService;
    public BureauController(MemberService memberService) { this.memberService = memberService; }

    @GetMapping
    @PreAuthorize("hasAuthority('PERM_MEMBER_EDIT')")
    public List<MemberDtos.MemberView> list() { return memberService.bureauMembers(); }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_MEMBER_EDIT')")
    public MemberDtos.MemberView appoint(@RequestBody BureauAppointmentRequest req) {
        return memberService.appointToBureau(req.memberId(), req.position());
    }

    @PutMapping("/replace")
    @PreAuthorize("hasAuthority('PERM_MEMBER_EDIT')")
    public MemberDtos.MemberView replace(@RequestBody BureauReplacementRequest req) {
        return memberService.replaceBureauMember(req.currentMemberId(), req.replacementMemberId());
    }

    @DeleteMapping("/{memberId}")
    @PreAuthorize("hasAuthority('PERM_MEMBER_EDIT')")
    public void remove(@PathVariable Long memberId) { memberService.removeFromBureau(memberId); }

    public record BureauAppointmentRequest(Long memberId, String position) {}
    public record BureauReplacementRequest(Long currentMemberId, Long replacementMemberId) {}
}
