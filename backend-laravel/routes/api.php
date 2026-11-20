<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\SolidarityController;
use App\Http\Controllers\Api\UploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('public')->group(function () {
    Route::get('/groups', [AdminController::class, 'publicGroups']);
    Route::get('/settings', [AdminController::class, 'publicSettings']);
});
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('api.auth')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::put('/auth/me/photo', [AuthController::class, 'updateProfilePhoto']);
    Route::get('/auth/me/summary', [AdminController::class, 'mySummary']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::get('/groups', [AuthController::class, 'groups']);
    Route::post('/groups', [GroupController::class, 'create']);
    Route::get('/groups/manage', [GroupController::class, 'index']);
    Route::get('/groups/members/directory', [GroupController::class, 'memberDirectory']);
    Route::put('/groups/{groupId}', [GroupController::class, 'update']);
    Route::delete('/groups/{groupId}', [GroupController::class, 'delete']);
    Route::post('/groups/{groupId}/members', [GroupController::class, 'addMember']);

    Route::get('/members', [AdminController::class, 'members']);
    Route::get('/members/{id}', [AdminController::class, 'memberDetail']);
    Route::post('/members', [AdminController::class, 'createMember']);
    Route::put('/members/{id}', [AdminController::class, 'updateMember']);
    Route::put('/members/{id}/role', [AdminController::class, 'assignRole']);
    Route::put('/members/{id}/permissions', [AdminController::class, 'updateMemberPermissions']);
    Route::put('/members/{id}/status', [AdminController::class, 'memberStatus']);
    Route::delete('/members/{id}', [AdminController::class, 'deleteMember']);
    Route::post('/members/{id}/reset-password', [AdminController::class, 'resetPassword']);
    Route::post('/members/{id}/reset-cycle', [AdminController::class, 'resetCycle']);
    Route::get('/members/{id}/contributions', [SolidarityController::class, 'memberContributions']);

    Route::get('/roles', [AdminController::class, 'roles']);
    Route::get('/permissions', [AdminController::class, 'permissions']);
    Route::post('/roles', [AdminController::class, 'createRole']);
    Route::put('/roles/{id}', [AdminController::class, 'updateRole']);
    Route::delete('/roles/{id}', [AdminController::class, 'deleteRole']);
    Route::get('/assistance-types', [AdminController::class, 'types']);
    Route::post('/assistance-types', [AdminController::class, 'createType']);
    Route::put('/assistance-types/{id}', [AdminController::class, 'updateType']);
    Route::delete('/assistance-types/{id}', [AdminController::class, 'deleteType']);
    Route::get('/administration/bureau', [AdminController::class, 'bureau']);
    Route::post('/administration/bureau', [AdminController::class, 'appointBureau']);
    Route::put('/administration/bureau/replace', [AdminController::class, 'replaceBureau']);
    Route::put('/administration/bureau/{memberId}', [AdminController::class, 'updateBureauPosition']);
    Route::delete('/administration/bureau/{memberId}', [AdminController::class, 'removeBureau']);
    Route::get('/settings', [AdminController::class, 'settings']);
    Route::get('/settings/permission-groups', [AdminController::class, 'permissionGroups']);
    Route::put('/settings', [AdminController::class, 'updateSettings']);

    Route::get('/notifications', [AdminController::class, 'notifications']);
    Route::post('/notifications/read-all', [AdminController::class, 'readAllNotifications']);
    Route::post('/notifications/{id}/read', [AdminController::class, 'readNotification']);
    Route::get('/stats/dashboard', [AdminController::class, 'dashboard']);
    Route::get('/audit-logs', [AdminController::class, 'audit']);
    Route::get('/events', [SolidarityController::class, 'events']);
    Route::get('/events/recent', [SolidarityController::class, 'recent']);
    Route::get('/events/{id}', [SolidarityController::class, 'event']);
    Route::get('/events/{id}/contributions', [SolidarityController::class, 'eventContributions']);
    Route::get('/events/{id}/participants', [SolidarityController::class, 'participants']);
    Route::post('/events', [SolidarityController::class, 'createEvent']);
    Route::put('/events/{id}', [SolidarityController::class, 'updateEvent']);
    Route::post('/events/{id}/close', [SolidarityController::class, 'closeEvent']);
    Route::post('/events/{id}/reopen', [SolidarityController::class, 'reopenEvent']);
    Route::post('/events/{id}/cancel', [SolidarityController::class, 'cancelEvent']);
    Route::post('/events/{id}/contributions', [SolidarityController::class, 'submitContribution']);
    Route::get('/contributions/mine', [SolidarityController::class, 'myContributions']);
    Route::get('/contributions/pending', [SolidarityController::class, 'pendingContributions']);
    Route::get('/contributions/validated', [SolidarityController::class, 'validatedContributions']);
    Route::post('/contributions/{id}/validate', [SolidarityController::class, 'verifyContribution']);
    Route::post('/contributions/{id}/reject', [SolidarityController::class, 'rejectContribution']);
    Route::post('/contributions/{id}/invalidate', [SolidarityController::class, 'invalidateContribution']);
    Route::put('/contributions/{id}', [SolidarityController::class, 'editInvalidated']);
    Route::get('/requests', [SolidarityController::class, 'requests']);
    Route::post('/requests', [SolidarityController::class, 'createRequest']);
    Route::post('/requests/{id}/approve', [SolidarityController::class, 'approveRequest']);
    Route::post('/requests/{id}/reject', [SolidarityController::class, 'rejectRequest']);
    Route::post('/uploads', [UploadController::class, 'image']);
    Route::post('/uploads/document', [UploadController::class, 'document']);
    Route::get('/files/{filename}', [UploadController::class, 'privateFile'])->where('filename', '[A-Za-z0-9_.-]+');
    Route::post('/settings/logo', [UploadController::class, 'logo']);
});
