$root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\').Replace('/', '\')
$all = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue
$matches = @($all | Where-Object {
    $_.CommandLine -and
    $_.CommandLine.Replace('/', '\').IndexOf($root, [System.StringComparison]::OrdinalIgnoreCase) -ge 0 -and
    $_.CommandLine -match '(?i)(vite|server\\index\.mjs)'
})
if ($matches.Count -eq 0) {
    Write-Host 'No AID-C2S V5 application/API Node process is running for this project.' -ForegroundColor Yellow
    exit 0
}
foreach ($proc in $matches) {
    Write-Host "Stopping this project's process PID $($proc.ProcessId)"
    Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
}
Write-Host 'Stopped only Vite/API processes whose command line belongs to this AID-C2S project.' -ForegroundColor Green
