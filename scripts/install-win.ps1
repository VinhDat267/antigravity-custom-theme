$ErrorActionPreference = 'Stop'

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$UserDataDir = Join-Path $ProjectRoot 'user-data'
$CliPath = Join-Path $ProjectRoot 'cli.mjs'
$StartupDir = [Environment]::GetFolderPath('Startup')
$ShortcutPath = Join-Path $StartupDir 'Antigravity Custom Theme.lnk'
$VbsPath = Join-Path $UserDataDir 'silent-start.vbs'

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Error 'Node.js (>= 22) is required and was not found in PATH.'
    exit 1
}

$nodeMajor = [int]((& node -p "process.versions.node.split('.')[0]") | Select-Object -First 1)
if ($nodeMajor -lt 22) {
    Write-Error "Node.js >= 22 is required (detected v$nodeMajor)."
    exit 1
}

if (-not (Test-Path $UserDataDir)) {
    New-Item -ItemType Directory -Path $UserDataDir -Force | Out-Null
}

Write-Host '[1/3] Building Antigravity 2.x theme bundle...'
& node $CliPath build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[2/3] Creating silent startup launcher...'
$nodeExe = $nodeCmd.Source.Replace('"', '""')
$cliEscaped = $CliPath.Replace('"', '""')
$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run """$nodeExe"" ""$cliEscaped"" start", 0, False
"@
[System.IO.File]::WriteAllText($VbsPath, $vbsContent, [System.Text.UTF8Encoding]::new($false))

$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = 'wscript.exe'
$shortcut.Arguments = "`"$VbsPath`""
$shortcut.WorkingDirectory = $ProjectRoot
$shortcut.Description = 'Antigravity 2.x Custom Theme CDP Sync Daemon'
$shortcut.Save()

Write-Host '[3/3] Starting CDP sync daemon...'
& node $CliPath start
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Done! Press Ctrl+Shift+Y (or Ctrl+Alt+K) inside Antigravity 2.x to open Theme Studio.'
