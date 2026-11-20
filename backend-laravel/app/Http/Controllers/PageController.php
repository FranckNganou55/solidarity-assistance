<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

/** Selects the Blade page for each browser route. */
class PageController extends Controller
{
    public function landing(): View
    {
        return view('pages.landing');
    }

    public function login(Request $request): View
    {
        return view('auth.login', ['selectedGroup' => $request->query('group')]);
    }

    public function workspace(Request $request, string $path): View
    {
        if (preg_match('#^events/(\d+)$#', trim($path, '/'), $matches)) {
            return view('pages.workspace', ['page' => 'eventDetail', 'eventId' => (int) $matches[1]]);
        }

        $page = match (trim($path, '/')) {
            'dashboard', 'home' => 'home',
            'myStats' => 'myStats',
            'assistances' => 'assistances',
            'events' => 'events',
            'contributions' => 'contributions',
            'requests' => 'requests',
            'members' => 'members',
            'archives' => 'archives',
            'board' => 'board',
            'types' => 'types',
            'audit' => 'audit',
            'roles' => 'roles',
            'assignments' => 'assignments',
            'groups' => 'groups',
            'settings' => 'settings',
            'profile' => 'profile',
            default => abort(404),
        };

        return view('pages.workspace', ['page' => $page]);
    }
}
