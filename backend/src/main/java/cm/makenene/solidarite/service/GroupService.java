package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.domain.Permission;
import cm.makenene.solidarite.dto.GroupDtos;
import cm.makenene.solidarite.entity.*;
import cm.makenene.solidarite.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
public class GroupService {
    private final AssociationGroupRepository groups;
    private final GroupMembershipRepository memberships;
    private final MemberRepository members;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final SettingService settings;
    private final CurrentUser currentUser;
    private final AuditService audit;
    public GroupService(AssociationGroupRepository groups, GroupMembershipRepository memberships, MemberRepository members,
                       RoleRepository roles, PasswordEncoder encoder, SettingService settings, CurrentUser currentUser, AuditService audit) {
        this.groups=groups; this.memberships=memberships; this.members=members; this.roles=roles; this.encoder=encoder;
        this.settings=settings; this.currentUser=currentUser; this.audit=audit;
    }

    @Transactional(readOnly = true)
    public List<GroupDtos.GroupView> mine() {
        if (currentUser.isSuperAdmin()) return groups.findAllByActiveTrueOrderByNameAsc().stream()
                .map(g -> view(g, memberships.findByGroupIdAndMemberId(g.getId(), currentUser.id()).orElse(null))).toList();
        return memberships.findAllByMemberIdAndActiveTrueOrderByGroupNameAsc(currentUser.id()).stream()
                .map(m -> view(m.getGroup(), m)).toList();
    }
    @Transactional(readOnly = true)
    public List<GroupDtos.GroupView> publicList() { return groups.findAllByActiveTrueOrderByNameAsc().stream().map(g -> view(g, null)).toList(); }

    @Transactional
    public GroupDtos.GroupView create(GroupDtos.GroupCreateRequest req) {
        if (!currentUser.isSuperAdmin()) throw ApiException.forbidden("Seul le super administrateur peut créer un groupe");
        if (req == null || req.name() == null || req.name().isBlank() || req.admin() == null)
            throw ApiException.badRequest("Le nom du groupe et son administrateur principal sont obligatoires");
        if (groups.existsByNameIgnoreCase(req.name().trim())) throw ApiException.conflict("Un groupe porte déjà ce nom");
        String phone = MemberService.normalizePhone(req.admin().phone());
        if (phone.isBlank() || members.existsByPhone(phone)) throw ApiException.conflict("Le téléphone de l’administrateur est invalide ou déjà utilisé");
        AssociationGroup group = groups.save(AssociationGroup.builder().name(req.name().trim())
                .logoUrl(blankToNull(req.logoUrl())).city(blankToNull(req.city())).description(blankToNull(req.description()))
                .contactPhone(blankToNull(req.contactPhone())).contactEmail(blankToNull(req.contactEmail()))
                .primaryColor(valueOr(req.primaryColor(), "#264557")).accentColor(valueOr(req.accentColor(), "#F3856A"))
                .currency(valueOr(req.currency(), "FCFA")).minAssistancesRequired(Math.max(0, req.minAssistancesRequired() == null ? 2 : req.minAssistancesRequired()))
                .createdBy(currentUser.id()).build());

        EnumSet<Permission> principalPermissions = EnumSet.allOf(Permission.class);
        principalPermissions.remove(Permission.GROUP_CREATE);
        principalPermissions.removeIf(p -> p.name().endsWith("_MANAGE"));
        Role principalRole = roles.save(Role.builder().group(group).code("ADMIN_PRINCIPAL").name("Administrateur principal")
                .description("Gestion complète de ce groupe uniquement").systemRole(true).permissions(principalPermissions).build());
        EnumSet<Permission> memberPermissions = EnumSet.of(Permission.EVENT_VIEW, Permission.CONTRIBUTION_SUBMIT, Permission.REQUEST_CREATE, Permission.ASSISTANCE_TYPE_VIEW);
        Role memberRole = roles.save(Role.builder().group(group).code("MEMBRE").name("Membre").description("Droits de base du membre du groupe").systemRole(true).permissions(memberPermissions).build());
        Role legacy = roles.findByGroupIdAndCode(group.getId(), "ADMIN_PRINCIPAL").orElse(principalRole);
        GroupDtos.AdminMember admin = req.admin();
        Member member = members.save(Member.builder().firstName(admin.firstName().trim()).lastName(admin.lastName().trim()).phone(phone)
                .city(valueOr(req.city(), "Makenene")).quarter(blankToNull(admin.quarter())).email(blankToNull(admin.email()))
                .passwordHash(encoder.encode(admin.password() == null || admin.password().isBlank() ? settings.get(SettingService.DEFAULT_PASSWORD) : admin.password()))
                .mustChangePassword(true).active(true).superAdmin(false).role(legacy).build());
        memberships.save(GroupMembership.builder().group(group).member(member).role(principalRole).principalAdmin(true).active(true).build());
        Member superAdmin = members.findById(currentUser.id()).orElseThrow(() -> ApiException.notFound("Super administrateur introuvable"));
        memberships.save(GroupMembership.builder().group(group).member(superAdmin).role(memberRole).principalAdmin(false)
                .active(superAdmin.isActive()).cycleContributions(0).totalContributions(0).build());
        audit.log("GROUP_CREATE", "AssociationGroup", group.getId(), "Création du groupe " + group.getName() + " et nomination de " + member.fullName());
        return view(group, memberships.findByGroupIdAndMemberId(group.getId(), member.getId()).orElseThrow());
    }

    @Transactional
    public GroupDtos.GroupView update(Long groupId, GroupDtos.GroupUpdateRequest req) {
        requireSuperAdmin();
        if (req == null || req.name() == null || req.name().isBlank()) throw ApiException.badRequest("Le nom du groupe est obligatoire");
        AssociationGroup group = requireGroup(groupId);
        String name = req.name().trim();
        if (groups.existsByNameIgnoreCaseAndIdNot(name, groupId)) throw ApiException.conflict("Un groupe porte déjà ce nom");
        group.setName(name);
        group.setLogoUrl(blankToNull(req.logoUrl()));
        group.setCity(blankToNull(req.city()));
        group.setDescription(blankToNull(req.description()));
        group.setContactPhone(blankToNull(req.contactPhone()));
        group.setContactEmail(blankToNull(req.contactEmail()));
        group.setPrimaryColor(valueOr(req.primaryColor(), group.getPrimaryColor()));
        group.setAccentColor(valueOr(req.accentColor(), group.getAccentColor()));
        group.setCurrency(valueOr(req.currency(), group.getCurrency()));
        if (req.minAssistancesRequired() != null) group.setMinAssistancesRequired(Math.max(0, req.minAssistancesRequired()));
        groups.save(group);
        audit.log("GROUP_UPDATE", "AssociationGroup", group.getId(), "Modification du groupe " + group.getName());
        return view(group, memberships.findByGroupIdAndMemberId(groupId, currentUser.id()).orElse(null));
    }

    @Transactional
    public void delete(Long groupId) {
        requireSuperAdmin();
        AssociationGroup group = requireGroup(groupId);
        if (groups.findAllByActiveTrueOrderByNameAsc().size() <= 1)
            throw ApiException.conflict("Au moins un groupe actif doit être conservé");
        group.setActive(false);
        groups.save(group);
        List<GroupMembership> groupMembers = memberships.findAllByGroupIdAndActiveTrueOrderByMemberFirstNameAsc(groupId);
        groupMembers.forEach(membership -> membership.setActive(false));
        memberships.saveAll(groupMembers);
        audit.log("GROUP_DELETE", "AssociationGroup", group.getId(), "Archivage du groupe " + group.getName());
    }

    @Transactional
    public GroupDtos.GroupView addMember(Long groupId, Long memberId) {
        AssociationGroup group = requireGroup(groupId);
        requireGroupAdminOrSuper(groupId);
        Member member = members.findById(memberId).orElseThrow(() -> ApiException.notFound("Membre introuvable"));
        if (memberships.findByGroupIdAndMemberId(groupId, memberId).isPresent()) throw ApiException.conflict("Ce membre appartient déjà à ce groupe");
        Role role = roles.findByGroupIdAndCode(groupId, "MEMBRE").orElseThrow(() -> ApiException.badRequest("Rôle Membre introuvable dans le groupe"));
        GroupMembership membership = memberships.save(GroupMembership.builder().group(group).member(member).role(role).active(true)
                .cycleContributions(0).totalContributions(0).bureauPosition(null).build());
        member.setActive(true);
        members.save(member);
        audit.log("GROUP_MEMBER_ADD", "Member", memberId, "Ajout de " + member.fullName() + " au groupe " + group.getName());
        return view(group, membership);
    }

    public void requireGroupAdminOrSuper(Long groupId) {
        if (currentUser.isSuperAdmin()) return;
        GroupMembership membership = memberships.findByGroupIdAndMemberId(groupId, currentUser.id()).orElse(null);
        if (membership == null || !membership.isActive() || !membership.isPrincipalAdmin()) throw ApiException.forbidden("Action réservée à l’administrateur principal du groupe");
    }
    private void requireSuperAdmin() {
        if (!currentUser.isSuperAdmin()) throw ApiException.forbidden("Action réservée au super administrateur de l’application");
    }
    public AssociationGroup requireGroup(Long id) { return groups.findById(id).filter(AssociationGroup::isActive).orElseThrow(() -> ApiException.notFound("Groupe introuvable")); }
    private GroupDtos.GroupView view(AssociationGroup g, GroupMembership m) {
        return new GroupDtos.GroupView(g.getId(), g.getName(), g.getLogoUrl(), g.getCity(), g.getDescription(), g.getContactPhone(), g.getContactEmail(),
                g.getPrimaryColor(), g.getAccentColor(), g.getCurrency(), g.getMinAssistancesRequired(), m != null && m.isPrincipalAdmin(), m == null ? null : m.getRole().getName());
    }
    private String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
    private String valueOr(String s, String fallback) { return s == null || s.isBlank() ? fallback : s.trim(); }
}
