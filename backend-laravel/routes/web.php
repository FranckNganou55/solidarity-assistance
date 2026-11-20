<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\PageController;

Route::get('/', [PageController::class, 'landing'])->name('landing');
Route::get('/login', [PageController::class, 'login'])->name('login');
Route::get('/actuator/health', fn () => response()->json(['status' => 'UP']));

Route::get('/uploads/{filename}', function (string $filename) {
    abort_unless(preg_match('/^[A-Za-z0-9_.-]+$/', $filename), 404);
    $path = 'uploads/'.$filename;
    abort_unless(Storage::disk('public')->exists($path), 404);

    return response()->file(Storage::disk('public')->path($path));
})->where('filename', '[A-Za-z0-9_.-]+');

Route::get('/{path}', [PageController::class, 'workspace'])
    ->where('path', '^(?!api(?:/|$)|uploads(?:/|$)|actuator(?:/|$)).*$')
    ->name('workspace');
