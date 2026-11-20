<!doctype html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenue sur {{ $groupName }}</title>
</head>
<body style="margin:0;background:#f7f9fb;color:#263238;font-family:Arial,sans-serif;line-height:1.65">
    <main style="max-width:620px;margin:32px auto;padding:36px 32px;background:#fff;border:1px solid #e5e7eb;border-radius:16px">
        <p style="margin:0 0 8px;color:#1e6f5c;font-weight:700">{{ $groupName }}</p>
        <h1 style="margin:0 0 24px;font-size:24px;color:#172b25">Bienvenue {{ $memberName }},</h1>
        <p>Votre accès à l’espace de votre groupe a été préparé sur notre application de gestion des assistances.</p>
        @if($temporaryPassword)
            <p>Votre compte vient d’être créé. Connectez-vous avec ces informations :</p>
        @else
            <p>Votre compte existe déjà. Connectez-vous avec votre identifiant et votre mot de passe habituels :</p>
        @endif
        <div style="margin:24px 0;padding:20px;background:#f7f9fb;border:1px solid #e5e7eb;border-radius:12px">
            <p style="margin:0 0 10px"><strong>Nom d'utilisateur :</strong> {{ $identifier }}</p>
            @if($temporaryPassword)
                <p style="margin:0"><strong>Mot de passe temporaire :</strong> {{ $temporaryPassword }}</p>
            @endif
        </div>
        <p style="margin:24px 0">
            <a href="{{ $loginUrl }}" style="display:inline-block;padding:13px 20px;background:#1e6f5c;color:#fff;text-decoration:none;font-weight:700;border-radius:10px">Se connecter</a>
        </p>
        @if($temporaryPassword)
            <p>Lors de votre première connexion, vous devrez personnaliser votre mot de passe afin de sécuriser votre compte.</p>
        @endif
        <p>Nous restons à votre disposition pour toute assistance.</p>
        <p style="margin:28px 0 0">Bien cordialement,<br><strong>L'équipe {{ $groupName }}</strong></p>
    </main>
</body>
</html>
