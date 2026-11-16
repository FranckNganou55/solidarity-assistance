package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.config.JwtService;
import cm.makenene.solidarite.dto.AuthDtos;
import cm.makenene.solidarite.entity.Member;
import cm.makenene.solidarite.repository.MemberRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MemberService memberService;
    private final CurrentUser currentUser;
    private final AuditService auditService;

    public AuthService(MemberRepository memberRepository, PasswordEncoder passwordEncoder, JwtService jwtService,
                       MemberService memberService, CurrentUser currentUser, AuditService auditService) {
        this.memberRepository = memberRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.memberService = memberService;
        this.currentUser = currentUser;
        this.auditService = auditService;
    }

    @Transactional
    public AuthDtos.LoginResponse login(AuthDtos.LoginRequest req) {
        String phone = MemberService.normalizePhone(req.phone());
        Member member = memberRepository.findByPhone(phone)
                .orElseThrow(() -> ApiException.unauthorized("Identifiant ou mot de passe incorrect"));
        if (!passwordEncoder.matches(req.password(), member.getPasswordHash())) {
            throw ApiException.unauthorized("Identifiant ou mot de passe incorrect");
        }
        if (!member.isActive()) throw ApiException.forbidden("Votre compte est archive. Contactez l'administration.");
        member.setLastLoginAt(Instant.now());
        memberRepository.save(member);
        return new AuthDtos.LoginResponse(jwtService.generate(member), jwtService.expirationSeconds(),
                member.isMustChangePassword(), memberService.toView(member));
    }

    public AuthDtos.LoginResponse refresh() {
        Member member = memberRepository.findById(currentUser.id())
                .orElseThrow(() -> ApiException.unauthorized("Membre introuvable"));
        return new AuthDtos.LoginResponse(jwtService.generate(member), jwtService.expirationSeconds(),
                member.isMustChangePassword(), memberService.toView(member));
    }

    @Transactional
    public void changePassword(AuthDtos.ChangePasswordRequest req) {
        Member member = memberRepository.findById(currentUser.id())
                .orElseThrow(() -> ApiException.unauthorized("Membre introuvable"));
        if (!passwordEncoder.matches(req.currentPassword(), member.getPasswordHash())) {
            throw ApiException.badRequest("Le mot de passe actuel est incorrect");
        }
        if (req.newPassword().equals(req.currentPassword())) {
            throw ApiException.badRequest("Le nouveau mot de passe doit etre different de l'ancien");
        }
        member.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        member.setMustChangePassword(false);
        memberRepository.save(member);
        auditService.log("PASSWORD_CHANGE", "Member", member.getId(), "Changement du mot de passe de " + member.fullName());
    }
}
