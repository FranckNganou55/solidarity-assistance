package cm.makenene.solidarite.service;

import cm.makenene.solidarite.config.ApiException;
import cm.makenene.solidarite.config.CurrentUser;
import cm.makenene.solidarite.domain.ContributionMethod;
import cm.makenene.solidarite.domain.ContributionStatus;
import cm.makenene.solidarite.dto.EventDtos;
import cm.makenene.solidarite.entity.AssistanceEvent;
import cm.makenene.solidarite.entity.Contribution;
import cm.makenene.solidarite.entity.Member;
import cm.makenene.solidarite.repository.ContributionRepository;
import cm.makenene.solidarite.repository.MemberRepository;
import cm.makenene.solidarite.repository.GroupMembershipRepository;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class ContributionService {

    private final ContributionRepository contributionRepository;
    private final MemberRepository memberRepository;
    private final EventService eventService;
    private final MemberService memberService;
    private final CurrentUser currentUser;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final GroupMembershipRepository groupMembershipRepository;
    private final SettingService settingService;

    public ContributionService(ContributionRepository contributionRepository, MemberRepository memberRepository,
                              EventService eventService, MemberService memberService, CurrentUser currentUser,
                              AuditService auditService, NotificationService notificationService,
                              GroupMembershipRepository groupMembershipRepository, SettingService settingService) {
        this.contributionRepository = contributionRepository;
        this.memberRepository = memberRepository;
        this.eventService = eventService;
        this.memberService = memberService;
        this.currentUser = currentUser;
        this.auditService = auditService;
        this.notificationService = notificationService;
        this.groupMembershipRepository = groupMembershipRepository;
        this.settingService = settingService;
    }

    /** Le membre connecte soumet sa cotisation a une assistance. */
    @Transactional
    public EventDtos.ContributionView submit(Long eventId, EventDtos.ContributionSubmitRequest req) {
        AssistanceEvent event = eventService.get(eventId);
        if (event.getStatus() != cm.makenene.solidarite.domain.EventStatus.OPEN) {
            throw ApiException.badRequest("Cette assistance est cloturee : les cotisations sont fermees.");
        }
        if (!eventService.contributionsOpen(event)) {
            throw ApiException.badRequest("La date de cloture de cette assistance est depassee.");
        }
        Member me = memberRepository.findById(currentUser.id())
                .orElseThrow(() -> ApiException.unauthorized("Membre introuvable"));
        if (!me.isActive()) throw ApiException.forbidden("Votre compte est desactive");

        Contribution existing = contributionRepository.findByEventIdAndMemberId(eventId, me.getId()).orElse(null);
        if (existing != null && existing.getStatus() != ContributionStatus.REJECTED && existing.getStatus() != ContributionStatus.INVALIDATED)
            throw ApiException.conflict("Vous avez deja soumis une cotisation pour cette assistance.");
        if (req.proofPhotoUrl() == null || req.proofPhotoUrl().isBlank())
            throw ApiException.badRequest("Ajoutez une photo comme preuve de cotisation.");
        ensureMinimumAmount(req.amount());

        ContributionMethod method;
        try {
            method = req.method() == null ? ContributionMethod.CASH : ContributionMethod.valueOf(req.method().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Mode de paiement invalide");
        }

        String proofShape = "CIRCLE".equalsIgnoreCase(req.proofPhotoShape()) ? "CIRCLE" : "SQUARE";
        Contribution c = existing == null ? Contribution.builder().event(event).member(me).build() : existing;
        c.setAmount(req.amount());
        c.setMethod(method);
        c.setNote(req.note());
        c.setProofPhotoUrl(req.proofPhotoUrl());
        c.setProofPhotoShape(proofShape);
        c.setStatus(ContributionStatus.PENDING);
        c.setCycleNumber(memberService.cycleFor(me) + 1);
        c.setSubmittedAt(Instant.now());
        c.setPaymentReceived(false);
        c.setPaymentReceivedAt(null);
        c.setPaymentReceivedBy(null);
        c.setReceiptReference(null);
        c.setRejectionReason(null);
        contributionRepository.save(c);
        notificationService.notifyValidators("Nouvelle cotisation à vérifier", me.fullName() + " a soumis une cotisation pour " + event.getReference() + ".", "Contribution", c.getId());
        auditService.log("CONTRIBUTION_SUBMIT", "Contribution", c.getId(),
                "Cotisation de " + req.amount() + " de " + me.fullName() + " pour " + event.getReference());
        return eventService.contributionView(c);
    }

    /**
     * Le tresorier verifie la cotisation du membre dans l'assistance, confirme qu'il a
     * effectivement percu l'argent, puis valide. Tant que la perception n'est pas confirmee,
     * la cotisation reste en attente et ne compte pas dans le cycle du membre.
     */
    @Transactional
    public EventDtos.ContributionView validate(Long id, EventDtos.ValidateContributionRequest req) {
        Contribution c = contributionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Cotisation introuvable"));
        eventService.get(c.getEvent().getId());
        if (c.getStatus() != ContributionStatus.PENDING) throw ApiException.badRequest("Seule une cotisation en attente peut être validée.");
        if (req == null || req.paymentReceived() == null || !req.paymentReceived()) {
            throw ApiException.badRequest(
                    "Vous devez confirmer avoir percu l'argent du membre avant de valider cette cotisation.");
        }
        ensureMinimumAmount(c.getAmount());
        Instant now = Instant.now();
        c.setStatus(ContributionStatus.VALIDATED);
        c.setValidatedAt(now);
        c.setValidatedBy(currentUser.id());
        c.setRejectionReason(null);
        c.setPaymentReceived(true);
        c.setPaymentReceivedAt(now);
        c.setPaymentReceivedBy(currentUser.id());
        if (req.receiptReference() != null && !req.receiptReference().isBlank()) {
            c.setReceiptReference(req.receiptReference().trim());
        }
        contributionRepository.save(c);

        Member m = c.getMember();
        notificationService.notifyMember(m, "CONTRIBUTION_VALIDATED", "Cotisation validée", "Votre cotisation pour " + c.getEvent().getReference() + " a été validée.", "Contribution", c.getId());
        memberService.incrementValidatedContribution(m);

        auditService.log("CONTRIBUTION_VALIDATE", "Contribution", id,
                "Cotisation de " + m.fullName() + " (" + c.getAmount() + " " + c.getMethod() + ") verifiee et encaissee pour "
                        + c.getEvent().getReference()
                        + (c.getReceiptReference() == null ? "" : " - recu " + c.getReceiptReference())
                        + " - compteur cycle : " + memberService.cycleFor(m) + "/" + memberService.requiredFor(m));
        return eventService.contributionView(c);
    }

    @Transactional
    public EventDtos.ContributionView reject(Long id, String reason) {
        Contribution c = contributionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Cotisation introuvable"));
        eventService.get(c.getEvent().getId());
        if (c.getStatus() != ContributionStatus.PENDING)
            throw ApiException.badRequest("Seule une cotisation en attente peut être rejetée.");
        c.setStatus(ContributionStatus.REJECTED);
        c.setRejectionReason(reason);
        c.setValidatedAt(Instant.now());
        c.setValidatedBy(currentUser.id());
        contributionRepository.save(c);
        auditService.log("CONTRIBUTION_REJECT", "Contribution", id, "Rejet de la cotisation de " + c.getMember().fullName());
        return eventService.contributionView(c);
    }

    @Transactional
    public EventDtos.ContributionView invalidate(Long id, String reason) {
        Contribution c = contributionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Cotisation introuvable"));
        eventService.get(c.getEvent().getId());
        if (c.getStatus() != ContributionStatus.VALIDATED)
            throw ApiException.badRequest("Seule une cotisation validée peut être invalidée.");
        Member member = c.getMember();
        BigDecimal previousAmount = c.getAmount();
        String previousReceipt = c.getReceiptReference();
        memberService.decrementValidatedContribution(member);
        c.setStatus(ContributionStatus.INVALIDATED);
        c.setValidatedAt(null);
        c.setValidatedBy(null);
        c.setPaymentReceived(false);
        c.setPaymentReceivedAt(null);
        c.setPaymentReceivedBy(null);
        c.setReceiptReference(null);
        c.setRejectionReason(reason == null || reason.isBlank() ? "Validation annulée par le responsable des cotisations." : reason.trim());
        contributionRepository.save(c);
        notificationService.notifyMember(member, "CONTRIBUTION_INVALIDATED", "Cotisation invalidée",
                "Votre cotisation pour " + c.getEvent().getReference() + " a été invalidée et doit être corrigée.", "Contribution", c.getId());
        auditService.log("CONTRIBUTION_INVALIDATE", "Contribution", id,
                "Annulation de la validation de " + member.fullName() + " pour " + previousAmount + " FCFA"
                        + (previousReceipt == null ? "" : " · reçu " + previousReceipt)
                        + (reason == null || reason.isBlank() ? "" : " : " + reason.trim()));
        return eventService.contributionView(c);
    }

    @Transactional
    public EventDtos.ContributionView editInvalidated(Long id, EventDtos.EditInvalidatedContributionRequest req) {
        Contribution c = contributionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Cotisation introuvable"));
        eventService.get(c.getEvent().getId());
        if (c.getStatus() != ContributionStatus.INVALIDATED)
            throw ApiException.badRequest("La cotisation doit être invalidée avant de pouvoir être corrigée.");
        if (req.proofPhotoUrl() == null || req.proofPhotoUrl().isBlank())
            throw ApiException.badRequest("Ajoutez une photo comme preuve de cotisation.");
        ensureMinimumAmount(req.amount());
        ContributionMethod method;
        try { method = req.method() == null ? c.getMethod() : ContributionMethod.valueOf(req.method().toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw ApiException.badRequest("Mode de paiement invalide"); }
        BigDecimal previousAmount = c.getAmount();
        c.setAmount(req.amount());
        c.setMethod(method);
        c.setNote(req.note());
        c.setProofPhotoUrl(req.proofPhotoUrl());
        c.setProofPhotoShape("CIRCLE".equalsIgnoreCase(req.proofPhotoShape()) ? "CIRCLE" : "SQUARE");
        c.setStatus(ContributionStatus.PENDING);
        c.setSubmittedAt(Instant.now());
        c.setRejectionReason(null);
        c.setPaymentReceived(false);
        c.setPaymentReceivedAt(null);
        c.setPaymentReceivedBy(null);
        c.setReceiptReference(null);
        contributionRepository.save(c);
        notificationService.notifyValidators("Cotisation corrigée à vérifier", c.getMember().fullName() + " a corrigé une cotisation pour " + c.getEvent().getReference() + ".", "Contribution", c.getId());
        auditService.log("CONTRIBUTION_EDIT_INVALIDATED", "Contribution", id, "Correction d'une cotisation invalidée de " + previousAmount + " à " + req.amount() + " " + method);
        return eventService.contributionView(c);
    }

    private void ensureMinimumAmount(BigDecimal amount) {
        BigDecimal minimum = new BigDecimal(settingService.get(SettingService.RULES_MIN_AMOUNT)).max(BigDecimal.ONE);
        if (amount == null || amount.compareTo(minimum) < 0)
            throw ApiException.badRequest("Le montant de cotisation doit être au moins de " + minimum.toPlainString() + " FCFA.");
    }

    public List<EventDtos.ContributionView> byEvent(Long eventId) {
        return contributionRepository.findByEventIdOrderBySubmittedAtAsc(eventId).stream()
                .map(eventService::contributionView).toList();
    }

    public List<EventDtos.EventParticipantView> eventParticipants(Long eventId) {
        AssistanceEvent event = eventService.get(eventId);
        var contributions = contributionRepository.findByEventIdOrderBySubmittedAtAsc(eventId).stream()
                .collect(java.util.stream.Collectors.toMap(c -> c.getMember().getId(), c -> c, (a, b) -> b));
        return groupMembershipRepository.findAllByGroupIdAndActiveTrueOrderByMemberFirstNameAsc(event.getGroup().getId()).stream()
                .filter(membership -> membership.getMember().isActive())
                .map(membership -> {
                    Member member = membership.getMember();
                    Contribution contribution = contributions.get(member.getId());
                    return new EventDtos.EventParticipantView(member.getId(), member.fullName(), member.getPhone(),
                            member.getPhotoUrl(), member.getPhotoShape(), contribution == null ? null : eventService.contributionView(contribution));
                }).toList();
    }

    public List<EventDtos.ContributionView> mine() {
        return contributionRepository.findAllByEvent_Group_IdAndMember_IdOrderBySubmittedAtDesc(currentUser.requireGroupId(), currentUser.id()).stream()
                .map(eventService::contributionView).toList();
    }

    public List<EventDtos.ContributionView> byMember(Long memberId) {
        memberService.get(memberId);
        return contributionRepository.findAllByEvent_Group_IdAndMember_IdOrderBySubmittedAtDesc(currentUser.requireGroupId(), memberId).stream()
                .map(eventService::contributionView).toList();
    }

    public List<EventDtos.ContributionView> pending() {
        return contributionRepository.findAllByEventGroup(currentUser.requireGroupId()).stream()
                .filter(c -> c.getStatus() == ContributionStatus.PENDING || c.getStatus() == ContributionStatus.INVALIDATED)
                .map(eventService::contributionView).toList();
    }

    public List<EventDtos.ContributionView> validated() {
        return contributionRepository.findAllByEventGroupAndStatus(currentUser.requireGroupId(), ContributionStatus.VALIDATED).stream()
                .map(eventService::contributionView).toList();
    }
}
