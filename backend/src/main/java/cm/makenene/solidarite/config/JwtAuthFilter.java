package cm.makenene.solidarite.config;

import cm.makenene.solidarite.entity.Member;
import cm.makenene.solidarite.entity.Role;
import cm.makenene.solidarite.repository.MemberRepository;
import cm.makenene.solidarite.repository.GroupMembershipRepository;
import cm.makenene.solidarite.repository.AssociationGroupRepository;
import cm.makenene.solidarite.entity.GroupMembership;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final MemberRepository memberRepository;
    private final GroupMembershipRepository groupMembershipRepository;
    private final AssociationGroupRepository groupRepository;

    public JwtAuthFilter(JwtService jwtService, MemberRepository memberRepository,
                         GroupMembershipRepository groupMembershipRepository, AssociationGroupRepository groupRepository) {
        this.jwtService = jwtService;
        this.memberRepository = memberRepository;
        this.groupMembershipRepository = groupMembershipRepository;
        this.groupRepository = groupRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtService.parse(header.substring(7));
                Long memberId = Long.valueOf(claims.getSubject());
                Member member = memberRepository.findById(memberId).orElse(null);
                if (member != null && member.isActive()) {
                    boolean superAdmin = member.isSuperAdmin() || "ADMIN".equals(member.getRole().getCode());
                    String requestedGroup = request.getHeader("X-Group-Id");
                    Long groupId = requestedGroup == null || requestedGroup.isBlank() ? null : Long.valueOf(requestedGroup);
                    GroupMembership membership = null;
                    if (groupId != null && !groupRepository.existsByIdAndActiveTrue(groupId)) throw new IllegalArgumentException("Groupe inconnu ou archivé");
                    if (groupId == null && !superAdmin) {
                        membership = groupMembershipRepository.findAllByMemberIdAndActiveTrueOrderByGroupNameAsc(memberId).stream().findFirst().orElse(null);
                        if (membership != null) groupId = membership.getGroup().getId();
                    } else if (groupId != null) {
                        membership = groupMembershipRepository.findByGroupIdAndMemberId(groupId, memberId).filter(GroupMembership::isActive).orElse(null);
                    }
                    if (!superAdmin && membership == null) throw new IllegalArgumentException("Aucun accès à ce groupe");
                    Role role = membership == null ? member.getRole() : membership.getRole();
                    List<GrantedAuthority> authorities = new ArrayList<>();
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode()));
                    if (superAdmin) authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
                    if (membership != null && membership.isPrincipalAdmin()) authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN_PRINCIPAL"));
                    if (superAdmin || (membership != null && membership.isPrincipalAdmin())) {
                        // Le super-admin a les droits globaux. Un administrateur principal
                        // a tous les droits de son groupe, jamais la création globale de groupes.
                        for (var p : cm.makenene.solidarite.domain.Permission.values()) {
                            if (!superAdmin && (p == cm.makenene.solidarite.domain.Permission.GROUP_CREATE
                                    || p.name().endsWith("_MANAGE"))) continue;
                            authorities.add(new SimpleGrantedAuthority("PERM_" + p.name()));
                        }
                    } else {
                        role.getPermissions().forEach(p -> authorities.add(new SimpleGrantedAuthority("PERM_" + p.name())));
                        // Un membre du bureau reste aussi membre cotisant, quel que soit son rôle métier.
                        if (membership != null && membership.getBureauPosition() != null
                                && !membership.getBureauPosition().isBlank()) {
                            authorities.add(new SimpleGrantedAuthority("PERM_EVENT_VIEW"));
                            authorities.add(new SimpleGrantedAuthority("PERM_CONTRIBUTION_SUBMIT"));
                            authorities.add(new SimpleGrantedAuthority("PERM_CONTRIBUTION_VIEW"));
                        }
                    }
                    AuthPrincipal principal = new AuthPrincipal(member, groupId, membership);
                    var auth = new UsernamePasswordAuthenticationToken(principal, null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}
