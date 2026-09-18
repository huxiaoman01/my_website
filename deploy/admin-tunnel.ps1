<#
.SYNOPSIS
    建立到服务器的 SSH 隧道，并在本机打开简历申请管理后台（后台不对公网开放）。

.EXAMPLE
    .\admin-tunnel.ps1              # 建立隧道并打开浏览器
    .\admin-tunnel.ps1 -LocalPort 9000
    .\admin-tunnel.ps1 -Stop        # 关闭隧道
#>
param(
    [int]$LocalPort = 8080,
    [string]$KeyPath = "$env:USERPROFILE\.ssh\hxm.pem",
    [string]$RemoteUser = "ubuntu",
    [string]$RemoteHost = "124.222.53.145",
    [switch]$Stop
)

$ErrorActionPreference = 'Stop'

$sshExe = Join-Path $env:SystemRoot 'System32\OpenSSH\ssh.exe'
$pidFile = Join-Path $env:TEMP 'aurora-admin-tunnel.pid'
$url = "http://127.0.0.1:$LocalPort/admin.html"

if ($Stop) {
    if (Test-Path $pidFile) {
        $tunnelPid = Get-Content $pidFile
        Stop-Process -Id $tunnelPid -Force -ErrorAction SilentlyContinue
        Remove-Item $pidFile -Force
        Write-Host "已关闭隧道（PID $tunnelPid）"
    }
    else {
        Write-Host '没有找到正在运行的隧道。'
    }
    return
}

if (-not (Test-Path $KeyPath)) {
    throw "找不到 SSH 私钥：$KeyPath（用 -KeyPath 指定其它路径）"
}

$tunnel = Start-Process -FilePath $sshExe -ArgumentList @(
    '-i', $KeyPath,
    '-N',
    '-L', "$LocalPort`:127.0.0.1:8000",
    "$RemoteUser@$RemoteHost"
) -WindowStyle Hidden -PassThru

$tunnel.Id | Set-Content $pidFile
Start-Sleep -Seconds 2
Start-Process $url

Write-Host "隧道已建立（PID $($tunnel.Id)），已打开 $url"
Write-Host '管理口令见服务器上的 /etc/aurora-api.env'
Write-Host '用完执行：.\admin-tunnel.ps1 -Stop'
