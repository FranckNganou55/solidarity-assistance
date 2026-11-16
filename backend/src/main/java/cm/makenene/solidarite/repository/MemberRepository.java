package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.entity.Member;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.List;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByPhone(String phone);
    boolean existsByPhone(String phone);

    @Query("""
        select m from Member m
        where (:q = '' or lower(m.firstName) like lower(concat('%', :q, '%'))
               or lower(m.lastName) like lower(concat('%', :q, '%'))
               or m.phone like concat('%', :q, '%')
               or lower(m.quarter) like lower(concat('%', :q, '%')))
          and (:roleId is null or m.role.id = :roleId)
          and (:active is null or m.active = :active)
        """)
    Page<Member> search(@Param("q") String q, @Param("roleId") Long roleId,
                        @Param("active") Boolean active, Pageable pageable);

    @Query("""
        select distinct m from Member m join GroupMembership gm on gm.member.id = m.id
        where gm.group.id = :groupId
          and (:q = '' or lower(m.firstName) like lower(concat('%', :q, '%'))
               or lower(m.lastName) like lower(concat('%', :q, '%'))
               or m.phone like concat('%', :q, '%') or lower(m.quarter) like lower(concat('%', :q, '%')))
          and (:roleId is null or gm.role.id = :roleId)
          and (:active is null or gm.active = :active)
        """)
    Page<Member> searchInGroup(@Param("groupId") Long groupId, @Param("q") String q, @Param("roleId") Long roleId,
                               @Param("active") Boolean active, Pageable pageable);

    long countByActiveTrue();
    List<Member> findAllByActiveTrue();
    List<Member> findAllByActiveTrueAndBureauPositionIsNotNullOrderByFirstNameAsc();
    Optional<Member> findByBureauPositionAndActiveTrue(String bureauPosition);
}
