package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.entity.AssistanceType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AssistanceTypeRepository extends JpaRepository<AssistanceType, Long> {
    List<AssistanceType> findAllByOrderByNameAsc();
    List<AssistanceType> findAllByGroupIdOrderByNameAsc(Long groupId);
    Optional<AssistanceType> findByGroupIdAndNameIgnoreCase(Long groupId, String name);
    boolean existsByGroupIdAndNameIgnoreCase(Long groupId, String name);
    Optional<AssistanceType> findByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCase(String name);
}
