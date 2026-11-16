package cm.makenene.solidarite.repository;
import cm.makenene.solidarite.entity.AssociationGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface AssociationGroupRepository extends JpaRepository<AssociationGroup, Long> {
    List<AssociationGroup> findAllByActiveTrueOrderByNameAsc();
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByIdAndActiveTrue(Long id);
}
