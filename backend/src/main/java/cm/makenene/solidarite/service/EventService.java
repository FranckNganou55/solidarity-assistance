package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.domain.ContributionStatus;
import cm.makenene.solidarite.domain.EventStatus;
import cm.makenene.solidarite.dto.CommonDtos.PageResponse;
import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.entity.*;
import cm.makenene.solidarite.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final ContributionRepository contributionRepository;
    private final MemberRepository memberRepository;
    private final SettingService settingService;
    private final CurrentUser currentUser;
    private final AuditService auditService;
    private final MemberService memberService;
    private final AssistanceTypeRepository typeRepository;

    public EventService(EventRepository eventRepository, ContributionRepository contributionRepository,
                        MemberRepository memberRepository, SettingService settingService, CurrentUser currentUser,
                        AuditService auditService, MemberService memberService,
                        AssistanceTypeRepository typeRepository) {
        this.eventRepository = eventRepository;
        this.contributionRepository = contributionRepository;
        this.memberRepository = memberRepository;
        this.settingService = settingService;
        this.currentUser = currentUser;
        this.auditService = auditService;
        this.memberService = memberService;
        this.typeRepository = typeRepository;
    }

    /** Une assistance accepte les cotisations si elle est ouverte et si la date de cloture n'est pas depassee. */
    public boolean contributionsOpen(AssistanceEvent e) {
        return e.getStatus() == EventStatus.OPEN
                && (e.getClosingDate() == null || !e.getClosingDate().isBefore(LocalDate.now()));
    }

    public PageResponse<EventDtos.EventView> search(EventStatus status, Long typeId, Long beneficiaryId,
                                                    String q, Pageable pageable) {
        Page<AssistanceEvent> page = eventRepository.searchInGroup(currentUser.requireGroupId(), status, typeId, beneficiaryId,
                q == null ? "" : q.trim(), pageable);
        return PageResponse.of(page, this::toView);
    }

    public List<EventDtos.EventView> recent() {
        return eventRepository.findTop5ByGroupIdOrderByCreatedAtDesc(currentUser.requireGroupId()).stream().map(this::toView).toList();
    }

    public AssistanceEvent get(Long id) {
        return eventRepository.findById(id).filter(e -> e.getGroup().getId().equals(currentUser.requireGroupId()))
                .orElseThrow(() -> ApiException.notFound("Assistance introuvable"));
    }

    public EventDtos.EventView detail(Long id) {
        return toView(get(id));
    }

    public EventDtos.EventView toView(AssistanceEvent e) {
        int count = contributionRepository.findByEventIdOrderBySubmittedAtAsc(e.getId()).size();
        BigDecimal collected = contributionRepository.sumValidatedByEvent(e.getId());
        long daysLeft = e.getClosingDate() == null ? -1 : ChronoUnit.DAYS.between(LocalDate.now(), e.getClosingDate());
        EventDtos.ContributionView mine = contributionRepository
                .findByEventIdAndMemberId(e.getId(), currentUser.id()).map(this::contributionView).orElse(null);
        String closedByName = e.getClosedBy() == null ? null
                : memberRepository.findById(e.getClosedBy()).map(Member::fullName).orElse(null);
        String createdByName = e.getCreatedBy() == null ? null
                : memberRepository.findById(e.getCreatedBy()).map(Member::fullName).orElse(null);
        return new EventDtos.EventView(e.getId(), e.getReference(), e.getType().getId(), e.getType().getName(),
                e.getType().getIcon(), e.getBeneficiary().getId(), e.getBeneficiary().fullName(),
                e.getBeneficiary().getPhone(), e.getBeneficiary().getPhotoUrl(), e.getDescription(),
                e.getStatus().name(), e.getClosingDate(), contributionsOpen(e), daysLeft, count, collected,
                e.getTargetAmount(), e.getCreatedBy(), createdByName, e.getCreatedAt(),
                e.getRequestedAt() == null ? e.getCreatedAt() : e.getRequestedAt(), e.getClosedAt(),
                closedByName, mine, e.isEligibilityOverridden(), e.getEligibilityOverrideBy() == null ? null
                : memberRepository.findById(e.getEligibilityOverrideBy()).map(Member::fullName).orElse(null),
                e.getSupportingDocumentUrl(), e.getBeneficiary().getPhotoShape());
    }

    public EventDtos.ContributionView contributionView(Contribution c) {
        String validatedBy = c.getValidatedBy() == null ? null
                : memberRepository.findById(c.getValidatedBy()).map(Member::fullName).orElse(null);
        String paymentReceivedBy = c.getPaymentReceivedBy() == null ? null
                : memberRepository.findById(c.getPaymentReceivedBy()).map(Member::fullName).orElse(null);
        return new EventDtos.ContributionView(c.getId(), c.getEvent().getId(), c.getEvent().getReference(),
                c.getEvent().getType().getName(), c.getMember().getId(), c.getMember().fullName(),
                c.getMember().getPhone(), c.getMember().getPhotoUrl(), c.getAmount(), c.getMethod().name(),
                c.getStatus().name(), c.getNote(), c.getCycleNumber(), c.getSubmittedAt(), c.getValidatedAt(),
                validatedBy, c.getRejectionReason(), c.getEvent().getClosingDate(), c.getEvent().getStatus().name(),
                c.isPaymentReceived(), c.getReceiptReference(), c.getPaymentReceivedAt(), paymentReceivedBy,
                c.getProofPhotoUrl(), c.getProofPhotoShape(), c.getMember().getPhotoShape());
    }

    private String nextReference() {
        currentUser.requireGroupId();
        long seq = eventRepository.count() + 1;
        while (true) {
            String ref = "ASS-" + LocalDate.now().getYear() + "-" + String.format("%04d", seq);
            if (!eventRepository.existsByReference(ref)) return ref;
            seq++;
        }
    }

    @Transactional
    public EventDtos.EventView create(EventDtos.EventCreateRequest req) {
        return createInternal(req);
    }

    /** Utilise par l'approbation d'une demande d'assistance. */
    @Transactional
    public EventDtos.EventView createPublic(EventDtos.EventCreateRequest req) {
        return createInternal(req);
    }

    private EventDtos.EventView createInternal(EventDtos.EventCreateRequest req) {
        Member beneficiary = memberService.get(req.beneficiaryId());
        if (!beneficiary.isActive()) throw ApiException.badRequest("Ce membre est desactive");

        boolean hasOpenEvent = eventRepository
                .searchInGroup(currentUser.requireGroupId(), EventStatus.OPEN, null, beneficiary.getId(), null, Pageable.ofSize(1))
                .stream().findAny().isPresent();
        if (hasOpenEvent) {
            throw ApiException.conflict("Ce membre a deja une assistance en cours. Cloturez-la avant d'en creer une nouvelle.");
        }

        int required = memberService.requiredFor(beneficiary);
        int cycle = memberService.cycleFor(beneficiary);
        boolean override = Boolean.TRUE.equals(req.overrideEligibility());
        if (override && !currentUser.hasPermission("REQUEST_OVERRIDE_ELIGIBILITY"))
            throw ApiException.forbidden("Seul l’administrateur principal peut autoriser une assistance sous le seuil.");
        if (cycle < required && !override) {
            throw ApiException.badRequest("Ce membre n'a pas encore atteint son cycle (" + cycle + "/" + required
                    + "). Il ne peut pas etre assiste avant d'avoir complete son cycle d'assistance.");
        }

        AssistanceType type = repositoryType(req.typeId());
        AssistanceEvent event = AssistanceEvent.builder()
                .group(type.getGroup())
                .reference(nextReference())
                .type(type)
                .beneficiary(beneficiary)
                .description(req.description())
                .supportingDocumentUrl(req.supportingDocumentUrl())
                .status(EventStatus.OPEN)
                .closingDate(req.closingDate())
                .targetAmount(req.targetAmount())
                .createdBy(currentUser.id())
                .eligibilityOverridden(override)
                .eligibilityOverrideBy(override ? currentUser.id() : null)
                .build();
        eventRepository.save(event);

        // Le membre est assiste : son compteur de cycle repart a zero,
        // mais l'historique de ses cotisations reste enregistre dans les assistances.
        if (cycle >= required || override) {
            memberService.resetGroupCycle(beneficiary);
            auditService.log("CYCLE_RESET", "Member", beneficiary.getId(),
                    "Compteur de cycle remis a zero apres attribution de l'assistance (historique conserve : "
                            + beneficiary.getTotalContributions() + " cotisations au total)");
        }

        auditService.log("EVENT_CREATE", "AssistanceEvent", event.getId(),
                "Assistance " + event.getReference() + " pour " + beneficiary.fullName() + " - type " + event.getType().getName());
        return toView(event);
    }

    private AssistanceType repositoryType(Long typeId) {
        return typeRepository.findById(typeId).filter(t -> t.getGroup().getId().equals(currentUser.requireGroupId()))
                .orElseThrow(() -> ApiException.badRequest("Type d'assistance introuvable dans le groupe actif"));
    }

    @Transactional
    public EventDtos.EventView update(Long id, EventDtos.EventUpdateRequest req) {
        AssistanceEvent e = get(id);
        boolean closed = e.getStatus() != EventStatus.OPEN;
        if (closed) {
            if (!currentUser.hasPermission("EVENT_EDIT_CLOSED")) {
                throw ApiException.forbidden("Cette assistance est cloturee : seul l'administrateur peut la modifier.");
            }
        } else if (req.closingDate() != null && !req.closingDate().equals(e.getClosingDate())
                && !currentUser.hasPermission("EVENT_CLOSE")) {
            throw ApiException.forbidden("Vous n'avez pas la permission de fixer la date de cloture.");
        }
        if (req.description() != null) e.setDescription(req.description());
        if (req.supportingDocumentUrl() != null) e.setSupportingDocumentUrl(req.supportingDocumentUrl());
        if (req.closingDate() != null) e.setClosingDate(req.closingDate());
        if (req.targetAmount() != null) e.setTargetAmount(req.targetAmount());
        eventRepository.save(e);
        auditService.log("EVENT_UPDATE", "AssistanceEvent", id, "Modification de l'assistance " + e.getReference());
        return toView(e);
    }

    /**
     * Fixe la date de cloture et cloture l'assistance.
     * Une fois cloturee, seul l'administrateur peut revenir dessus.
     */
    @Transactional
    public EventDtos.EventView close(Long id, EventDtos.CloseRequest req) {
        AssistanceEvent e = get(id);
        if (e.getStatus() == EventStatus.CLOSED && !currentUser.hasPermission("EVENT_EDIT_CLOSED")) {
            throw ApiException.forbidden("Assistance deja cloturee : seul l'administrateur peut modifier la cloture.");
        }
        if (e.getStatus() == EventStatus.CANCELLED) throw ApiException.badRequest("Cette assistance est annulee");
        LocalDate date = req != null && req.closingDate() != null ? req.closingDate() : LocalDate.now();
        e.setClosingDate(date);
        e.setStatus(EventStatus.CLOSED);
        e.setClosedAt(Instant.now());
        e.setClosedBy(currentUser.id());
        eventRepository.save(e);

        // Les cotisations encore en attente sont rejetees automatiquement
        var pending = contributionRepository.findByEventIdOrderBySubmittedAtAsc(id).stream()
                .filter(c -> c.getStatus() == ContributionStatus.PENDING).toList();
        pending.forEach(c -> {
            c.setStatus(ContributionStatus.REJECTED);
            c.setRejectionReason("Assistance cloturee");
            c.setValidatedAt(Instant.now());
            c.setValidatedBy(currentUser.id());
            contributionRepository.save(c);
        });
        auditService.log("EVENT_CLOSE", "AssistanceEvent", id,
                "Cloture de l'assistance " + e.getReference() + " au " + date + " (" + pending.size() + " cotisation(s) en attente rejetee(s))");
        return toView(e);
    }

    @Transactional
    public EventDtos.EventView reopen(Long id) {
        if (!currentUser.hasPermission("EVENT_REOPEN")) throw ApiException.forbidden("Vous n’avez pas le droit de rouvrir cette assistance.");
        AssistanceEvent e = get(id);
        e.setStatus(EventStatus.OPEN);
        e.setClosedAt(null);
        e.setClosedBy(null);
        eventRepository.save(e);
        auditService.log("EVENT_REOPEN", "AssistanceEvent", id, "Reouverture de l'assistance " + e.getReference());
        return toView(e);
    }

    @Transactional
    public EventDtos.EventView cancel(Long id, String reason) {
        AssistanceEvent e = get(id);
        if (e.getStatus() == EventStatus.CLOSED && !currentUser.hasPermission("EVENT_EDIT_CLOSED"))
            throw ApiException.forbidden("Assistance cloturee : seul l'administrateur peut l'annuler.");
        e.setStatus(EventStatus.CANCELLED);
        e.setClosedAt(Instant.now());
        e.setClosedBy(currentUser.id());
        eventRepository.save(e);
        auditService.log("EVENT_CANCEL", "AssistanceEvent", id, "Annulation de l'assistance " + e.getReference() + (reason == null ? "" : " - " + reason));
        return toView(e);
    }

    /** Cloture automatique des assistances dont la date de cloture est atteinte. */
    @Scheduled(cron = "0 5 * * * *")
    @Transactional
    public void autoCloseExpired() {
        List<AssistanceEvent> expired = eventRepository.findAll().stream()
                .filter(e -> e.getStatus() == EventStatus.OPEN && e.getClosingDate() != null
                        && e.getClosingDate().isBefore(LocalDate.now()))
                .toList();
        for (AssistanceEvent e : expired) {
            e.setStatus(EventStatus.CLOSED);
            e.setClosedAt(Instant.now());
            eventRepository.save(e);
            contributionRepository.findByEventIdOrderBySubmittedAtAsc(e.getId()).stream()
                    .filter(c -> c.getStatus() == ContributionStatus.PENDING)
                    .forEach(c -> {
                        c.setStatus(ContributionStatus.REJECTED);
                        c.setRejectionReason("Assistance cloturee automatiquement");
                        contributionRepository.save(c);
                    });
        }
    }
}
