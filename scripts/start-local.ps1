$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $projectRoot 'backend-laravel'
$webRoot = $apiRoot
$apiLog = Join-Path $apiRoot 'storage\logs\local-api.log'
$apiErrorLog = Join-Path $apiRoot 'storage\logs\local-api-error.log'
$webLog = Join-Path $apiRoot 'storage\logs\local-vite.log'
$webErrorLog = Join-Path $apiRoot 'storage\logs\local-vite-error.log'

if (-not (Get-NetTCPConnection -State Listen -LocalPort 3306 -ErrorAction SilentlyContinue)) {
    throw 'MySQL Wampserver ne répond pas sur le port 3306. Démarrez le service MySQL avant de lancer le site.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 8082 -ErrorAction SilentlyContinue) {
    throw 'Le port 8082 est déjà utilisé. Vérifiez le service avant de relancer le script.'
}
if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) {
    throw 'Le port 3000 est déjà utilisé. Vérifiez le service avant de relancer le script.'
}
if (-not (Test-Path (Join-Path $apiRoot '.env'))) {
    throw 'Le fichier backend-laravel/.env est absent. Configurez la connexion MySQL de Wampserver.'
}
if (-not (Test-Path (Join-Path $webRoot 'node_modules'))) {
    throw 'Dépendances Vue absentes. Exécutez npm install dans backend-laravel.'
}

$php = (Get-Command php.exe -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$phpModules = & $php -m
if ($phpModules -notcontains 'pdo_mysql') {
    throw 'Le PHP sélectionné ne charge pas pdo_mysql. Sélectionnez la version PHP de Wampserver avec cette extension activée.'
}
$apiArgs = @('-S', '127.0.0.1:8082', '-t', '.', '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php')
$api = Start-Process -FilePath $php -ArgumentList $apiArgs -WorkingDirectory (Join-Path $apiRoot 'public') -WindowStyle Hidden -PassThru -RedirectStandardOutput $apiLog -RedirectStandardError $apiErrorLog
$web = Start-Process -FilePath $npm -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', '3000', '--strictPort') -WorkingDirectory $webRoot -WindowStyle Hidden -PassThru -RedirectStandardOutput $webLog -RedirectStandardError $webErrorLog

$deadline = (Get-Date).AddSeconds(30)
$apiReady = $false
$webReady = $false
while ((Get-Date) -lt $deadline -and (-not $apiReady -or -not $webReady)) {
    try { $null = Invoke-RestMethod 'http://127.0.0.1:8082/api/public/groups' -TimeoutSec 2; $apiReady = $true } catch { }
    try { $null = Invoke-WebRequest 'http://127.0.0.1:3000/resources/js/app.js' -TimeoutSec 2; $webReady = $true } catch { }
    if (-not $apiReady -or -not $webReady) { Start-Sleep -Milliseconds 500 }
}
if (-not $apiReady -or -not $webReady) {
    if (-not $api.HasExited) { Stop-Process -Id $api.Id -Force }
    if (-not $web.HasExited) { Stop-Process -Id $web.Id -Force }
    throw "Démarrage incomplet. Journaux API: $apiErrorLog ; frontend: $webErrorLog"
}

[pscustomobject]@{ Application = 'http://127.0.0.1:8082/login'; LaravelApi = 'http://127.0.0.1:8082/api'; Vite = 'http://127.0.0.1:3000'; ApiPid = $api.Id; VitePid = $web.Id }
