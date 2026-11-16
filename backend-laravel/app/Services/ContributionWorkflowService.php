<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\Contribution;
use App\Models\GroupMembership;
use Illuminate\Support\Facades\DB;

class ContributionWorkflowService
{
    public function validatePending(int $id, int $groupId, int $actorId, ?string $receiptReference): Contribution
    {
        return DB::transaction(function () use ($id, $groupId, $actorId, $receiptReference): Contribution {
            $contribution = Contribution::query()->with('event')->lockForUpdate()->find($id);
            if (! $contribution || (int) $contribution->event->group_id !== $groupId) {
                abort(404);
            }
            if ($contribution->status !== 'PENDING') {
                abort(409, 'Seule une cotisation en attente peut être validée');
            }

            $contribution->forceFill([
                'status' => 'VALIDATED',
                'validated_at' => now(),
                'validated_by' => $actorId,
                'payment_received' => true,
                'payment_received_at' => now(),
                'payment_received_by' => $actorId,
                'receipt_reference' => $receiptReference,
                'rejection_reason' => null,
            ])->save();

            GroupMembership::query()->where(['group_id' => $groupId, 'member_id' => $contribution->member_id])->increment('cycle_contributions');
            GroupMembership::query()->where(['group_id' => $groupId, 'member_id' => $contribution->member_id])->increment('total_contributions');

            AppNotification::query()->create([
                'group_id' => $groupId,
                'recipient_id' => $contribution->member_id,
                'notification_type' => 'CONTRIBUTION_VALIDATED',
                'title' => 'Cotisation validée',
                'message' => 'Votre cotisation a été validée.',
                'entity_type' => 'Contribution',
                'entity_id' => $contribution->id,
                'created_at' => now(),
            ]);

            return $contribution->refresh();
        });
    }

    public function invalidateValidated(int $id, int $groupId, string $comment): Contribution
    {
        return DB::transaction(function () use ($id, $groupId, $comment): Contribution {
            $contribution = Contribution::query()->with('event')->lockForUpdate()->find($id);
            if (! $contribution || (int) $contribution->event->group_id !== $groupId) {
                abort(404);
            }
            if ($contribution->status !== 'VALIDATED') {
                abort(400, 'Seule une cotisation validée peut être invalidée');
            }

            $contribution->forceFill([
                'status' => 'INVALIDATED',
                'validated_at' => null,
                'validated_by' => null,
                'payment_received' => false,
                'payment_received_at' => null,
                'payment_received_by' => null,
                'receipt_reference' => null,
                'rejection_reason' => $comment,
            ])->save();

            GroupMembership::query()->where(['group_id' => $groupId, 'member_id' => $contribution->member_id])->where('cycle_contributions', '>', 0)->decrement('cycle_contributions');
            GroupMembership::query()->where(['group_id' => $groupId, 'member_id' => $contribution->member_id])->where('total_contributions', '>', 0)->decrement('total_contributions');

            AppNotification::query()->create([
                'group_id' => $groupId,
                'recipient_id' => $contribution->member_id,
                'notification_type' => 'CONTRIBUTION_INVALIDATED',
                'title' => 'Cotisation invalidée',
                'message' => 'Votre cotisation a été invalidée.',
                'entity_type' => 'Contribution',
                'entity_id' => $contribution->id,
                'created_at' => now(),
            ]);

            return $contribution->refresh();
        });
    }

    public function rejectPending(int $id, int $groupId, int $actorId, ?string $comment): Contribution
    {
        $contribution = Contribution::query()->with('event')->find($id);
        if (! $contribution || (int) $contribution->event->group_id !== $groupId) {
            abort(404);
        }
        if ($contribution->status !== 'PENDING') {
            abort(409, 'Seule une cotisation en attente peut être rejetée');
        }

        $contribution->forceFill([
            'status' => 'REJECTED',
            'rejection_reason' => $comment,
            'validated_at' => now(),
            'validated_by' => $actorId,
        ])->save();

        return $contribution;
    }
}
