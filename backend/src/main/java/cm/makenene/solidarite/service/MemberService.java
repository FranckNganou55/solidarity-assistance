package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.dto.CommonDtos.PageResponse;
import cm.makenene.solidarite.dto.MemberDtos;
import cm.makenene.solidarite.entity.Member;
import cm.makenene.solidarite.entity.Role;
import cm.makenene.solidarite.entity.AssociationGroup;
import cm.makenene.solidarite.entity.GroupMembership;
import cm.makenene.solidarite.repository.*;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Locale;

@Service
public class MemberService {

    private final MemberRepository memberRepository;
    private final RoleRepository roleRepository;
    private final SettingService settingService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final CurrentUser currentUser;
    private final ContributionRepository contributionRepository;
    private final EventRepository eventRepository;
    private final RequestRepository requestRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final AssociationGroupRepository groupRepository;

    public MemberService(MemberRepository memberRepository, RoleRepository roleRepository,
                         SettingService settingService, PasswordEncoder passwordEncoder,
                         AuditService auditService, CurrentUser currentUser,
                         ContributionRepository contributionRepository, EventRepository eventRepository,
                         RequestRepository requestRepository, GroupMembershipRepository groupMembershipRepository,
                         AssociationGroupRepository groupRepository) {
        this.memberRepository = memberRepository;
        this.roleRepository = roleRepository;
        this.settingService = settingService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.currentUser = currentUser;
        this.contributionRepository = contributionRepository;
        this.eventRepository = eventRepository;
        this.requestRepository = requestRepository;
        this.groupMembershipRepository = groupMembershipRepository;
        this.groupRepository = groupRepository;
    }

    public static String normalizePhone(String phone) {
        if (phone == null) return "";
        String cleaned = phone.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("00237")) cleaned = cleaned.substring(5);
        if (cleaned.startsWith("237") && cleaned.length() > 9) cleaned = cleaned.substring(3);
        return cleaned;
    }

    public int requiredFor(Member member) {
        GroupMembership membership = membershipOrNull(member);
        if (membership != null && membership.getRequiredAssistancesOverride() != null) return membership.getRequiredAssistancesOverride();
        if (membership == null && member.getRequiredAssistancesOverride() != null) return member.getRequiredAssistancesOverride();
        return Math.max(0, settingService.getInt(SettingService.RULES_MIN));
    }

    public int cycleFor(Member member) { GroupMembership gm = membershipOrNull(member); return gm == null ? member.getCycleContributions() : gm.getCycleContributions(); }
    public int totalFor(Member member) { GroupMembership gm = membershipOrNull(member); return gm == null ? member.getTotalContributions() : gm.getTotalContributions(); }
    public void incrementValidatedContribution(Member member) {
        GroupMembership gm = membership(member);
        gm.setCycleContributions(gm.getCycleContributions() + 1); gm.setTotalContributions(gm.getTotalContributions() + 1);
        groupMembershipRepository.save(gm);
    }
    public void decrementValidatedContribution(Member member) {
        GroupMembership gm = membership(member);
        gm.setCycleContributions(Math.max(0, gm.getCycleContributions() - 1));
        gm.setTotalContributions(Math.max(0, gm.getTotalContributions() - 1));
        groupMembershipRepository.save(gm);
    }
    public void resetGroupCycle(Member member) { GroupMembership gm = membership(member); gm.setCycleContributions(0); groupMembershipRepository.save(gm); }
    private GroupMembership membershipOrNull(Member member) {
        Long groupId = currentUser.optionalGroupId();
        return groupId == null ? null : groupMembershipRepository.findByGroupIdAndMemberId(groupId, member.getId()).orElse(null);
    }
    private GroupMembership membership(Member member) {
        Long groupId = currentUser.requireGroupId();
        return groupMembershipRepository.findByGroupIdAndMemberId(groupId, member.getId())
                .orElseThrow(() -> ApiException.forbidden("Ce membre n’appartient pas au groupe actif"));
    }

    public boolean isEligible(Member member) {
        return cycleFor(member) >= requiredFor(member);
    }

    public MemberDtos.MemberView toView(Member m) {
        GroupMembership gm = membershipOrNull(m);
        Role role = gm == null ? m.getRole() : gm.getRole();
        int required = requiredFor(m);
        int cycle = cycleFor(m);
        int total = totalFor(m);
        Integer override = gm == null ? m.getRequiredAssistancesOverride() : gm.getRequiredAssistancesOverride();
        String bureau = gm == null ? m.getBureauPosition() : gm.getBureauPosition();
        return new MemberDtos.MemberView(
                m.getId(), m.getLastName(), m.getFirstName(), m.fullName(), m.getPhone(),
                m.getCity(), m.getQuarter(), m.getPhotoUrl(), m.getEmail(),
                gm == null ? m.isActive() : gm.isActive(), role.getId(), role.getCode(), role.getName(), m.isSuperAdmin(), gm != null && gm.isPrincipalAdmin(),
                m.isMustChangePassword(), cycle, total,
                required, override, bureau, cycle >= required,
                m.getCreatedAt(), m.getLastLoginAt(),
                permissionsOf(m), m.getPhotoShape());
    }

    public java.util.List<String> permissionsOf(Member m) {
        GroupMembership gm = membershipOrNull(m);
        if (m.isSuperAdmin() || "ADMIN".equals(m.getRole().getCode()) || (gm != null && gm.isPrincipalAdmin())) {
            return java.util.Arrays.stream(cm.makenene.solidarite.domain.Permission.values())
                    .filter(p -> !p.name().equals("GROUP_CREATE") || m.isSuperAdmin())
                    .filter(p -> !p.name().endsWith("_MANAGE") && !p.name().equals("MEMBER_MANAGE") && !p.name().equals("ROLE_MANAGE") && !p.name().equals("EVENT_MANAGE") && !p.name().equals("REQUEST_MANAGE") && !p.name().equals("ASSISTANCE_TYPE_MANAGE"))
                    .map(Enum::name).sorted().toList();
        }
        Role role = gm == null ? m.getRole() : gm.getRole();
        java.util.Set<cm.makenene.solidarite.domain.Permission> permissions = new java.util.HashSet<>(role.getPermissions());
        if (gm != null && gm.getBureauPosition() != null && !gm.getBureauPosition().isBlank()) {
            permissions.add(cm.makenene.solidarite.domain.Permission.EVENT_VIEW);
            permissions.add(cm.makenene.solidarite.domain.Permission.CONTRIBUTION_SUBMIT);
            permissions.add(cm.makenene.solidarite.domain.Permission.CONTRIBUTION_VIEW);
        }
        return permissions.stream().filter(p -> !p.name().endsWith("_MANAGE") && !p.name().equals("MEMBER_MANAGE") && !p.name().equals("ROLE_MANAGE") && !p.name().equals("EVENT_MANAGE") && !p.name().equals("REQUEST_MANAGE") && !p.name().equals("ASSISTANCE_TYPE_MANAGE")).map(Enum::name).sorted().toList();
    }

    public Member get(Long id) {
        Member member = memberRepository.findById(id).orElseThrow(() -> ApiException.notFound("Membre introuvable"));
        Long groupId = currentUser.groupId();
        if (groupId != null && groupMembershipRepository.findByGroupIdAndMemberId(groupId, id).isEmpty())
            throw ApiException.notFound("Membre introuvable dans le groupe actif");
        return member;
    }

    @Transactional(readOnly = true)
    public java.util.List<MemberDtos.MemberView> bureauMembers() {
        requireGroupAdministrator();
        return groupMembershipRepository.findAllByGroupIdAndActiveTrueOrderByMemberFirstNameAsc(currentUser.requireGroupId()).stream()
                .filter(gm -> gm.getBureauPosition() != null).map(gm -> toView(gm.getMember())).toList();
    }

    @Transactional
    public MemberDtos.MemberView appointToBureau(Long memberId, String position) {
        requireGroupAdministrator();
        String normalized = normalizeBureau(position);
        if (normalized == null || !isKnownBureauPosition(normalized)) throw ApiException.badRequest("Fonction du bureau invalide");
        Member member = get(memberId);
        GroupMembership gm = membership(member);
        if (!gm.isActive()) throw ApiException.badRequest("Un membre archivé ne peut pas être nommé au bureau");
        if (!"MEMBRE_BUREAU".equals(normalized)) {
            groupMembershipRepository.findAllByGroupIdAndActiveTrueOrderByMemberFirstNameAsc(currentUser.requireGroupId()).stream()
                    .filter(other -> normalized.equals(other.getBureauPosition()) && !other.getMember().getId().equals(memberId))
                    .findFirst().ifPresent(other -> { throw ApiException.conflict("Cette fonction est déjà attribuée à " + other.getMember().fullName()); });
        }
        gm.setBureauPosition(normalized);
        groupMembershipRepository.save(gm);
        auditService.log("BUREAU_APPOINT", "Member", member.getId(), "Nomination de " + member.fullName() + " : " + normalized);
        return toView(member);
    }

    @Transactional
    public MemberDtos.MemberView replaceBureauMember(Long currentMemberId, Long replacementMemberId) {
        requireGroupAdministrator();
        if (currentMemberId.equals(replacementMemberId)) return toView(get(currentMemberId));
        Member current = get(currentMemberId);
        GroupMembership oldMembership = membership(current);
        if (oldMembership.getBureauPosition() == null) throw ApiException.badRequest("Ce membre n’occupe aucune fonction au bureau");
        Member replacement = get(replacementMemberId);
        GroupMembership newMembership = membership(replacement);
        if (!newMembership.isActive()) throw ApiException.badRequest("Un membre archivé ne peut pas être nommé au bureau");
        if (newMembership.getBureauPosition() != null) throw ApiException.conflict("Le membre choisi occupe déjà une fonction au bureau");
        String position = oldMembership.getBureauPosition();
        oldMembership.setBureauPosition(null);
        newMembership.setBureauPosition(position);
        groupMembershipRepository.save(oldMembership);
        groupMembershipRepository.save(newMembership);
        auditService.log("BUREAU_REPLACE", "Member", replacement.getId(), "Remplacement de " + current.fullName() + " par " + replacement.fullName() + " au poste " + position);
        return toView(replacement);
    }

    @Transactional
    public void removeFromBureau(Long memberId) {
        requireGroupAdministrator();
        Member member = get(memberId);
        GroupMembership gm = membership(member);
        String position = gm.getBureauPosition();
        if (position == null) return;
        gm.setBureauPosition(null);
        groupMembershipRepository.save(gm);
        auditService.log("BUREAU_REMOVE", "Member", member.getId(), "Retrait de " + member.fullName() + " du poste " + position);
    }

    private void requireGroupAdministrator() {
        if (!currentUser.isSuperAdmin() && !currentUser.isPrincipalAdmin()) throw ApiException.forbidden("Action réservée à l’administrateur principal du groupe");
    }

    private boolean isKnownBureauPosition(String position) {
        return java.util.Set.of("MEMBRE_BUREAU", "DIRECTEUR", "DIRECTEUR_ADJOINT", "SECRETAIRE", "SECRETAIRE_ADJOINT", "TRESORIER", "TRESORIER_ADJOINT", "CONSEILLER", "COMMISSAIRE_AUX_COMPTES").contains(position);
    }

    public PageResponse<MemberDtos.MemberView> search(String q, Long roleId, Boolean active, Pageable pageable) {
        return PageResponse.of(memberRepository.searchInGroup(currentUser.requireGroupId(), q == null ? "" : q.trim(), roleId, active, pageable), this::toView);
    }

    @Transactional
    public void register(MemberDtos.PublicRegistrationRequest req) {
        String phone = normalizePhone(req.phone());
        if (phone.isBlank()) throw ApiException.badRequest("Numero de telephone invalide");
        if (memberRepository.existsByPhone(phone)) throw ApiException.conflict("Un membre utilise deja ce numero de telephone");
        Long groupId = req.groupId();
        if (groupId == null) throw ApiException.badRequest("Choisissez un groupe pour votre inscription");
        AssociationGroup group = groupRepository.findById(groupId).filter(AssociationGroup::isActive).orElseThrow(() -> ApiException.notFound("Groupe introuvable"));
        Role role = roleRepository.findByGroupIdAndCode(groupId, "MEMBRE")
                .orElseThrow(() -> ApiException.badRequest("Role par defaut introuvable"));
        Member member = Member.builder()
                .lastName(req.lastName().trim())
                .firstName(req.firstName().trim())
                .phone(phone)
                .city(req.city().trim())
                .quarter(req.quarter().trim())
                .email(req.email() == null || req.email().isBlank() ? null : req.email().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .mustChangePassword(false)
                .active(true)
                .role(role)
                .cycleContributions(0)
                .totalContributions(0)
                .build();
        member = memberRepository.save(member);
        groupMembershipRepository.save(GroupMembership.builder().group(group).member(member).role(role).active(true).build());
    }

    private String emptyToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }

    private String normalizePhotoShape(String shape) {
        return "SQUARE".equalsIgnoreCase(shape) ? "SQUARE" : "CIRCLE";
    }

    @Transactional
    public MemberDtos.MemberCreatedResponse create(MemberDtos.MemberCreateRequest req) {
        if (req.requiredAssistancesOverride() != null && !currentUser.hasPermission("MEMBER_THRESHOLD_EDIT"))
            throw ApiException.forbidden("Vous ne pouvez pas personnaliser le seuil d’assistance de ce membre");
        if (req.requiredAssistancesOverride() != null && req.requiredAssistancesOverride() < -1)
            throw ApiException.badRequest("Le seuil individuel doit être égal ou supérieur à zéro");
        if (req.bureauPosition() != null && !req.bureauPosition().isBlank()
                && !"AUCUN".equalsIgnoreCase(req.bureauPosition()) && !currentUser.isAdmin())
            throw ApiException.forbidden("Seul l’administrateur système peut nommer les membres du bureau");
        String phone = normalizePhone(req.phone());
        if (phone.isBlank()) throw ApiException.badRequest("Numero de telephone invalide");
        if (memberRepository.existsByPhone(phone)) throw ApiException.conflict("Un membre utilise deja ce numero de telephone");

        Long groupId = currentUser.requireGroupId();
        AssociationGroup group = groupRepository.findById(groupId).orElseThrow(() -> ApiException.notFound("Groupe introuvable"));
        Role role = roleRepository.findByGroupIdAndCode(groupId, "MEMBRE")
                .orElseThrow(() -> ApiException.badRequest("Rôle Membre introuvable dans ce groupe"));
        String temporaryPassword = (req.password() != null && !req.password().isBlank())
                ? req.password() : settingService.get(SettingService.DEFAULT_PASSWORD);

        Member member = Member.builder()
                .lastName(req.lastName().trim())
                .firstName(req.firstName().trim())
                .phone(phone)
                .city(req.city().trim())
                .quarter(req.quarter())
                .photoUrl(req.photoUrl())
                .photoShape(normalizePhotoShape(req.photoShape()))
                .email(req.email())
                .passwordHash(passwordEncoder.encode(temporaryPassword))
                .mustChangePassword(true)
                .active(true)
                .role(role)
                .cycleContributions(0)
                .totalContributions(0)
                .build();
        member = memberRepository.save(member);
        groupMembershipRepository.save(GroupMembership.builder().group(group).member(member).role(role).active(true)
                .requiredAssistancesOverride(req.requiredAssistancesOverride() != null && req.requiredAssistancesOverride() >= 0 ? req.requiredAssistancesOverride() : null).build());
        auditService.log("MEMBER_CREATE", "Member", member.getId(), "Creation du membre " + member.fullName() + " (" + phone + ")");
        return new MemberDtos.MemberCreatedResponse(toView(member), temporaryPassword);
    }

    private String normalizeBureau(String value) {
        if (value == null || value.isBlank() || "AUCUN".equalsIgnoreCase(value)) return null;
        return value.trim().toUpperCase(Locale.ROOT);
    }

    private Role resolveDefaultRole(Long roleId) {
        if (roleId != null) {
            return roleRepository.findById(roleId).orElseThrow(() -> ApiException.badRequest("Role introuvable"));
        }
        return roleRepository.findByCode("MEMBRE")
                .orElseThrow(() -> ApiException.badRequest("Role par defaut introuvable"));
    }

    @Transactional
    public MemberDtos.MemberView update(Long id, MemberDtos.MemberUpdateRequest req) {
        Member m = get(id);
        GroupMembership gm = membership(m);
        boolean wasActive = gm.isActive();
        if (Boolean.FALSE.equals(req.active()) && m.getId().equals(currentUser.id())) {
            throw ApiException.badRequest("Vous ne pouvez pas archiver votre propre compte");
        }
        if (req.lastName() != null && !req.lastName().isBlank()) m.setLastName(req.lastName().trim());
        if (req.firstName() != null && !req.firstName().isBlank()) m.setFirstName(req.firstName().trim());
        if (req.phone() != null && !req.phone().isBlank()) {
            String phone = normalizePhone(req.phone());
            memberRepository.findByPhone(phone).ifPresent(other -> {
                if (!other.getId().equals(id)) throw ApiException.conflict("Ce numero de telephone est deja utilise");
            });
            m.setPhone(phone);
        }
        if (req.city() != null) m.setCity(req.city());
        if (req.quarter() != null) m.setQuarter(req.quarter());
        if (req.photoUrl() != null) m.setPhotoUrl(req.photoUrl());
        if (req.photoShape() != null) m.setPhotoShape(normalizePhotoShape(req.photoShape()));
        if (req.email() != null) m.setEmail(req.email());
        if (req.roleId() != null) throw ApiException.badRequest("Attribuez les rôles depuis Administration > Affectations des rôles");
        if (req.active() != null) gm.setActive(req.active());
        if (req.requiredAssistancesOverride() != null) {
            if (!currentUser.hasPermission("MEMBER_THRESHOLD_EDIT"))
                throw ApiException.forbidden("Vous n’êtes pas autorisé à modifier le seuil d’assistance de ce membre");
            gm.setRequiredAssistancesOverride(req.requiredAssistancesOverride() < 0 ? null : req.requiredAssistancesOverride());
        }
        memberRepository.save(m);
        groupMembershipRepository.save(gm);
        if (req.active() != null) {
            boolean activeSomewhere = groupMembershipRepository.findAllByMemberIdAndActiveTrueOrderByGroupNameAsc(m.getId()).size() > 0;
            m.setActive(activeSomewhere);
            memberRepository.save(m);
        }
        if (req.active() != null && wasActive != req.active()) {
            auditService.log(req.active() ? "MEMBER_REACTIVATE" : "MEMBER_ARCHIVE", "Member", m.getId(),
                    (req.active() ? "Reactivation" : "Archivage") + " du membre " + m.fullName());
        } else {
            auditService.log("MEMBER_UPDATE", "Member", m.getId(), "Modification du membre " + m.fullName());
        }
        return toView(m);
    }

    @Transactional
    public MemberDtos.MemberView assignRole(Long memberId, Long roleId) {
        Member m = get(memberId);
        GroupMembership gm = membership(m);
        Role role = roleRepository.findById(roleId).orElseThrow(() -> ApiException.notFound("Rôle introuvable"));
        if (role.getGroup() == null || !role.getGroup().getId().equals(currentUser.requireGroupId()))
            throw ApiException.badRequest("Le rôle ne fait pas partie du groupe actif");
        gm.setRole(role);
        groupMembershipRepository.save(gm);
        auditService.log("ROLE_ASSIGN", "Member", memberId, "Rôle " + role.getName() + " attribué à " + m.fullName());
        return toView(m);
    }

    @Transactional
    public void delete(Long id) {
        Member m = get(id);
        if (m.getId().equals(currentUser.id())) throw ApiException.badRequest("Vous ne pouvez pas supprimer votre propre compte");
        GroupMembership gm = membership(m);
        gm.setActive(false);
        groupMembershipRepository.save(gm);
        if (groupMembershipRepository.findAllByMemberIdAndActiveTrueOrderByGroupNameAsc(m.getId()).isEmpty()) {
            m.setActive(false);
            memberRepository.save(m);
        }
        auditService.log("MEMBER_DISABLE", "Member", m.getId(), "Desactivation du membre " + m.fullName());
    }

    @Transactional
    public MemberDtos.ResetPasswordResponse resetPassword(Long id) {
        Member m = get(id);
        String temp = settingService.get(SettingService.DEFAULT_PASSWORD);
        m.setPasswordHash(passwordEncoder.encode(temp));
        m.setMustChangePassword(true);
        memberRepository.save(m);
        auditService.log("MEMBER_RESET_PASSWORD", "Member", m.getId(), "Reinitialisation du mot de passe de " + m.fullName());
        return new MemberDtos.ResetPasswordResponse(temp);
    }

    @Transactional
    public void resetCycle(Long id, String reason) {
        Member m = get(id);
        GroupMembership gm = membership(m);
        gm.setCycleContributions(0);
        groupMembershipRepository.save(gm);
        auditService.log("CYCLE_RESET", "Member", m.getId(), reason);
    }

    public MemberDtos.MeSummary summary(Long memberId) {
        Member m = get(memberId);
        int required = requiredFor(m);
        BigDecimal totalAmount = contributionRepository.findAllByEvent_Group_IdAndMember_IdOrderBySubmittedAtDesc(currentUser.requireGroupId(), m.getId()).stream()
                .filter(c -> c.getStatus() == cm.makenene.solidarite.domain.ContributionStatus.VALIDATED)
                .map(c -> c.getAmount() == null ? BigDecimal.ZERO : c.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long pending = contributionRepository.findAllByEvent_Group_IdAndMember_IdOrderBySubmittedAtDesc(currentUser.requireGroupId(), m.getId()).stream()
                .filter(c -> c.getStatus() == cm.makenene.solidarite.domain.ContributionStatus.PENDING).count();
        int cycle = cycleFor(m);
        int total = totalFor(m);
        return new MemberDtos.MeSummary(
                toView(m), cycle, required, cycle >= required,
                Math.max(0, required - cycle), total, totalAmount,
                eventRepository.countByGroupIdAndStatus(currentUser.requireGroupId(), cm.makenene.solidarite.domain.EventStatus.OPEN),
                pending, requestRepository.findByGroupIdAndMemberIdOrderByCreatedAtDesc(currentUser.requireGroupId(), m.getId()).size());
    }
}
