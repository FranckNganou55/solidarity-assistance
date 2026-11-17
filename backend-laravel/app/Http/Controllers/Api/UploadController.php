<?php

namespace App\Http\Controllers\Api;

use App\Services\GroupAccessService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController
{
    public function __construct(private readonly GroupAccessService $groupAccess) {}

    private function save(Request $r, string $key, array $types): string
    {
        $r->validate([$key => 'required|file|max:5120|mimes:'.implode(',', $types)]);
        $file = $r->file($key);
        $name = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $path = Storage::disk('public')->putFileAs('uploads', $file, $name);
        abort_unless($path, 500, 'Impossible de stocker le fichier téléversé.');

        return '/uploads/'.$name;
    }

    private function savePrivateDocument(Request $r): string
    {
        $r->validate(['file' => 'required|file|max:5120|mimes:pdf,doc,docx,xls,xlsx,png,jpg,jpeg,webp']);
        $file = $r->file('file');
        $name = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $encryptedContents = Crypt::encryptString((string) file_get_contents($file->getRealPath()));
        $path = Storage::disk('local')->put('private-uploads/'.$name, $encryptedContents);
        abort_unless($path, 500, 'Impossible de stocker le fichier téléversé.');

        return '/api/files/'.$name;
    }

    public function image(Request $r)
    {
        return response()->json(['url' => $this->save($r, 'file', ['png', 'jpg', 'jpeg', 'webp'])]);
    }

    public function document(Request $r)
    {
        $this->groupAccess->resolveGroup($r);
        $member = $r->attributes->get('member');
        $canUploadDocument = $member->super_admin;
        foreach (['REQUEST_CREATE', 'CONTRIBUTION_SUBMIT', 'EVENT_CREATE', 'EVENT_EDIT', 'EVENT_EDIT_CLOSED'] as $permission) {
            $canUploadDocument = $canUploadDocument || $this->groupAccess->allows($r, $permission);
        }
        abort_unless($canUploadDocument, 403, 'Aucune habilitation ne permet de déposer un justificatif.');

        return response()->json(['url' => $this->savePrivateDocument($r)]);
    }

    public function privateFile(Request $r, string $filename)
    {
        abort_unless(preg_match('/^[a-f0-9-]{36}\.(pdf|doc|docx|xls|xlsx|png|jpg|jpeg|webp)$/i', $filename), 404);
        $member = $r->attributes->get('member');
        $groupId = (int) $r->header('X-Group-Id', 0);
        abort_unless($groupId > 0, 404);
        if (! $member->super_admin) {
            abort_unless(DB::table('group_members')->where(['member_id' => $member->id, 'group_id' => $groupId, 'active' => true])->exists(), 404);
        }

        $url = '/api/files/'.$filename;
        $isReferenced = false;

        if (DB::table('events')->where(['group_id' => $groupId, 'supporting_document_url' => $url])->exists()) {
            $this->groupAccess->authorize($r, 'EVENT_VIEW');
            $isReferenced = true;
        }

        $request = DB::table('assistance_requests')->where(['group_id' => $groupId, 'document_url' => $url])->first();
        if ($request) {
            $isOwner = (int) $request->member_id === (int) $member->id;
            $canReview = collect(['REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT'])
                ->contains(fn (string $permission): bool => $this->groupAccess->allows($r, $permission));
            abort_unless($isOwner || $canReview, 404);
            $isReferenced = true;
        }

        $contribution = DB::table('contributions as c')
            ->join('events as e', 'e.id', '=', 'c.event_id')
            ->where(['e.group_id' => $groupId, 'c.proof_photo_url' => $url])
            ->select('c.member_id')
            ->first();
        if ($contribution) {
            $isOwner = (int) $contribution->member_id === (int) $member->id;
            $canReview = collect(['CONTRIBUTION_VIEW_ALL', 'CONTRIBUTION_VALIDATE', 'CONTRIBUTION_REJECT'])
                ->contains(fn (string $permission): bool => $this->groupAccess->allows($r, $permission));
            abort_unless($isOwner || $canReview, 404);
            $isReferenced = true;
        }

        abort_unless($isReferenced, 404);
        $path = 'private-uploads/'.$filename;
        abort_unless(Storage::disk('local')->exists($path), 404);

        $contents = Crypt::decryptString(Storage::disk('local')->get($path));

        return response()->streamDownload(static function () use ($contents): void {
            echo $contents;
        }, $filename, [
            'Cache-Control' => 'private, no-store',
            'Content-Type' => 'application/octet-stream',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function logo(Request $r)
    {
        $group = (int) $r->header('X-Group-Id', 0);
        abort_unless($group > 0, 400, 'Sélectionnez un groupe.');
        $member = $r->attributes->get('member');
        if (! $member->super_admin) {
            $this->groupAccess->authorize($r, 'SETTINGS_MANAGE');
        }
        abort_unless(DB::table('association_groups')->where(['id' => $group, 'active' => true])->exists(), 404);
        $url = $this->save($r, 'file', ['png', 'jpg', 'jpeg', 'webp', 'svg']);
        DB::table('association_groups')->where('id', $group)->update(['logo_url' => $url]);

        return response()->json(['logoUrl' => $url]);
    }
}
