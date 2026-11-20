$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $projectRoot 'backend-laravel'
$apiLog = Join-Path $apiRoot 'storage\logs\local-api.log'
$apiErrorLog = Join-Path $apiRoot 'storage\logs\local-api-error.log'

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3306 -ErrorAction SilentlyContinue)) {
    throw 'MySQL Wampserver ne répond pas sur le port 3306. Démarrez le service MySQL avant de lancer le site.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 8082 -ErrorAction SilentlyContinue) {
    throw 'Le port 8082 est déjà utilisé. Vérifiez le service avant de relancer le script.'
}
if (-not (Test-Path (Join-Path $apiRoot '.env'))) {
    throw 'Le fichier backend-laravel/.env est absent. Configurez la connexion MySQL de Wampserver.'
}
if (-not (Test-Path (Join-Path $apiRoot 'public\build\assets\app.js')) -or
    -not (Test-Path (Join-Path $apiRoot 'public\build\assets\app.css'))) {
    throw 'Les fichiers du frontend Laravel sont absents. Restaurez public/build/assets depuis Git.'
}

$php = (Get-Command php.exe -ErrorAction Stop).Source
$phpModules = & $php -m
if ($phpModules -notcontains 'pdo_mysql') {
    throw 'Le PHP sélectionné ne charge pas pdo_mysql. Sélectionnez la version PHP de Wampserver avec cette extension activée.'
}

$apiArgs = @('-S', '127.0.0.1:8082', '-t', '.', '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')
$api = Start-Process -FilePath $php -ArgumentList $apiArgs -WorkingDirectory (Join-Path $apiRoot 'public') -WindowStyle Hidden -PassThru -RedirectStandardOutput $apiLog -RedirectStandardError $apiErrorLog

$deadline = (Get-Date).AddSeconds(30)
$appReady = $false
while ((Get-Date) -lt $deadline -and -not $appReady) {
    try {
        $page = Invoke-WebRequest 'http://127.0.0.1:8082/' -TimeoutSec 2
        $asset = Invoke-WebRequest 'http://127.0.0.1:8082/build/assets/app.js' -TimeoutSec 2
        $appReady = $page.StatusCode -eq 200 -and $asset.StatusCode -eq 200
    } catch { }
    if (-not $appReady) { Start-Sleep -Milliseconds 500 }
}
if (-not $appReady) {
    if (-not $api.HasExited) { Stop-Process -Id $api.Id -Force }
    throw "Démarrage incomplet. Journal Laravel: $apiErrorLog"
}

[pscustomobject]@{ Application = 'http://127.0.0.1:8082'; LaravelApi = 'http://127.0.0.1:8082/api'; ApiPid = $api.Id }
