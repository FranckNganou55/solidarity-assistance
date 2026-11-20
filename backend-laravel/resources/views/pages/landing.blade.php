@extends('layouts.application')
@section('title', 'Makénéné Solidarité — Accueil')
@section('content')
<main class="public-home">
    <header class="public-nav"><a class="public-brand" href="/"><img src="/logo-fm-mak.jpeg" alt=""><span><strong>Makénéné Solidarité</strong><small>Unis pour aider, ensemble pour grandir</small></span></a><nav class="public-links"><a href="#accueil">Accueil</a><a href="#groupes">Groupes</a></nav><div class="public-tools"><button class="public-lang" data-action="language">EN</button><button class="pwa-install-button" data-action="install-app">⇩ Installer</button><a class="public-login" href="/login">Se connecter →</a></div></header>
    <section class="public-hero" id="accueil"><div class="hero-copy"><p class="hero-kicker">PLATEFORME DE SOLIDARITÉ</p><h1>La solidarité,<br>organisée pour chacun.</h1><p class="hero-description">Retrouvez les assistances, les cotisations et la vie de votre groupe dans un même espace.</p><a class="hero-cta" href="#groupes">Découvrir les groupes →</a><div class="hero-points"><span>✓ Un espace sécurisé</span><span>✓ Des cotisations suivies</span><span>✓ Une communauté solidaire</span></div></div></section>
    <section class="public-groups" id="groupes"><div class="groups-heading"><div><p class="section-kicker">ESPACE ASSOCIATIF</p><h2>Choisissez votre groupe</h2><p>Connectez-vous à l’association à laquelle vous appartenez.</p></div><span class="group-count" data-group-count>Chargement…</span></div><input class="group-search" data-group-search placeholder="Rechercher un groupe…"><div class="group-grid" data-public-groups><div class="empty-inline">Chargement des groupes…</div></div></section>
    <footer class="public-footer"><strong>Makénéné Solidarité</strong><span>Une plateforme simple et sécurisée pour gérer la solidarité.</span></footer>
</main>
@endsection
