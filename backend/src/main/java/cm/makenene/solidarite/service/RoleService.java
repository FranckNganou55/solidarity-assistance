package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.domain.Permission;
import cm.makenene.solidarite.dto.RoleDtos;
import cm.makenene.solidarite.entity.Role;
import cm.makenene.solidarite.repository.RoleRepository;
import cm.makenene.solidarite.repository.GroupMembershipRepository;
import cm.makenene.solidarite.repository.AssociationGroupRepository;
import cm.makenene.solidarite.config.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class RoleService {

    private final RoleRepository roleRepository;
    private final AuditService auditService;
    private final GroupMembershipRepository membershipRepository;
    private final CurrentUser currentUser;
    private final AssociationGroupRepository groupRepository;

    public RoleService(RoleRepository roleRepository, AuditService auditService,
                       GroupMembershipRepository membershipRepository, CurrentUser currentUser,
                       AssociationGroupRepository groupRepository) {
        this.roleRepository = roleRepository;
        this.auditService = auditService;
        this.membershipRepository = membershipRepository;
        this.currentUser = currentUser;
        this.groupRepository = groupRepository;
    }

    public List<RoleDtos.PermissionView> permissionCatalogue() {
        return Arrays.stream(Permission.values()).filter(p -> !isLegacy(p))
                .map(p -> new RoleDtos.PermissionView(p.name(), p.labelFr(), p.labelEn(), p.group()))
                .toList();
    }

    public List<RoleDtos.RoleView> findAll() {
        return roleRepository.findAllByGroupIdOrderBySystemRoleDescNameAsc(currentUser.requireGroupId()).stream().map(this::toView).toList();
    }

    public RoleDtos.RoleView toView(Role r) {
        long count = membershipRepository.countByGroupIdAndRoleId(r.getGroup().getId(), r.getId());
        return new RoleDtos.RoleView(r.getId(), r.getCode(), r.getName(), r.getDescription(), r.isSystemRole(),
                r.getPermissions().stream().filter(p -> !isLegacy(p) && p != Permission.GROUP_CREATE).map(Enum::name).sorted().toList(), count);
    }

    public Role get(Long id) {
        return roleRepository.findById(id).filter(r -> r.getGroup() != null && r.getGroup().getId().equals(currentUser.requireGroupId()))
                .orElseThrow(() -> ApiException.notFound("Role introuvable dans le groupe actif"));
    }

    private Set<Permission> parse(List<String> codes) {
        Set<Permission> set = EnumSet.noneOf(Permission.class);
        if (codes == null) return set;
        for (String code : codes) {
            try {
                Permission permission = Permission.valueOf(code);
                if (isLegacy(permission) || permission == Permission.GROUP_CREATE) throw ApiException.badRequest("Cette permission est réservée au super administrateur");
                set.add(permission);
            }
            catch (IllegalArgumentException e) { throw ApiException.badRequest("Permission inconnue : " + code); }
        }
        return set;
    }

    @Transactional
    public RoleDtos.RoleView create(RoleDtos.RoleRequest req) {
        String code = req.code().trim().toUpperCase(Locale.ROOT);
        Long groupId = currentUser.requireGroupId();
        if (roleRepository.existsByGroupIdAndCode(groupId, code)) throw ApiException.conflict("Un role avec ce code existe deja");
        var group = groupRepository.findById(groupId).orElseThrow(() -> ApiException.notFound("Groupe introuvable"));
        Role role = Role.builder()
                .group(group)
                .code(code)
                .name(req.name().trim())
                .description(req.description())
                .systemRole(false)
                .permissions(parse(req.permissions()))
                .build();
        roleRepository.save(role);
        auditService.log("ROLE_CREATE", "Role", role.getId(), "Creation du role " + role.getName());
        return toView(role);
    }

    @Transactional
    public RoleDtos.RoleView update(Long id, RoleDtos.RoleRequest req) {
        Role role = get(id);
        if (!role.getGroup().getId().equals(currentUser.requireGroupId())) throw ApiException.notFound("Rôle introuvable dans le groupe actif");
        if (!role.getCode().equalsIgnoreCase(req.code())) {
            if (role.isSystemRole()) throw ApiException.badRequest("Le code d'un role systeme ne peut pas etre modifie");
            if (roleRepository.existsByGroupIdAndCode(currentUser.requireGroupId(), req.code().trim().toUpperCase(Locale.ROOT)))
                throw ApiException.conflict("Un role avec ce code existe deja");
            role.setCode(req.code().trim().toUpperCase(Locale.ROOT));
        }
        role.setName(req.name().trim());
        role.setDescription(req.description());
        // Un rôle système reste non supprimable et conserve son code, mais ses
        // libellés et permissions peuvent être adaptés par un rôle habilité.
        role.setPermissions(parse(req.permissions()));
        roleRepository.save(role);
        auditService.log("ROLE_UPDATE", "Role", role.getId(), "Mise a jour des permissions du role " + role.getName());
        return toView(role);
    }

    @Transactional
    public void delete(Long id) {
        Role role = get(id);
        if (!role.getGroup().getId().equals(currentUser.requireGroupId())) throw ApiException.notFound("Rôle introuvable dans le groupe actif");
        if (role.isSystemRole()) throw ApiException.badRequest("Ce role systeme ne peut pas etre supprime");
        long used = membershipRepository.countByGroupIdAndRoleId(currentUser.requireGroupId(), id);
        if (used > 0) throw ApiException.conflict("Ce role est attribue a " + used + " membre(s). Reaffectez-les avant de le supprimer.");
        roleRepository.delete(role);
        auditService.log("ROLE_DELETE", "Role", id, "Suppression du role " + role.getName());
    }

    private boolean isLegacy(Permission p) { return p == Permission.MEMBER_MANAGE || p == Permission.ROLE_MANAGE || p == Permission.ASSISTANCE_TYPE_MANAGE || p == Permission.EVENT_MANAGE || p == Permission.REQUEST_MANAGE; }
}
