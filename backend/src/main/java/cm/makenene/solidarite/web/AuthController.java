package cm.makenene.solidarite.web;

import cm.makenene.solidarite.dto.AuthDtos;
import cm.makenene.solidarite.dto.CommonDtos;
import cm.makenene.solidarite.dto.MemberDtos;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.service.AuthService;
import cm.makenene.solidarite.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final MemberService memberService;
    private final CurrentUser currentUser;

    public AuthController(AuthService authService, MemberService memberService, CurrentUser currentUser) {
        this.authService = authService;
        this.memberService = memberService;
        this.currentUser = currentUser;
    }

    @PostMapping("/login")
    public AuthDtos.LoginResponse login(@Valid @RequestBody AuthDtos.LoginRequest req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public MemberDtos.MemberView me() { return memberService.toView(memberService.get(currentUser.id())); }

    @GetMapping("/me/summary")
    public MemberDtos.MeSummary summary() { return memberService.summary(currentUser.id()); }

    @PostMapping("/change-password")
    public CommonDtos.MessageResponse changePassword(@Valid @RequestBody AuthDtos.ChangePasswordRequest req) {
        authService.changePassword(req);
        return new CommonDtos.MessageResponse("Mot de passe mis a jour");
    }

    @PostMapping("/refresh")
    public AuthDtos.LoginResponse refresh() { return authService.refresh(); }
}
