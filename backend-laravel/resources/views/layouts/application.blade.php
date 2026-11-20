<!doctype html>
<html lang="fr">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#1E6F5C">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">
        <meta name="apple-mobile-web-app-title" content="Makénéné Solidarité">
        <link rel="manifest" href="/manifest.webmanifest">
        <link rel="icon" type="image/jpeg" href="/logo-fm-mak.jpeg">
        <link rel="apple-touch-icon" href="/icons/icon-192.png">
        <link rel="stylesheet" href="{{ asset('build/assets/app.css') }}">
        <title>@yield('title', 'Makénéné Solidarité')</title>
        @stack('head')
    </head>
    <body data-initial-page="{{ $initialPage ?? 'landing' }}">
        @yield('content')
        <script type="module" src="{{ asset('build/assets/app.js') }}"></script>
    </body>
</html>
