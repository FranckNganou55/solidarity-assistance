package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.domain.ContributionStatus;
import cm.makenene.solidarite.entity.Contribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ContributionRepository extends JpaRepository<Contribution, Long> {

    List<Contribution> findByEventIdOrderBySubmittedAtAsc(Long eventId);

    List<Contribution> findAllByMemberIdOrderBySubmittedAtDesc(Long memberId);
    List<Contribution> findAllByEvent_Group_IdAndMember_IdOrderBySubmittedAtDesc(Long groupId, Long memberId);

    @Query("select c from Contribution c where c.event.group.id = :groupId")
    List<Contribution> findAllByEventGroup(@Param("groupId") Long groupId);

    @Query("select c from Contribution c where c.event.group.id = :groupId and c.status = :status order by c.submittedAt desc")
    List<Contribution> findAllByEventGroupAndStatus(@Param("groupId") Long groupId, @Param("status") ContributionStatus status);

    Optional<Contribution> findByEventIdAndMemberId(Long eventId, Long memberId);

    long countByStatus(ContributionStatus status);

    void deleteByEventId(Long eventId);

    @Query("select coalesce(sum(c.amount),0) from Contribution c where c.event.id = :eventId and c.status = 'VALIDATED'")
    BigDecimal sumValidatedByEvent(@Param("eventId") Long eventId);

    @Query("select coalesce(sum(c.amount),0) from Contribution c where c.status = 'VALIDATED'")
    BigDecimal sumAllValidated();

    @Query("select coalesce(sum(c.amount),0) from Contribution c where c.event.group.id = :groupId and c.status = 'VALIDATED'")
    BigDecimal sumValidatedByGroup(@Param("groupId") Long groupId);

    @Query("""
        select count(c) from Contribution c
        where c.member.id = :memberId and c.status = 'VALIDATED'
          and (:excludeEventId is null or c.event.id <> :excludeEventId)
        """)
    long countValidatedByMember(@Param("memberId") Long memberId, @Param("excludeEventId") Long excludeEventId);
}
