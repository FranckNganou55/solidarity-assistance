package cm.makenene.solidarite.config;

import cm.makenene.solidarite.entity.Member;
import cm.makenene.solidarite.entity.GroupMembership;

/** Membre authentifie + son role, expose aux controleurs. */
public class AuthPrincipal {

    private final Long memberId;
    private final String phone;
    private final String roleCode;
    private final String fullName;
    private final boolean superAdmin;
    private final boolean principalAdmin;
    private final Long groupId;

    public AuthPrincipal(Member member) { this(member, null, null); }

    public AuthPrincipal(Member member, Long groupId, GroupMembership membership) {
        this.memberId = member.getId();
        this.phone = member.getPhone();
        this.superAdmin = member.isSuperAdmin() || "ADMIN".equals(member.getRole().getCode());
        this.principalAdmin = membership != null && membership.isPrincipalAdmin();
        this.groupId = groupId;
        this.roleCode = membership != null ? membership.getRole().getCode() : (superAdmin ? "ADMIN" : member.getRole().getCode());
        this.fullName = member.fullName();
    }

    public Long memberId() { return memberId; }
    public String phone() { return phone; }
    public String roleCode() { return roleCode; }
    public String fullName() { return fullName; }
    public boolean isAdmin() { return superAdmin; }
    public boolean isSuperAdmin() { return superAdmin; }
    public boolean isPrincipalAdmin() { return principalAdmin; }
    public Long groupId() { return groupId; }
}
