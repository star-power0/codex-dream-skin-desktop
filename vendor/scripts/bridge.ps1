# Codex Dream Skin Desktop - PowerShell bridge
#
# Thin JSON-in/JSON-out wrapper around the vetted Windows Store detection,
# CDP launch/verification, and process-safety logic in theme-windows.ps1 /
# common-windows.ps1 (vendored unmodified from the CodexDreamSkin project).
# This script owns no logic of its own beyond argument parsing, JSON
# framing, and (in -Server mode) a request loop; every security-relevant
# check (package signature, port ownership, process identity) stays in the
# vendored functions.
#
# Two modes:
#   One-shot:  bridge.ps1 <command> [-Port <n>] [-RestartExisting]
#              Prints one JSON line, then exits. Simple but pays a fixed
#              ~15-20s cost per call on machines where Get-NetTCPConnection's
#              first CIM session takes that long to spin up.
#   Server:    bridge.ps1 -Server
#              Reads one JSON request per line from stdin, e.g.
#              {"id":1,"command":"detect","port":9335}
#              and writes one JSON response per line to stdout, e.g.
#              {"id":1,"ok":true,"installed":true,...}
#              Pays the slow CIM/module init cost once per process lifetime
#              instead of once per call. This is the mode the Electron main
#              process uses so polling doesn't stack up cold PowerShell starts.

[CmdletBinding()]
param(
  [Parameter(Position = 0)]
  [ValidateSet('detect', 'start', 'stop', 'status')]
  [string]$Command,
  [int]$Port = 9335,
  [switch]$RestartExisting,
  [switch]$Server
)

$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
. (Join-Path $here 'config-utf8.ps1')
. (Join-Path $here 'common-windows.ps1')
. (Join-Path $here 'theme-windows.ps1')

# Fast port probe via .NET TcpClient — avoids the Get-NetTCPConnection CIM
# session which takes 15-20s on some machines. Returns $true only when
# something is actively accepting connections on 127.0.0.1:$Port.
function Test-PortListening {
  param([int]$Port, [int]$TimeoutMs = 300)
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $task = $client.ConnectAsync('127.0.0.1', $Port)
    $ok = $task.Wait($TimeoutMs)
    $client.Dispose()
    return $ok -and -not $task.IsFaulted
  } catch {
    return $false
  }
}

function Write-BridgeLine {
  param([Parameter(Mandatory = $true)][object]$Value)
  $json = $Value | ConvertTo-Json -Depth 8 -Compress
  [Console]::Out.Write($json)
  [Console]::Out.Write("`n")
  [Console]::Out.Flush()
}

function Invoke-BridgeCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Cmd,
    [int]$CmdPort = 9335,
    [bool]$CmdRestartExisting = $false
  )
  switch ($Cmd) {
    'detect' {
      $installs = @(Get-DreamSkinRegisteredCodexInstalls)
      if ($installs.Count -eq 0) {
        return [ordered]@{ ok = $true; installed = $false }
      }
      $codex = $installs[0]
      # Fast path: skip the slow Get-NetTCPConnection CIM call when nothing
      # is listening on the port at all (the common case when CDP is inactive).
      $portListening = Test-PortListening -Port $CmdPort
      $identity = if ($portListening) { Get-DreamSkinVerifiedCdpIdentity -Port $CmdPort -Codex $codex } else { $null }
      $processes = @(Get-DreamSkinCodexProcesses -Codex $codex)
      return [ordered]@{
        ok = $true
        installed = $true
        version = $codex.Version
        running = $processes.Count -gt 0
        cdpActive = $null -ne $identity
        browserId = if ($identity) { $identity.BrowserId } else { $null }
        port = $CmdPort
      }
    }
    'status' {
      $installs = @(Get-DreamSkinRegisteredCodexInstalls)
      if ($installs.Count -eq 0) {
        return [ordered]@{ ok = $true; installed = $false; cdpActive = $false }
      }
      $portListening = Test-PortListening -Port $CmdPort
      $identity = if ($portListening) { Get-DreamSkinVerifiedCdpIdentity -Port $CmdPort -Codex $installs[0] } else { $null }
      return [ordered]@{
        ok = $true
        installed = $true
        cdpActive = $null -ne $identity
        browserId = if ($identity) { $identity.BrowserId } else { $null }
        targetCount = if ($identity) { $identity.TargetCount } else { 0 }
      }
    }
    'start' {
      $installs = @(Get-DreamSkinRegisteredCodexInstalls)
      if ($installs.Count -eq 0) {
        return [ordered]@{ ok = $false; error = 'The official OpenAI.Codex Store package is not installed or its identity cannot be validated.' }
      }
      $codex = $installs[0]
      Assert-DreamSkinPort -Port $CmdPort

      $existing = Get-DreamSkinVerifiedCdpIdentity -Port $CmdPort -Codex $codex
      if ($null -ne $existing) {
        return [ordered]@{ ok = $true; alreadyRunning = $true; port = $CmdPort; browserId = $existing.BrowserId }
      }

      $processes = @(Get-DreamSkinCodexProcesses -Codex $codex)
      if ($processes.Count -gt 0 -and -not $CmdRestartExisting) {
        return [ordered]@{
          ok = $false
          needsRestart = $true
          error = 'Codex is running without a verified Dream Skin CDP endpoint. Restart it to enable theming.'
        }
      }
      if ($processes.Count -gt 0 -and $CmdRestartExisting) {
        Stop-DreamSkinCodex -Codex $codex -AllowForce
      }

      if (-not (Test-DreamSkinPortAvailable -Port $CmdPort)) {
        $CmdPort = Select-DreamSkinPort -PreferredPort $CmdPort
      }
      $baselineProcessIds = @(Get-DreamSkinCodexProcesses -Codex $codex | ForEach-Object { [int]$_.ProcessId })
      $arguments = @('--remote-debugging-address=127.0.0.1', "--remote-debugging-port=$CmdPort")
      $launch = Start-DreamSkinCodexForDebugging -Codex $codex -Arguments $arguments `
        -Port $CmdPort -PreserveProcessIds $baselineProcessIds

      $deadline = (Get-Date).AddSeconds(45)
      $identity = Get-DreamSkinVerifiedCdpIdentity -Port $CmdPort -Codex $codex
      while ($null -eq $identity -and (Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 400
        $identity = Get-DreamSkinVerifiedCdpIdentity -Port $CmdPort -Codex $codex
      }
      if ($null -eq $identity) {
        return [ordered]@{ ok = $false; error = "Codex did not expose a verified loopback CDP endpoint on port $CmdPort within 45 seconds." }
      }

      return [ordered]@{
        ok = $true
        alreadyRunning = $false
        port = $CmdPort
        browserId = $identity.BrowserId
        strategy = $launch.Strategy
      }
    }
    'stop' {
      $installs = @(Get-DreamSkinRegisteredCodexInstalls)
      if ($installs.Count -eq 0) {
        return [ordered]@{ ok = $true; stopped = $false }
      }
      Stop-DreamSkinCodex -Codex $installs[0] -AllowForce
      return [ordered]@{ ok = $true; stopped = $true }
    }
    default {
      return [ordered]@{ ok = $false; error = "Unknown command: $Cmd" }
    }
  }
}

if ($Server) {
  while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if (-not $line.Trim()) { continue }
    $requestId = $null
    try {
      $request = $line | ConvertFrom-Json -ErrorAction Stop
      $requestId = $request.id
      $result = Invoke-BridgeCommand -Cmd $request.command `
        -CmdPort $(if ($request.port) { [int]$request.port } else { 9335 }) `
        -CmdRestartExisting $(if ($request.restartExisting) { [bool]$request.restartExisting } else { $false })
      $result['id'] = $requestId
      Write-BridgeLine -Value $result
    } catch {
      Write-BridgeLine -Value ([ordered]@{ id = $requestId; ok = $false; error = $_.Exception.Message })
    }
  }
  exit 0
}

try {
  $result = Invoke-BridgeCommand -Cmd $Command -CmdPort $Port -CmdRestartExisting ([bool]$RestartExisting)
  Write-BridgeLine -Value $result
  if (-not $result.ok) { exit 1 }
} catch {
  Write-BridgeLine -Value ([ordered]@{ ok = $false; error = $_.Exception.Message })
  exit 1
}
