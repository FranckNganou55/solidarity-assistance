package cm.makenene.solidarite.repository;
import cm.makenene.solidarite.entity.GroupMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface GroupMembershipRepository extends JpaRepository<GroupMembership, Long> {
    Optional<GroupMembership> findByGroupIdAndMemberId(Long groupId, Long memberId);
    List<GroupMembership> findAllByMemberIdAndActiveTrueOrderByGroupNameAsc(Long memberId);
    List<GroupMembership> findAllByGroupIdAndActiveTrueOrderByMemberFirstNameAsc(Long groupId);
    List<GroupMembership> findAllByGroupIdAndRoleId(Long groupId, Long roleId);
    long countByGroupIdAndRoleId(Long groupId, Long roleId);
    long countByGroupIdAndActiveTrue(Long groupId);
    long countByGroupId(Long groupId);
}
