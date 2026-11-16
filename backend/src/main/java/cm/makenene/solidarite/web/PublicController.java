package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.SettingDtos;
import cm.makenene.solidarite.dto.MemberDtos;
import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.service.MemberService;
import cm.makenene.solidarite.service.SettingService;
import cm.makenene.solidarite.service.GroupService;
import cm.makenene.solidarite.dto.GroupDtos;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final SettingService settingService;
    private final MemberService memberService;
    private final GroupService groupService;

    public PublicController(SettingService settingService, MemberService memberService, GroupService groupService) {
        this.settingService = settingService;
        this.memberService = memberService;
        this.groupService = groupService;
    }

    @GetMapping("/settings")
    public SettingDtos.PublicSettings settings(@RequestParam(required = false) Long groupId) { return settingService.publicSettings(groupId); }

    @GetMapping("/groups")
    public java.util.List<GroupDtos.GroupView> groups() { return groupService.publicList(); }

    @PostMapping("/register")
    public CommonDtos.MessageResponse register(@Valid @RequestBody MemberDtos.PublicRegistrationRequest request) {
        throw cm.makenene.solidarite.config.ApiException.forbidden("Les membres sont créés par l’administrateur principal de leur groupe.");
    }
}
