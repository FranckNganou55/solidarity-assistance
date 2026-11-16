package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByCode(String code);
    Optional<Role> findByGroupIdAndCode(Long groupId, String code);
    boolean existsByCode(String code);
    boolean existsByGroupIdAndCode(Long groupId, String code);
    List<Role> findAllByOrderBySystemRoleDescNameAsc();
    List<Role> findAllByGroupIdOrderBySystemRoleDescNameAsc(Long groupId);
    long countByGroupIdAndCode(Long groupId, String code);
}
