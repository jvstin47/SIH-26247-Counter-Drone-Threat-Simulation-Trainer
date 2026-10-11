$ErrorActionPreference = 'Stop'
$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$stateDir = Join-Path $env:APPDATA 'AID-C2S-V5'
$portFile = Join-Path $stateDir 'port.txt'
New-Item -ItemType Directory -Path $stateDir -Force | Out-Null

function Test-PortFree([int]$port) {
    $listener = $null
    try {
        $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
        $listener.Start()
        return $true
    } catch {
        return $false
    } finally {
        if ($listener) { $listener.Stop() }
    }
}

function Get-ProjectViteProcess([int]$port) {
    $all = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
    foreach ($proc in $all) {
        if (-not $proc.CommandLine) { continue }
        $command = $proc.CommandLine.Replace('/', '\')
        if ($command.IndexOf($root, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -and
            $command -match '(?i)vite' -and $command -match "(?i)(--port\s+|:)$port(\s|$)") {
            return $proc
        }
    }
    return $null
}

function Test-ServerReady([string]$url) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
        return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400)
    } catch { return $false }
}

$port = 0
if (Test-Path $portFile) {
    $saved = 0
    if ([int]::TryParse((Get-Content $portFile -Raw).Trim(), [ref]$saved) -and $saved -ge 3000 -and $saved -le 3100) {
        $port = $saved
    }
}

# Reuse the same origin across launches so IndexedDB/session history stays on the
# same browser origin. If the existing server is this project, simply open it.
if ($port -gt 0 -and -not (Test-PortFree $port)) {
    $existing = Get-ProjectViteProcess $port
    $url = "http://127.0.0.1:$port/#/command"
    if ($existing -and (Test-ServerReady "http://127.0.0.1:$port/")) {
        Write-Host "AID-C2S V5 is already running on port $port; reusing it." -ForegroundColor Green
        Start-Process $url
        exit 0
    }
    Write-Host "Saved port $port is occupied by another process. Selecting a new stable port." -ForegroundColor Yellow
    $port = 0
}

if ($port -eq 0) {
    foreach ($candidate in 3000..3100) {
        if (Test-PortFree $candidate) { $port = $candidate; break }
    }
}
if ($port -eq 0) { throw 'No free port was found in the range 3000–3100. Stop a local development server and retry.' }
Set-Content -LiteralPath $portFile -Value $port -Encoding ASCII
$url = "http://127.0.0.1:$port/#/command"

# Start the optional loopback API. The browser application remains usable if the
# API is already occupied or fails to start; local IndexedDB remains authoritative.
function Test-ApiReady() {
    try {
        $r = Invoke-RestMethod -Uri 'http://127.0.0.1:4177/api/health' -TimeoutSec 1
        return ($r.ok -eq $true -and $r.service -eq 'aid-c2s-local-api')
    } catch { return $false }
}
if (-not (Test-ApiReady)) {
    $apiCmd = Join-Path $env:TEMP 'AID-C2S-V5-api.cmd'
    $apiText = @"
@echo off
cd /d "$root"
set AID_C2S_PORT=4177
call node "$root\server\index.mjs"
echo.
echo AID-C2S V5 API stopped.
pause
"@
    Set-Content -LiteralPath $apiCmd -Value $apiText -Encoding ASCII
    Start-Process -FilePath $env:ComSpec -ArgumentList @('/k', "`"$apiCmd`"") -WorkingDirectory $root | Out-Null
    $apiReady = $false
    for ($i = 0; $i -lt 12; $i++) {
        Start-Sleep -Seconds 1
        if (Test-ApiReady) { $apiReady = $true; break }
    }
    if ($apiReady) { Write-Host 'Optional local API is ready on port 4177.' -ForegroundColor Green }
    else { Write-Host 'Optional API did not start. Browser/IndexedDB training will still work; inspect the API window if you need sync.' -ForegroundColor Yellow }
} else {
    Write-Host 'Local API is already responding on port 4177.' -ForegroundColor Green
}

$serverCmd = Join-Path $env:TEMP "AID-C2S-V5-server-$port.cmd"
$serverText = @"
@echo off
cd /d "$root"
echo ============================================================
echo AID-C2S V5 SERVER
echo Port: $port
echo URL: http://127.0.0.1:$port
echo ============================================================
call npm.cmd run dev -- --host 127.0.0.1 --port $port --strictPort
echo.
echo AID-C2S V5 server stopped.
pause
"@
Set-Content -LiteralPath $serverCmd -Value $serverText -Encoding ASCII

Write-Host "Starting AID-C2S V5 in $root" -ForegroundColor White
Write-Host "Using stable local port $port" -ForegroundColor Cyan
Start-Process -FilePath $env:ComSpec -ArgumentList @('/k', "`"$serverCmd`"") -WorkingDirectory $root | Out-Null

$ready = $false
for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    if (Test-ServerReady "http://127.0.0.1:$port/") { $ready = $true; break }
}
if (-not $ready) {
    Write-Host "The server did not answer within 45 seconds. Check the separate server window for the actual Vite/npm error." -ForegroundColor Red
    throw "AID-C2S V5 was not reachable on port $port."
}
Write-Host "Server is responding. Opening $url" -ForegroundColor Green
Start-Process $url
