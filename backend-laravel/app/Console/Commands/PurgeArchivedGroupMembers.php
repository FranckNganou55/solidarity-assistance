<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PurgeArchivedGroupMembers extends Command
{
    protected $signature = 'members:purge-expired-archives';

    protected $description = 'Remove archived group memberships older than five months while preserving member history';

    public function handle(): int
    {
        $deleted = DB::table('group_members as gm')
            ->join('association_groups as ag', 'ag.id', '=', 'gm.group_id')
            ->where('ag.active', true)
            ->where('gm.active', false)
            ->whereNotNull('gm.archived_at')
            ->where('gm.archived_at', '<=', now()->subMonthsNoOverflow(5))
            ->delete();

        $this->info("{$deleted} archived group membership(s) removed.");

        return self::SUCCESS;
    }
}
