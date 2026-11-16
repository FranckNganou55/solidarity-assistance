package cm.makenene.solidarite.repository;

import cm.makenene.solidarite.domain.RequestStatus;
import cm.makenene.solidarite.entity.AssistanceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestRepository extends JpaRepository<AssistanceRequest, Long> {
    List<AssistanceRequest> findAllByOrderByCreatedAtDesc();
    List<AssistanceRequest> findAllByGroupIdOrderByCreatedAtDesc(Long groupId);
    List<AssistanceRequest> findByMemberIdOrderByCreatedAtDesc(Long memberId);
    List<AssistanceRequest> findByGroupIdAndMemberIdOrderByCreatedAtDesc(Long groupId, Long memberId);
    List<AssistanceRequest> findByGroupIdAndStatusOrderByCreatedAtDesc(Long groupId, RequestStatus status);
    long countByStatus(RequestStatus status);
    long countByGroupIdAndStatus(Long groupId, RequestStatus status);
}
