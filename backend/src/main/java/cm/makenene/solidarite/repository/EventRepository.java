package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.domain.EventStatus;
import cm.makenene.solidarite.entity.AssistanceEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EventRepository extends JpaRepository<AssistanceEvent, Long> {

    @Query("""
        select e from AssistanceEvent e
        where (:status is null or e.status = :status)
          and (:typeId is null or e.type.id = :typeId)
          and (:beneficiaryId is null or e.beneficiary.id = :beneficiaryId)
          and (:q = '' or lower(e.reference) like lower(concat('%', :q, '%'))
               or lower(e.description) like lower(concat('%', :q, '%'))
               or lower(e.beneficiary.firstName) like lower(concat('%', :q, '%'))
               or lower(e.beneficiary.lastName) like lower(concat('%', :q, '%'))
               or lower(concat(e.beneficiary.firstName, ' ', e.beneficiary.lastName)) like lower(concat('%', :q, '%'))
               or lower(e.beneficiary.phone) like lower(concat('%', :q, '%')))
        """)
    Page<AssistanceEvent> search(@Param("status") EventStatus status,
                                @Param("typeId") Long typeId,
                                @Param("beneficiaryId") Long beneficiaryId,
                                @Param("q") String q,
                                Pageable pageable);

    @Query("""
        select e from AssistanceEvent e where e.group.id = :groupId
          and (:status is null or e.status = :status)
          and (:typeId is null or e.type.id = :typeId)
          and (:beneficiaryId is null or e.beneficiary.id = :beneficiaryId)
          and (:q = '' or lower(e.reference) like lower(concat('%', :q, '%'))
               or lower(e.description) like lower(concat('%', :q, '%'))
               or lower(e.beneficiary.firstName) like lower(concat('%', :q, '%'))
               or lower(e.beneficiary.lastName) like lower(concat('%', :q, '%'))
               or lower(concat(e.beneficiary.firstName, ' ', e.beneficiary.lastName)) like lower(concat('%', :q, '%'))
               or lower(e.beneficiary.phone) like lower(concat('%', :q, '%')))
        """)
    Page<AssistanceEvent> searchInGroup(@Param("groupId") Long groupId, @Param("status") EventStatus status,
                                      @Param("typeId") Long typeId, @Param("beneficiaryId") Long beneficiaryId,
                                      @Param("q") String q, Pageable pageable);

    List<AssistanceEvent> findTop5ByOrderByCreatedAtDesc();
    List<AssistanceEvent> findTop5ByGroupIdOrderByCreatedAtDesc(Long groupId);
    List<AssistanceEvent> findAllByGroupId(Long groupId);

    long countByStatus(EventStatus status);
    long countByGroupIdAndStatus(Long groupId, EventStatus status);

    boolean existsByReference(String reference);
    boolean existsByGroupIdAndReference(Long groupId, String reference);
    long countByGroupIdAndTypeId(Long groupId, Long typeId);
}
