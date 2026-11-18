$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$UserDataDir = Join-Path $ProjectRoot 'user-data'
$CliPath = Join-Path $ProjectRoot 'cli.mjs'
$StartupDir = [Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupDir 'Antigravity Custom Theme.lnk'
$VbsPath = Join-Path $UserDataDir 'silent-start.vbs'

Write-Host '[1/3] Removing Windows Startup shortcut...'
if (Test-Path $ShortcutPath) {
    Remove-Item -Path $ShortcutPath -Force
}
if (Test-Path $VbsPath) {
    Remove-Item -Path $VbsPath -Force
}

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd -and (Test-Path $CliPath)) {
    Write-Host '[2/3] Tearing down theme hooks on open Antigravity windows...'
    & node $CliPath reset

    Write-Host '[3/3] Stopping CDP sync daemon...'
    & node $CliPath stop
} else {
    Write-Host '[2/3] Node.js or CLI not found; skipped live reset.'
}

Write-Host 'Uninstalled Startup auto-start and detached live theme cleanly. User presets in user-data/ were kept.'
