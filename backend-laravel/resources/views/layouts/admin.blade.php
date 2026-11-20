@extends('layouts.application')

@section('title', 'Makénéné Solidarité')

@section('content')
<div class="app-shell" id="admin-shell">
    <div class="mobile-scrim" data-action="close-mobile-nav"></div>
    <aside class="sidebar">
        <a class="brand" href="/dashboard">
            <img src="/logo-fm-mak.jpeg" alt="Logo Makénéné Solidarité">
            <div><strong data-group-name>Makénéné Solidarité</strong><small>Espace association</small></div>
        </a>
        <nav aria-label="Menu principal">
            <section class="nav-section" data-nav-section="overview">
                <h3 data-i18n="overview">Vue générale</h3>
                <a class="nav-link" href="/dashboard" data-nav="home"><span>⌂</span><span data-i18n="home">Accueil</span></a>
                <a class="nav-link" href="/myStats" data-nav="myStats"><span>▥</span><span data-i18n="myStats">Mes statistiques</span></a>
                <a class="nav-link" href="/assistances" data-nav="assistances" data-permission="EVENT_VIEW"><span>♡</span><span data-i18n="assistances">Assistances</span></a>
                <a class="nav-link" href="/events" data-nav="events" data-permission="EVENT_VIEW"><span>▣</span><span data-i18n="events">Évènements</span></a>
                <a class="nav-link" href="/contributions" data-nav="contributions" data-permission="CONTRIBUTION_VIEW"><span>↗</span><span data-i18n="contributions">Cotisations</span></a>
                <a class="nav-link" href="/requests" data-nav="requests" data-permission="REQUEST_CREATE"><span>▤</span><span data-i18n="requests">Demandes</span></a>
            </section>
            <section class="nav-section" data-nav-section="management">
                <h3 data-i18n="management">Gestion</h3>
                <a class="nav-link" href="/members" data-nav="members" data-permission="MEMBER_VIEW"><span>♙</span><span data-i18n="members">Membres</span></a>
                <a class="nav-link" href="/archives" data-nav="archives" data-permission="MEMBER_VIEW"><span>▣</span><span data-i18n="archives">Archives</span></a>
                <a class="nav-link" href="/types" data-nav="types" data-permission="ASSISTANCE_TYPE_VIEW"><span>◇</span><span data-i18n="types">Types d’assistance</span></a>
                <a class="nav-link" href="/audit" data-nav="audit" data-permission="AUDIT_VIEW"><span>◷</span><span data-i18n="audit">Journal d’audit</span></a>
            </section>
            <section class="nav-section" data-nav-section="administration">
                <h3 data-i18n="administration">Administration</h3>
                <a class="nav-link" href="/board" data-nav="board" data-permission="MEMBER_EDIT"><span>♙</span><span data-i18n="board">Membres du bureau</span></a>
                <a class="nav-link" href="/roles" data-nav="roles" data-permission="ROLE_VIEW"><span>♧</span><span data-i18n="roles">Rôles et permissions</span></a>
                <a class="nav-link" href="/assignments" data-nav="assignments" data-permission="ROLE_ASSIGN"><span>⇄</span><span data-i18n="assignments">Affectations des rôles</span></a>
                <a class="nav-link" href="/groups" data-nav="groups" data-super-admin><span>▦</span><span data-i18n="groups">Groupes et associations</span></a>
            </section>
            <section class="nav-section nav-bottom">
                <a class="nav-link" href="/settings" data-nav="settings" data-permission="SETTINGS_VIEW"><span>⚙</span><span data-i18n="settings">Paramètres</span></a>
                <a class="nav-link" href="/profile" data-nav="profile"><span>◎</span><span data-i18n="profile">Profil</span></a>
            </section>
        </nav>
        <div class="side-account">
            <div class="avatar" data-avatar>JM</div>
            <div class="account-copy"><strong data-member-name></strong><small data-member-role></small></div>
            <button class="icon-button logout" type="button" data-action="logout" title="Se déconnecter">↪</button>
        </div>
    </aside>
    <div class="main-column">
        <header class="topbar">
            <button class="icon-button hamburger" type="button" data-action="open-mobile-nav" aria-label="Ouvrir le menu">☰</button>
            <div class="top-title"><strong data-page-title></strong><small data-active-group></small></div>
            <div class="top-actions">
                <label class="group-picker" data-group-picker hidden>
                    <img src="/logo-fm-mak.jpeg" alt="">
                    <span><small data-i18n="activeGroup">Groupe actif</small><strong data-group-name>Makénéné Solidarité</strong></span>
                    <select data-action="select-group" aria-label="Groupe"></select><b>⌄</b>
                </label>
                <span class="group-static" data-group-static hidden><img src="/logo-fm-mak.jpeg" alt=""><span data-group-name></span></span>
                <button class="icon-button notification-button" type="button" data-action="notifications" title="Notifications">🔔<i data-unread hidden></i></button>
                <button class="icon-button lang-toggle" type="button" data-action="language">FR</button>
                <button class="icon-button" type="button" data-action="theme" title="Thème">☼</button>
                <a class="avatar avatar-top" href="/profile" data-profile-avatar aria-label="Profil">JM</a>
            </div>
        </header>
        <main class="content">
            <div class="action-wrap notification-anchor">
                <div class="notification-popover" data-notification-popover hidden></div>
            </div>
            <div id="toast-region" aria-live="polite"></div>
            @yield('workspace')
        </main>
    </div>
</div>
@endsection
