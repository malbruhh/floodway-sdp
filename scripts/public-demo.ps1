# Publishes the FloodWay demo: this laptop's backend through a Cloudflare quick tunnel, the frontend on Cloudflare Pages.
# Usage:  powershell -File scripts/public-demo.ps1          start (or restart) everything and redeploy the frontend
#         powershell -File scripts/public-demo.ps1 -Stop    stop the public backend and the tunnel
# The laptop must stay on and online. Each start gives a new tunnel address, so the frontend is rebuilt and redeployed.
# Runtime files (logs, process ids, the write token) live in %LOCALAPPDATA%\floodway-public, outside the repo.
param([switch]$Stop, [int]$Port = 8090, [string]$Project = 'floodway')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$state = Join-Path $env:LOCALAPPDATA 'floodway-public'
New-Item -ItemType Directory -Force $state | Out-Null
$pidFile = Join-Path $state 'pids.txt'

if (Test-Path $pidFile) {
  foreach ($id in Get-Content $pidFile) { try { Stop-Process -Id ([int]$id) -Force -ErrorAction Stop } catch {} }
  Remove-Item $pidFile
}
if ($Stop) { Write-Host 'Public demo stopped.'; return }

# 1. Write token: a server secret. Visitors cannot write; the team pastes it in Profile > Operator access to demo uploads.
$tokenFile = Join-Path $state 'write-token.txt'
if (-not (Test-Path $tokenFile)) {
  $bytes = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_') | Set-Content -Encoding ascii $tokenFile
}
$env:FW_TOKEN = (Get-Content $tokenFile -Raw).Trim()
$env:FW_PORT = "$Port"
$env:FW_ORIGIN = "https://$Project.pages.dev"

# 2. Backend (read-only for visitors, no Telegram, own data folder).
$py = Join-Path $root 'backend\.venv\Scripts\python.exe'
$be = Start-Process -FilePath $py -ArgumentList "`"$(Join-Path $PSScriptRoot 'public_backend.py')`"" -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $state 'backend.out.log') -RedirectStandardError (Join-Path $state 'backend.err.log')
Remove-Item Env:FW_TOKEN
$be.Id | Set-Content $pidFile
$ok = $false
for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
  Start-Sleep -Seconds 1
  try { $ok = (Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/api/v1/vision/cameras" -TimeoutSec 3).StatusCode -eq 200 } catch {}
}
if (-not $ok) { throw "backend did not start; see $state\backend.err.log" }
Write-Host "Backend up on port $Port."

# 3. Quick tunnel. The public address is printed in cloudflared's log.
$cf = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$cfLog = Join-Path $state 'tunnel.log'
$tn = Start-Process -FilePath $cf -ArgumentList 'tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$Port" -WindowStyle Hidden -PassThru `
  -RedirectStandardOutput (Join-Path $state 'tunnel.out.log') -RedirectStandardError $cfLog
$tn.Id | Add-Content $pidFile
$url = $null
for ($i = 0; $i -lt 60 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  $m = Select-String -Path $cfLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($m) { $url = $m.Matches[0].Value }
}
if (-not $url) { throw "tunnel did not start; see $cfLog" }
$ok = $false
for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
  Start-Sleep -Seconds 2
  try { $ok = (Invoke-WebRequest -UseBasicParsing "$url/api/v1/vision/cameras" -TimeoutSec 10).StatusCode -eq 200 } catch {}
}
if (-not $ok) { throw "tunnel address $url does not answer yet; run the script again" }
Write-Host "Tunnel up: $url"

# 4. Frontend build pointed at the tunnel. Secret VITE_ values in frontend/.env are replaced (an empty value would let
#    Vite fall back to .env), then the bundle is checked for them before anything is published.
Push-Location (Join-Path $root 'frontend')
try {
  $env:VITE_API_BASE = $url
  $env:VITE_VISION_MOCK = '0'
  $env:VITE_TELEGRAM_BOT_TOKEN = 'unset'
  $env:VITE_OPENROUTER_API_KEY = 'unset'
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'frontend build failed' }
  $secrets = Get-Content '.env' | Where-Object { $_ -match '^VITE_(TELEGRAM_BOT_TOKEN|OPENROUTER_API_KEY)=(.+)$' } | ForEach-Object { ($_ -split '=', 2)[1].Trim() } | Where-Object { $_ }
  foreach ($s in $secrets) {
    foreach ($f in Get-ChildItem dist -Recurse -File) {
      if ([IO.File]::ReadAllText($f.FullName).Contains($s)) { throw 'a secret from frontend/.env is in the built files; not deploying' }
    }
  }
  # 5. Deploy to Cloudflare Pages production. CI=true stops wrangler from waiting on an interactive prompt.
  $env:CI = 'true'
  npx --yes wrangler pages deploy dist --project-name $Project --branch main --commit-dirty=true
  if ($LASTEXITCODE -ne 0) { throw 'wrangler deploy failed' }
} finally {
  Pop-Location
}

$url | Set-Content (Join-Path $state 'tunnel-url.txt')
Write-Host ''
Write-Host "Public site : https://$Project.pages.dev"
Write-Host "Backend     : $url  (this laptop; keep it on)"
Write-Host "Write token : $tokenFile  (paste in Profile > Operator access to demo uploads)"
Write-Host 'Stop        : powershell -File scripts/public-demo.ps1 -Stop'
