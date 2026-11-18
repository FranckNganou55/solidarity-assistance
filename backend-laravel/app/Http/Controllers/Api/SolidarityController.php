<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\ApproveAssistanceRequest;
use App\Http\Requests\StoreAssistanceRequest;
use App\Http\Requests\SubmitContributionRequest;
use App\Http\Resources\AssistanceEventResource;
use App\Http\Resources\ContributionResource;
use App\Services\ContributionWorkflowService;
use App\Services\GroupAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SolidarityController
{
    public function __construct(
        private readonly GroupAccessService $groupAccess,
        private readonly ContributionWorkflowService $contributions,
    ) {}

    private function who(Request $r): object
    {
        return $r->attributes->get('member');
    }

    private function group(Request $r): int
    {
        return $this->groupAccess->resolveGroup($r);
    }

    private function can(Request $r, string $p): bool
    {
        return $this->groupAccess->allows($r, $p);
    }

    private function need(Request $r, string $p): void
    {
        $this->groupAccess->authorize($r, $p);
    }

    private function cycle(int $member, int $group): array
    {
        $gm = DB::table('group_members')->where(['member_id' => $member, 'group_id' => $group])->first();
        $m = DB::table('members')->where('id', $member)->first();

        return [(int) ($gm?->cycle_contributions ?? 0), (int) ($gm?->required_assistances_override ?? DB::table('association_groups')->where('id', $group)->value('min_assistances_required') ?? 0), (int) ($gm?->total_contributions ?? 0)];
    }

    public function events(Request $r)
    {
        $this->need($r, 'EVENT_VIEW');
        $g = $this->group($r);
        $q = trim((string) $r->query('q', ''));
        $page = max(0, (int) $r->query('page', 0));
        $size = min(100, max(1, (int) $r->query('size', 20)));
        $base = DB::table('events as e')->join('assistance_types as t', 't.id', '=', 'e.type_id')->join('members as m', 'm.id', '=', 'e.beneficiary_id')->where('e.group_id', $g);
        if ($r->query('status')) {
            $base->where('e.status', $r->query('status'));
        } if ($r->query('typeId')) {
            $base->where('e.type_id', $r->query('typeId'));
        } if ($r->query('beneficiaryId')) {
            $base->where('e.beneficiary_id', $r->query('beneficiaryId'));
        }
        if ($q !== '') {
            $base->where(fn ($w) => $w->whereRaw('lower(e.reference) like ?', ['%'.mb_strtolower($q).'%'])->orWhereRaw('lower(CONCAT(m.first_name, \' \', m.last_name)) like ?', ['%'.mb_strtolower($q).'%'])->orWhere('m.phone', 'like', '%'.$q.'%'));
        }
        $total = (clone $base)->count();
        $items = $base->select('e.*', 't.name as type_name', 't.icon as type_icon', 'm.first_name as beneficiary_first_name', 'm.last_name as beneficiary_last_name', 'm.phone as beneficiary_phone', 'm.photo_url as beneficiary_photo_url', 'm.photo_shape')->orderByDesc('e.created_at')->offset($page * $size)->limit($size)->get();

        return response()->json(['content' => $items->map(fn ($e) => $this->eventDto($e, $r))->values(), 'page' => $page, 'size' => $size, 'totalElements' => $total, 'totalPages' => (int) ceil($total / $size), 'last' => (($page + 1) * $size >= $total)]);
    }

    public function recent(Request $r)
    {
        $this->need($r, 'EVENT_VIEW');

        return response()->json(DB::table('events as e')->join('assistance_types as t', 't.id', '=', 'e.type_id')->join('members as m', 'm.id', '=', 'e.beneficiary_id')->where('e.group_id', $this->group($r))->select('e.*', 't.name as type_name', 't.icon as type_icon', 'm.first_name as beneficiary_first_name', 'm.last_name as beneficiary_last_name', 'm.phone as beneficiary_phone', 'm.photo_url as beneficiary_photo_url', 'm.photo_shape')->orderByDesc('e.created_at')->limit(5)->get()->map(fn ($e) => $this->eventDto($e, $r)));
    }

    public function event(Request $r, int $id)
    {
        $this->need($r, 'EVENT_VIEW');
        $e = DB::table('events as e')->join('assistance_types as t', 't.id', '=', 'e.type_id')->join('members as m', 'm.id', '=', 'e.beneficiary_id')->where(['e.id' => $id, 'e.group_id' => $this->group($r)])->select('e.*', 't.name as type_name', 't.icon as type_icon', 'm.first_name as beneficiary_first_name', 'm.last_name as beneficiary_last_name', 'm.phone as beneficiary_phone', 'm.photo_url as beneficiary_photo_url', 'm.photo_shape')->first();
        if (! $e) {
            abort(404);
        }

        return response()->json($this->eventDto($e, $r));
    }

    private function eventDto(object $e, Request $r): array
    {
        $mine = DB::table('contributions')->where(['event_id' => $e->id, 'member_id' => $this->who($r)->id])->first();
        $count = DB::table('contributions')->where('event_id', $e->id)->count();
        $sum = DB::table('contributions')->where(['event_id' => $e->id, 'status' => 'VALIDATED'])->sum('amount');
        $closedBy = $e->closed_by ? DB::table('members')->where('id', $e->closed_by)->value(DB::raw("CONCAT(first_name, ' ', last_name)")) : null;
        $by = $e->eligibility_override_by ? DB::table('members')->where('id', $e->eligibility_override_by)->value(DB::raw("CONCAT(first_name, ' ', last_name)")) : null;

        return AssistanceEventResource::make(['id' => (int) $e->id, 'reference' => $e->reference, 'typeId' => (int) $e->type_id, 'typeName' => $e->type_name, 'typeIcon' => $e->type_icon, 'beneficiaryId' => (int) $e->beneficiary_id, 'beneficiaryName' => trim($e->beneficiary_first_name.' '.$e->beneficiary_last_name), 'beneficiaryPhone' => $e->beneficiary_phone, 'beneficiaryPhotoUrl' => $e->beneficiary_photo_url, 'description' => $e->description, 'status' => $e->status, 'closingDate' => $e->closing_date, 'contributionsOpen' => $e->status === 'OPEN' && (! $e->closing_date || $e->closing_date >= now()->toDateString()), 'daysLeft' => $e->closing_date ? now()->startOfDay()->diffInDays($e->closing_date, false) : -1, 'contributionCount' => $count, 'collectedAmount' => (float) $sum, 'targetAmount' => $e->target_amount, 'createdBy' => $e->created_by, 'createdByName' => null, 'createdAt' => $e->created_at, 'requestedAt' => $e->requested_at ?? $e->created_at, 'closedAt' => $e->closed_at, 'closedByName' => $closedBy, 'myContribution' => $mine ? $this->contributionDto($mine) : null, 'eligibilityOverridden' => (bool) $e->eligibility_overridden, 'eligibilityOverrideByName' => $by, 'supportingDocumentUrl' => $e->supporting_document_url, 'beneficiaryPhotoShape' => $e->photo_shape ?? 'CIRCLE'])->resolve();
    }

    private function contributionDto(object $c): array
    {
        $e = DB::table('events as e')->join('assistance_types as t', 't.id', '=', 'e.type_id')->where('e.id', $c->event_id)->select('e.reference', 'e.closing_date', 'e.status', 't.name as type_name')->first();
        $m = DB::table('members')->where('id', $c->member_id)->first();
        $v = $c->validated_by ? DB::table('members')->where('id', $c->validated_by)->value(DB::raw("CONCAT(first_name, ' ', last_name)")) : null;
        $pr = $c->payment_received_by ? DB::table('members')->where('id', $c->payment_received_by)->value(DB::raw("CONCAT(first_name, ' ', last_name)")) : null;

        return ContributionResource::make(['id' => (int) $c->id, 'eventId' => (int) $c->event_id, 'eventReference' => $e->reference, 'eventTypeName' => $e->type_name, 'memberId' => (int) $m->id, 'memberName' => trim($m->first_name.' '.$m->last_name), 'memberPhone' => $m->phone, 'memberPhotoUrl' => $m->photo_url, 'amount' => (float) $c->amount, 'method' => $c->method, 'status' => $c->status, 'note' => $c->note, 'cycleNumber' => $c->cycle_number, 'submittedAt' => $c->submitted_at, 'validatedAt' => $c->validated_at, 'validatedByName' => $v, 'rejectionReason' => $c->rejection_reason, 'eventClosingDate' => $e->closing_date, 'eventStatus' => $e->status, 'paymentReceived' => (bool) $c->payment_received, 'receiptReference' => $c->receipt_reference, 'paymentReceivedAt' => $c->payment_received_at, 'paymentReceivedByName' => $pr, 'proofPhotoUrl' => $c->proof_photo_url, 'proofPhotoShape' => $c->proof_photo_shape ?? 'SQUARE', 'memberPhotoShape' => $m->photo_shape ?? 'CIRCLE'])->resolve();
    }

    public function eventContributions(Request $r, int $id)
    {
        $this->need($r, 'CONTRIBUTION_VIEW_ALL');
        $g = $this->group($r);
        if (! DB::table('events')->where(['id' => $id, 'group_id' => $g])->exists()) {
            abort(404);
        }

        return response()->json(DB::table('contributions')->where('event_id', $id)->orderBy('submitted_at')->get()->map(fn ($c) => $this->contributionDto($c)));
    }

    public function participants(Request $r, int $id)
    {
        $g = $this->group($r);
        if (! $this->can($r, 'EVENT_VIEW')) {
            abort(403);
        }$e = DB::table('events')->where(['id' => $id, 'group_id' => $g])->first();
        if (! $e) {
            abort(404);
        }

        return response()->json(DB::table('group_members as gm')->join('members as m', 'm.id', '=', 'gm.member_id')->where('gm.group_id', $g)->where(function ($query) use ($id) {
            $query->where(fn ($active) => $active->where('gm.active', true)->where('m.active', true))
                ->orWhereExists(fn ($contribution) => $contribution->selectRaw('1')->from('contributions as c')->whereColumn('c.member_id', 'gm.member_id')->where('c.event_id', $id));
        })->orderBy('m.first_name')->get()->map(function ($gm) use ($id) {
            $c = DB::table('contributions')->where(['event_id' => $id, 'member_id' => $gm->member_id])->first();

            return ['memberId' => (int) $gm->member_id, 'memberName' => trim($gm->first_name.' '.$gm->last_name), 'phone' => $gm->phone, 'photoUrl' => $gm->photo_url, 'photoShape' => $gm->photo_shape ?? 'CIRCLE', 'contribution' => $c ? $this->contributionDto($c) : null];
        }));
    }

    public function createEvent(Request $r)
    {
        $this->need($r, 'EVENT_CREATE');
        $g = $this->group($r);
        $d = $r->validate(['typeId' => 'required|integer', 'beneficiaryId' => 'required|integer', 'description' => 'required|string|max:1000', 'closingDate' => 'nullable|date', 'targetAmount' => 'nullable|numeric|min:0', 'overrideEligibility' => 'nullable|boolean', 'supportingDocumentUrl' => 'nullable|string|max:300']);
        $member = DB::table('members')->where(['id' => $d['beneficiaryId'], 'active' => true])->first();
        $gm = DB::table('group_members')->where(['group_id' => $g, 'member_id' => $member?->id, 'active' => true])->first();
        if (! $gm) {
            abort(404, 'Membre introuvable');
        }
        [$cycle,$required] = $this->cycle($member->id, $g);
        $override = (bool) ($d['overrideEligibility'] ?? false);
        if ($override && ! $this->can($r, 'REQUEST_OVERRIDE_ELIGIBILITY')) {
            abort(403);
        }if ($cycle < $required && ! $override) {
            abort(400, 'Le cycle minimum n’est pas atteint');
        }if (DB::table('events')->where(['group_id' => $g, 'beneficiary_id' => $member->id, 'status' => 'OPEN'])->exists()) {
            abort(409, 'Ce membre a déjà une assistance en cours');
        }
        $type = DB::table('assistance_types')->where(['id' => $d['typeId'], 'group_id' => $g, 'active' => true])->first();
        if (! $type) {
            abort(404, 'Type introuvable');
        }$seq = DB::table('events')->where('group_id', $g)->count() + 1;
        $reference = 'ASS-'.now()->year.'-'.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
        $id = DB::table('events')->insertGetId(['group_id' => $g, 'reference' => $reference, 'type_id' => $type->id, 'beneficiary_id' => $member->id, 'description' => $d['description'], 'status' => 'OPEN', 'closing_date' => $d['closingDate'] ?? null, 'target_amount' => $d['targetAmount'] ?? null, 'created_by' => $r->attributes->get('memberId'), 'requested_at' => now(), 'created_at' => now(), 'eligibility_overridden' => $override, 'eligibility_override_by' => $override ? $r->attributes->get('memberId') : null, 'supporting_document_url' => $d['supportingDocumentUrl'] ?? null]);
        if ($cycle >= $required || $override) {
            DB::table('group_members')->where(['group_id' => $g, 'member_id' => $member->id])->update(['cycle_contributions' => 0]);
        }

        return $this->event($r, $id);
    }

    public function updateEvent(Request $r, int $id)
    {
        $this->need($r, 'EVENT_EDIT');
        $g = $this->group($r);
        $d = $r->validate(['description' => 'nullable|string|max:1000', 'closingDate' => 'nullable|date', 'targetAmount' => 'nullable|numeric|min:0', 'supportingDocumentUrl' => 'nullable|string|max:300']);
        $e = DB::table('events')->where(['id' => $id, 'group_id' => $g])->first();
        if (! $e) {
            abort(404);
        }if ($e->status === 'CLOSED' && ! $this->can($r, 'EVENT_EDIT_CLOSED')) {
            abort(403);
        }
        $updates = ['updated_at' => now()];
        foreach (['description' => 'description', 'closingDate' => 'closing_date', 'targetAmount' => 'target_amount', 'supportingDocumentUrl' => 'supporting_document_url'] as $input => $column) {
            if (array_key_exists($input, $d)) {
                $updates[$column] = $d[$input];
            }
        }
        DB::table('events')->where('id', $id)->update($updates);

        return $this->event($r, $id);
    }

    public function closeEvent(Request $r, int $id)
    {
        $this->need($r, 'EVENT_CLOSE');
        $g = $this->group($r);
        $d = $r->validate(['closingDate' => 'nullable|date']);
        $e = DB::table('events')->where(['id' => $id, 'group_id' => $g])->first();
        if (! $e) {
            abort(404);
        }DB::table('events')->where('id', $id)->update(['status' => 'CLOSED', 'closing_date' => $d['closingDate'] ?? now()->toDateString(), 'closed_at' => now(), 'closed_by' => $r->attributes->get('memberId')]);

        return $this->event($r, $id);
    }

    public function reopenEvent(Request $r, int $id)
    {
        $this->need($r, 'EVENT_REOPEN');
        DB::table('events')->where(['id' => $id, 'group_id' => $this->group($r)])->update(['status' => 'OPEN', 'closed_at' => null, 'closed_by' => null]);

        return $this->event($r, $id);
    }

    public function cancelEvent(Request $r, int $id)
    {
        $this->need($r, 'EVENT_CANCEL');
        DB::table('events')->where(['id' => $id, 'group_id' => $this->group($r)])->update(['status' => 'CANCELLED']);

        return $this->event($r, $id);
    }

    public function contributionLists(Request $r, string $scope)
    {
        $g = $this->group($r);
        $me = $r->attributes->get('memberId');
        $q = DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where('e.group_id', $g);
        if ($scope === 'mine') {
            $q->where('c.member_id', $me);
        } else {
            $this->need($r, 'CONTRIBUTION_VALIDATE');
            $q->where('c.status', $scope === 'pending' ? 'PENDING' : 'VALIDATED');
        }

        return response()->json($q->orderByDesc('c.submitted_at')->get()->map(fn ($c) => $this->contributionDto($c)));
    }

    public function myContributions(Request $r)
    {
        return $this->contributionLists($r, 'mine');
    }

    public function pendingContributions(Request $r)
    {
        return $this->contributionLists($r, 'pending');
    }

    public function validatedContributions(Request $r)
    {
        return $this->contributionLists($r, 'validated');
    }

    public function memberContributions(Request $r, int $id)
    {
        $this->need($r, 'CONTRIBUTION_VIEW_ALL');
        $g = $this->group($r);

        return response()->json(DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where(['e.group_id' => $g, 'c.member_id' => $id])->orderByDesc('c.submitted_at')->get()->map(fn ($c) => $this->contributionDto($c)));
    }

    public function submitContribution(SubmitContributionRequest $r, int $eventId)
    {
        $g = $this->group($r);
        $this->need($r, 'CONTRIBUTION_SUBMIT');
        $d = $r->validated();
        $e = DB::table('events')->where(['id' => $eventId, 'group_id' => $g])->first();
        if (! $e || $e->status !== 'OPEN' || ($e->closing_date && $e->closing_date < now()->toDateString())) {
            abort(400, 'Cotisations fermées');
        }$me = $r->attributes->get('memberId');
        $minimum = (float) DB::table('association_groups')->where('id', $g)->value('min_contribution_amount');
        if ((float) $d['amount'] < $minimum) {
            abort(400, 'Le montant minimum de cotisation n’est pas atteint');
        }if (DB::table('contributions')->where(['event_id' => $eventId, 'member_id' => $me])->exists()) {
            abort(409, 'Vous avez déjà soumis une cotisation');
        }[$cycle] = $this->cycle($me, $g);
        $id = DB::table('contributions')->insertGetId(['event_id' => $eventId, 'member_id' => $me, 'amount' => $d['amount'], 'method' => $d['method'] ?? 'CASH', 'note' => $d['note'] ?? null, 'status' => 'PENDING', 'cycle_number' => $cycle + 1, 'submitted_at' => now(), 'payment_received' => false, 'proof_photo_url' => $d['proofPhotoUrl'], 'proof_photo_shape' => 'SQUARE']);
        DB::table('group_members as gm')->join('role_permissions as rp', 'rp.role_id', '=', 'gm.role_id')->where('gm.group_id', $g)->where('gm.active', true)->where('rp.permission', 'CONTRIBUTION_VALIDATE')->select('gm.member_id')->distinct()->get()->each(function ($v) use ($g, $id) {
            DB::table('app_notifications')->insert(['group_id' => $g, 'recipient_id' => $v->member_id, 'notification_type' => 'CONTRIBUTION_SUBMITTED', 'title' => 'Nouvelle cotisation à vérifier', 'message' => 'Une cotisation a été soumise.', 'entity_type' => 'Contribution', 'entity_id' => $id, 'created_at' => now()]);
        });

        return response()->json($this->contributionDto(DB::table('contributions')->where('id', $id)->first()), 201);
    }

    public function verifyContribution(Request $r, int $id)
    {
        $this->need($r, 'CONTRIBUTION_VALIDATE');
        $d = $r->validate(['paymentReceived' => 'required|accepted', 'receiptReference' => 'nullable|string|max:80', 'comment' => 'nullable|string|max:255']);
        $g = $this->group($r);
        $memberId = $r->attributes->get('memberId');
        $contribution = $this->contributions->validatePending($id, $g, $memberId, $d['receiptReference'] ?? null);

        return response()->json($this->contributionDto(DB::table('contributions')->where('id', $contribution->id)->first()));
    }

    public function invalidateContribution(Request $r, int $id)
    {
        $this->need($r, 'CONTRIBUTION_VALIDATE');
        $g = $this->group($r);
        $comment = $r->validate(['comment' => 'nullable|string|max:255'])['comment'] ?? 'Validation annulée';
        $contribution = $this->contributions->invalidateValidated($id, $g, $comment);

        return response()->json($this->contributionDto(DB::table('contributions')->where('id', $contribution->id)->first()));
    }

    public function rejectContribution(Request $r, int $id)
    {
        $this->need($r, 'CONTRIBUTION_REJECT');
        $d = $r->validate(['comment' => 'nullable|string|max:255']);
        $g = $this->group($r);
        $contribution = $this->contributions->rejectPending($id, $g, (int) $r->attributes->get('memberId'), $d['comment'] ?? null);

        return response()->json($this->contributionDto(DB::table('contributions')->where('id', $contribution->id)->first()));
    }

    public function editInvalidated(Request $r, int $id)
    {
        $g = $this->group($r);
        $d = $r->validate(['amount' => 'required|numeric|min:0', 'method' => 'required|in:CASH,MOBILE_MONEY,TRANSFER', 'note' => 'nullable|string|max:255', 'proofPhotoUrl' => 'required|string|max:300']);
        $c = DB::table('contributions as c')->join('events as e', 'e.id', '=', 'c.event_id')->where(['c.id' => $id, 'e.group_id' => $g])->select('c.*')->first();
        if (! $c || $c->status !== 'INVALIDATED' || $c->member_id != $r->attributes->get('memberId')) {
            abort(403);
        }$minimum = (float) DB::table('association_groups')->where('id', $g)->value('min_contribution_amount');
        if ((float) $d['amount'] < $minimum) {
            abort(400, 'Le montant minimum de cotisation n’est pas atteint');
        }DB::table('contributions')->where('id', $id)->update(['amount' => $d['amount'], 'method' => $d['method'], 'note' => $d['note'] ?? null, 'proof_photo_url' => $d['proofPhotoUrl'], 'proof_photo_shape' => 'SQUARE', 'status' => 'PENDING', 'rejection_reason' => null, 'submitted_at' => now()]);

        return response()->json($this->contributionDto(DB::table('contributions')->where('id', $id)->first()));
    }

    public function requests(Request $r)
    {
        $g = $this->group($r);
        $scope = $r->query('scope', 'mine');
        if ($scope === 'all') {
            $this->need($r, 'REQUEST_VIEW');
        }$q = DB::table('assistance_requests as a')->join('members as m', 'm.id', '=', 'a.member_id')->join('assistance_types as t', 't.id', '=', 'a.type_id')->where('a.group_id', $g);
        if ($scope !== 'all') {
            $q->where('a.member_id', $r->attributes->get('memberId'));
        }

        return response()->json($q->select('a.*', 'm.first_name as member_first_name', 'm.last_name as member_last_name', 'm.phone as member_phone', 'm.photo_url as member_photo_url', 'm.photo_shape', 't.name as type_name', 't.icon as type_icon')->orderByDesc('a.created_at')->get()->map(fn ($a) => ['id' => (int) $a->id, 'memberId' => (int) $a->member_id, 'memberName' => trim($a->member_first_name.' '.$a->member_last_name), 'memberPhone' => $a->member_phone, 'memberPhotoUrl' => $a->member_photo_url, 'typeId' => (int) $a->type_id, 'typeName' => $a->type_name, 'typeIcon' => $a->type_icon, 'reason' => $a->reason, 'status' => $a->status, 'eligible' => (bool) $a->eligible, 'cycleCountAtRequest' => $a->cycle_count_at_request, 'minRequiredAtRequest' => $a->min_required_at_request, 'decisionComment' => $a->decision_comment, 'eventId' => $a->event_id, 'eventReference' => $a->event_id ? DB::table('events')->where('id', $a->event_id)->value('reference') : null, 'createdAt' => $a->created_at, 'decidedAt' => $a->decided_at, 'decidedByName' => null, 'documentUrl' => $a->document_url, 'memberPhotoShape' => $a->photo_shape ?? 'CIRCLE']));
    }

    public function createRequest(StoreAssistanceRequest $r)
    {
        $this->need($r, 'REQUEST_CREATE');
        $g = $this->group($r);
        $d = $r->validated();
        $me = $r->attributes->get('memberId');
        if (! DB::table('assistance_types')->where(['id' => $d['typeId'], 'group_id' => $g, 'active' => true])->exists()) {
            abort(404, 'Type d’assistance introuvable dans ce groupe');
        }
        if (DB::table('assistance_requests')->where(['group_id' => $g, 'member_id' => $me, 'status' => 'PENDING'])->exists()) {
            abort(409, 'Une demande est déjà en attente');
        }[$cycle,$required] = $this->cycle($me, $g);
        $eligible = $cycle >= $required;
        $id = DB::table('assistance_requests')->insertGetId(['group_id' => $g, 'member_id' => $me, 'type_id' => $d['typeId'], 'reason' => $d['reason'], 'document_url' => $d['documentUrl'] ?? null, 'status' => 'PENDING', 'cycle_count_at_request' => $cycle, 'min_required_at_request' => $required, 'eligible' => $eligible, 'created_at' => now()]);

        return response()->json(['id' => $id, 'status' => 'PENDING', 'eligible' => $eligible, 'reason' => $d['reason'], 'createdAt' => now()->toISOString()], 201);
    }

    public function approveRequest(ApproveAssistanceRequest $r, int $id)
    {
        $this->need($r, 'REQUEST_APPROVE');
        $g = $this->group($r);
        $d = $r->validated();
        $a = DB::table('assistance_requests')->where(['id' => $id, 'group_id' => $g])->first();
        if (! $a || $a->status !== 'PENDING') {
            abort(404);
        }$event = $this->createApprovedEvent($r, $a, $d);
        DB::table('assistance_requests')->where('id', $id)->update(['status' => 'APPROVED', 'event_id' => $event['id'], 'decision_comment' => $d['comment'] ?? null, 'decided_by' => $r->attributes->get('memberId'), 'decided_at' => now()]);

        return response()->json(['id' => $id, 'status' => 'APPROVED', 'eventId' => $event['id']]);
    }

    private function createApprovedEvent(Request $r, object $a, array $d): array
    {
        $g = $this->group($r);
        if (! DB::table('assistance_types')->where(['id' => $a->type_id, 'group_id' => $g, 'active' => true])->exists()) {
            abort(404, 'Type d’assistance introuvable dans ce groupe');
        }
        $m = DB::table('members')->where('id', $a->member_id)->first();
        [$cycle,$required] = $this->cycle($m->id, $g);
        $override = (bool) ($d['overrideEligibility'] ?? false);
        if ($cycle < $required && ! $override) {
            abort(400, 'Le membre n’a pas atteint son seuil');
        }if ($override && ! $this->can($r, 'REQUEST_OVERRIDE_ELIGIBILITY')) {
            abort(403);
        }$ref = 'ASS-'.now()->year.'-'.str_pad((string) (DB::table('events')->where('group_id', $g)->count() + 1), 4, '0', STR_PAD_LEFT);
        $eid = DB::table('events')->insertGetId(['group_id' => $g, 'reference' => $ref, 'type_id' => $a->type_id, 'beneficiary_id' => $a->member_id, 'description' => $a->reason, 'supporting_document_url' => $a->document_url, 'status' => 'OPEN', 'closing_date' => $d['closingDate'] ?? null, 'target_amount' => $d['targetAmount'] ?? null, 'created_by' => $r->attributes->get('memberId'), 'requested_at' => $a->created_at, 'created_at' => now(), 'eligibility_overridden' => $override, 'eligibility_override_by' => $override ? $r->attributes->get('memberId') : null]);
        if ($cycle >= $required || $override) {
            DB::table('group_members')->where(['group_id' => $g, 'member_id' => $m->id])->update(['cycle_contributions' => 0]);
        }

        return ['id' => $eid];
    }

    public function rejectRequest(Request $r, int $id)
    {
        $this->need($r, 'REQUEST_REJECT');
        $g = $this->group($r);
        $d = $r->validate(['comment' => 'nullable|string|max:500']);
        DB::table('assistance_requests')->where(['id' => $id, 'group_id' => $g])->update(['status' => 'REJECTED', 'decision_comment' => $d['comment'] ?? null, 'decided_by' => $r->attributes->get('memberId'), 'decided_at' => now()]);

        return response()->json(['id' => $id, 'status' => 'REJECTED']);
    }
}
