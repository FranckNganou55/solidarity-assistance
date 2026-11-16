package cm.makenene.solidarite.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public class EventDtos {

    public record EventView(
            Long id, String reference, Long typeId, String typeName, String typeIcon,
            Long beneficiaryId, String beneficiaryName, String beneficiaryPhone, String beneficiaryPhotoUrl,
            String description, String status, LocalDate closingDate, boolean contributionsOpen,
            long daysLeft, int contributionCount, BigDecimal collectedAmount, BigDecimal targetAmount,
            Long createdBy, String createdByName, Instant createdAt, Instant requestedAt, Instant closedAt, String closedByName,
            ContributionView myContribution, boolean eligibilityOverridden, String eligibilityOverrideByName,
            String supportingDocumentUrl, String beneficiaryPhotoShape) {}

    public record EventCreateRequest(
            @NotNull(message = "Le type d'assistance est obligatoire") Long typeId,
            @NotNull(message = "Le beneficiaire est obligatoire") Long beneficiaryId,
            @NotBlank(message = "Le motif est obligatoire") String description,
            LocalDate closingDate, BigDecimal targetAmount, Boolean overrideEligibility, String supportingDocumentUrl) {}

    public record EventUpdateRequest(String description, LocalDate closingDate, BigDecimal targetAmount, String supportingDocumentUrl) {}

    public record CloseRequest(LocalDate closingDate, String comment) {}

    public record CancelRequest(String reason) {}

    public record ContributionView(
            Long id, Long eventId, String eventReference, String eventTypeName,
            Long memberId, String memberName, String memberPhone, String memberPhotoUrl,
            BigDecimal amount, String method, String status, String note, Integer cycleNumber,
            Instant submittedAt, Instant validatedAt, String validatedByName, String rejectionReason,
            LocalDate eventClosingDate, String eventStatus,
            boolean paymentReceived, String receiptReference, Instant paymentReceivedAt,
            String paymentReceivedByName, String proofPhotoUrl, String proofPhotoShape, String memberPhotoShape) {}

    public record ContributionSubmitRequest(
            @NotNull @DecimalMin(value = "1.0", message = "Le montant doit etre positif") BigDecimal amount,
            String method, String note, String proofPhotoUrl, String proofPhotoShape) {}

    /** Validation par le tresorier : il doit confirmer avoir percu l'argent du membre. */
    public record ValidateContributionRequest(Boolean paymentReceived, String receiptReference, String comment) {}

    public record InvalidateContributionRequest(String comment) {}

    public record EditInvalidatedContributionRequest(
            @NotNull @DecimalMin(value = "1.0", message = "Le montant doit être positif") BigDecimal amount,
            String method, String note, String proofPhotoUrl, String proofPhotoShape) {}

    public record RequestView(
            Long id, Long memberId, String memberName, String memberPhone, String memberPhotoUrl,
            Long typeId, String typeName, String typeIcon, String reason, String status, boolean eligible,
            Integer cycleCountAtRequest, Integer minRequiredAtRequest, String decisionComment,
            Long eventId, String eventReference, Instant createdAt, Instant decidedAt, String decidedByName,
            String documentUrl, String memberPhotoShape) {}

    public record EventParticipantView(Long memberId, String memberName, String phone, String photoUrl, String photoShape,
                                       ContributionView contribution) {}

    public record RequestCreateRequest(
            @NotNull(message = "Le type d'assistance est obligatoire") Long typeId,
            @NotBlank(message = "Le motif est obligatoire") String reason, String documentUrl) {}

    public record ApproveRequest(LocalDate closingDate, BigDecimal targetAmount, String comment, Boolean overrideEligibility) {}

    public record RejectRequest(String comment) {}
}
