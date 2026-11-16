<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController
{
    private function save(Request $r, string $key, array $types): string
    {
        $r->validate([$key => 'required|file|max:5120|mimes:'.implode(',', $types)]);
        $file = $r->file($key);
        $name = Str::uuid()->toString().'.'.$file->getClientOriginalExtension();
        $path = Storage::disk('public')->putFileAs('uploads', $file, $name);
        abort_unless($path, 500, 'Impossible de stocker le fichier téléversé.');

        return '/uploads/'.$name;
    }

    public function image(Request $r)
    {
        return response()->json(['url' => $this->save($r, 'file', ['png', 'jpg', 'jpeg', 'webp'])]);
    }

    public function document(Request $r)
    {
        return response()->json(['url' => $this->save($r, 'file', ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp'])]);
    }

    public function logo(Request $r)
    {
        $url = $this->save($r, 'file', ['png', 'jpg', 'jpeg', 'webp', 'svg']);
        $group = (int) $r->header('X-Group-Id', 0);
        if ($group) {
            DB::table('association_groups')->where('id', $group)->update(['logo_url' => $url]);
        }

        return response()->json(['logoUrl' => $url]);
    }
}
