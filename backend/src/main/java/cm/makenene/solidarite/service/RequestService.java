package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.domain.EventStatus;
import cm.makenene.solidarite.domain.RequestStatus;
import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.entity.*;
import cm.makenene.solidarite.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
public class RequestService {

    private final RequestRepository requestRepository;
    private final MemberRepository memberRepository;
    private final AssistanceTypeRepository typeRepository;
    private final ContributionRepository contributionRepository;
    private final EventService eventService;
    private final MemberService memberService;
    private final CurrentUser currentUser;
    private final AuditService auditService;

    public RequestService(RequestRepository requestRepository, MemberRepository memberRepository,
                          AssistanceTypeRepository typeRepository, ContributionRepository contributionRepository,
                          EventService eventService, MemberService memberService,
                          CurrentUser currentUser, AuditService auditService) {
        this.requestRepository = requestRepository;
        this.memberRepository = memberRepository;
        this.typeRepository = typeRepository;
        this.contributionRepository = contributionRepository;
        this.eventService = eventService;
        this.memberService = memberService;
        this.currentUser = currentUser;
        this.auditService = auditService;
    }

    public EventDtos.RequestView toView(AssistanceRequest r) {
        String decidedBy = r.getDecidedBy() == null ? null
                : memberRepository.findById(r.getDecidedBy()).map(Member::fullName).orElse(null);
        return new EventDtos.RequestView(r.getId(), r.getMember().getId(), r.getMember().fullName(),
                r.getMember().getPhone(), r.getMember().getPhotoUrl(), r.getType().getId(), r.getType().getName(),
                r.getType().getIcon(), r.getReason(), r.getStatus().name(), r.isEligible(),
                r.getCycleCountAtRequest(), r.getMinRequiredAtRequest(), r.getDecisionComment(),
                r.getEvent() == null ? null : r.getEvent().getId(),
                r.getEvent() == null ? null : r.getEvent().getReference(),
                r.getCreatedAt(), r.getDecidedAt(), decidedBy, r.getDocumentUrl(), r.getMember().getPhotoShape());
    }

    /**
     * Un membre demande une assistance uniquement s'il a deja assiste le nombre minimum de membres.
     */
    @Transactional
    public EventDtos.RequestView create(EventDtos.RequestCreateRequest req) {
        Member me = memberRepository.findById(currentUser.id())
                .orElseThrow(() -> ApiException.unauthorized("Membre introuvable"));
        int required = memberService.requiredFor(me);
        int current = memberService.cycleFor(me);

        if (current < required) {
            auditService.log("REQUEST_BLOCKED", "Member", me.getId(),
                    "Demande refusee : " + current + "/" + required + " assistances effectuees");
            throw ApiException.forbidden("Vous devez encore assister " + (required - current)
                    + " membre(s) avant de pouvoir demander une assistance (" + current + "/" + required + ").");
        }
        boolean alreadyPending = requestRepository.findByGroupIdAndMemberIdOrderByCreatedAtDesc(currentUser.requireGroupId(), me.getId()).stream()
                .anyMatch(r -> r.getStatus() == RequestStatus.PENDING);
        if (alreadyPending) throw ApiException.conflict("Vous avez deja une demande d'assistance en attente de traitement.");

        AssistanceType type = typeRepository.findById(req.typeId()).filter(t -> t.getGroup().getId().equals(currentUser.requireGroupId()))
                .orElseThrow(() -> ApiException.badRequest("Type d'assistance introuvable"));
        if (!type.isActive()) throw ApiException.badRequest("Ce type d'assistance n'est plus disponible");

        AssistanceRequest request = AssistanceRequest.builder()
                .group(type.getGroup())
                .member(me)
                .type(type)
                .reason(req.reason())
                .documentUrl(req.documentUrl())
                .status(RequestStatus.PENDING)
                .cycleCountAtRequest(current)
                .minRequiredAtRequest(required)
                .eligible(true)
                .build();
        requestRepository.save(request);
        auditService.log("REQUEST_CREATE", "AssistanceRequest", request.getId(),
                "Demande d'assistance (" + type.getName() + ") par " + me.fullName());
        return toView(request);
    }

    public List<EventDtos.RequestView> list(String scope) {
        boolean all = "all".equalsIgnoreCase(scope) && currentUser.hasPermission("REQUEST_VIEW");
        List<AssistanceRequest> data = all ? requestRepository.findAllByGroupIdOrderByCreatedAtDesc(currentUser.requireGroupId())
                : requestRepository.findByGroupIdAndMemberIdOrderByCreatedAtDesc(currentUser.requireGroupId(), currentUser.id());
        return data.stream().map(this::toView).toList();
    }

    public AssistanceRequest get(Long id) {
        return requestRepository.findById(id).filter(r -> r.getGroup().getId().equals(currentUser.requireGroupId()))
                .orElseThrow(() -> ApiException.notFound("Demande introuvable"));
    }

    /**
     * Approuve la demande : cree l'assistance et permet de fixer immediatement la date de cloture.
     */
    @Transactional
    public EventDtos.RequestView approve(Long id, EventDtos.ApproveRequest req) {
        AssistanceRequest r = get(id);
        if (r.getStatus() != RequestStatus.PENDING) throw ApiException.badRequest("Cette demande a deja ete traitee");
        Member beneficiary = r.getMember();
        boolean override = req != null && Boolean.TRUE.equals(req.overrideEligibility());
        boolean belowThreshold = memberService.cycleFor(beneficiary) < memberService.requiredFor(beneficiary);
        if (belowThreshold && (!override || !currentUser.hasPermission("REQUEST_OVERRIDE_ELIGIBILITY"))) {
            throw ApiException.badRequest("Le membre ne remplit plus la condition d'assistance minimum.");
        }
        EventDtos.EventView event = eventService.createPublic(new EventDtos.EventCreateRequest(
                r.getType().getId(), beneficiary.getId(), r.getReason(),
                req == null ? null : req.closingDate(), req == null ? null : req.targetAmount(), override,
                r.getDocumentUrl()));
        r.setStatus(RequestStatus.APPROVED);
        r.setDecisionComment(req == null ? null : req.comment());
        r.setDecidedAt(Instant.now());
        r.setDecidedBy(currentUser.id());
        AssistanceEvent assistanceEvent = eventService.get(event.id());
        assistanceEvent.setRequestedAt(r.getCreatedAt());
        r.setEvent(assistanceEvent);
        requestRepository.save(r);
        auditService.log("REQUEST_APPROVE", "AssistanceRequest", id,
                "Demande approuvee pour " + beneficiary.fullName() + " -> assistance " + event.reference());
        return toView(r);
    }

    @Transactional
    public EventDtos.RequestView reject(Long id, String comment) {
        AssistanceRequest r = get(id);
        if (r.getStatus() != RequestStatus.PENDING) throw ApiException.badRequest("Cette demande a deja ete traitee");
        r.setStatus(RequestStatus.REJECTED);
        r.setDecisionComment(comment);
        r.setDecidedAt(Instant.now());
        r.setDecidedBy(currentUser.id());
        requestRepository.save(r);
        auditService.log("REQUEST_REJECT", "AssistanceRequest", id, "Demande rejetee pour " + r.getMember().fullName());
        return toView(r);
    }

}
