@extends('layouts.admin')
@php
$pageTitles = ['home'=>'Accueil','myStats'=>'Mes statistiques','assistances'=>'Assistances','events'=>'Évènements','eventDetail'=>'Détails de l’assistance','contributions'=>'Cotisations','requests'=>'Demandes','members'=>'Membres','archives'=>'Archives','board'=>'Membres du bureau','types'=>'Types d’assistance','audit'=>'Journal d’audit','roles'=>'Rôles et permissions','assignments'=>'Affectations des rôles','groups'=>'Groupes et associations','settings'=>'Paramètres','profile'=>'Profil'];
$title = $pageTitles[$page] ?? 'Espace association';
@endphp
@section('title', $title.' — Makénéné Solidarité')
@section('workspace')
<section class="page-view" data-page="{{ $page }}" @if(isset($eventId)) data-event-id="{{ $eventId }}" @endif>
    <div class="page-heading"><div><h1>{{ $title }}</h1><p data-page-subtitle>Makénéné Solidarité</p></div><div class="page-heading-actions" data-page-actions></div></div>
    <div class="toolbar" data-list-toolbar hidden><input type="search" data-search placeholder="Rechercher par nom ou identifiant…"><select data-status-filter aria-label="Filtrer par statut"><option value="">Tous les statuts</option><option value="OPEN">Ouvert</option><option value="PENDING">En attente</option><option value="VALIDATED">Validé</option><option value="CLOSED">Clôturé</option></select></div>
    <div class="error-banner" data-error hidden></div><div data-page-content><div class="loading-line"><span class="spinner"></span>Chargement…</div></div>
</section>
<div data-modal-root></div>
@endsection
