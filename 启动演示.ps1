param([switch]$NoPause)

$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$siteUrl = 'http://127.0.0.1:5173'

function Test-DemoPort {
    $portClient = New-Object System.Net.Sockets.TcpClient
    try {
        $connectionTask = $portClient.ConnectAsync('127.0.0.1', 5173)
        if (-not $connectionTask.Wait(1000)) { return $false }
        return $portClient.Connected
    } catch {
        return $false
    } finally {
        $portClient.Dispose()
    }
}

function Test-ExistingDemo {
    try {
        $response = Invoke-WebRequest -Uri $siteUrl -UseBasicParsing -TimeoutSec 5
        return [regex]::IsMatch([string]$response.Content, '<title>\s*热知\s*·\s*工程热力学学习平台\s*</title>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
    } catch {
        return $false
    }
}

Push-Location -LiteralPath $projectDirectory
try {
    Write-Host ''
    Write-Host '热知 · 工程热力学学习平台' -ForegroundColor Cyan
    Write-Host ('项目位置：' + $projectDirectory)

    if (Test-DemoPort) {
        if (Test-ExistingDemo) {
            Write-Host '检测到本项目已经启动，将打开现有页面。' -ForegroundColor Green
            Start-Process -FilePath $siteUrl -WindowStyle Hidden
            exit 0
        }
        throw '端口 5173 已被其他应用占用，或无法确认该地址为本项目。请自行关闭占用该端口的应用后重试；本脚本不会结束任何进程。'
    }

    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    $nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }
    if (-not $nodeExecutable) {
        throw '找不到 Node.js。请先安装 Node.js（包含 npm），重新打开此启动器；在终端中运行 node -v 应能显示版本。'
    }

    $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
    $npmExecutable = if ($npmCommand) { $npmCommand.Source } else { $null }
    $nodeDirectory = Split-Path -Parent $nodeExecutable
    $npmBesideNode = Join-Path $nodeDirectory 'npm.cmd'
    if (-not $npmExecutable -and (Test-Path -LiteralPath $npmBesideNode)) { $npmExecutable = $npmBesideNode }
    if (-not $npmExecutable) { throw '找不到 npm.cmd。请确认 Node.js 安装包含 npm，并重新打开启动器。' }

    if (-not (Test-Path -LiteralPath (Join-Path $projectDirectory 'node_modules\@dcloudio\vite-plugin-uni'))) {
        Write-Host ''
        Write-Host '当前项目尚未安装依赖。请在此文件夹打开终端，执行：' -ForegroundColor Yellow
        Write-Host '  npm install' -ForegroundColor Cyan
        Write-Host ('若 npm 不在 PATH，也可以执行： & "' + $npmExecutable + '" install')
        throw '安装依赖后，再次双击「启动演示.cmd」。启动器不会自动联网安装。'
    }

    # npm 启动的子进程也需要在 PATH 中找到对应的 node.exe。
    $env:PATH = $nodeDirectory + [System.IO.Path]::PathSeparator + $env:PATH
    Write-Host ('Node.js：' + $nodeExecutable)
    Write-Host ('演示地址：' + $siteUrl) -ForegroundColor Green
    Write-Host '服务启动后将自动打开浏览器；请保持本窗口打开。'
    Write-Host '结束演示时按 Ctrl+C。' -ForegroundColor Yellow
    Write-Host ''

    # Uni/Vite 自身在服务就绪后打开页面，无需额外的后台等待进程。
    # strictPort 避免启动瞬间发生端口竞争时静默切换至其他地址。
    & $npmExecutable run dev -- --strictPort --open $siteUrl
    if ($LASTEXITCODE -ne 0) {
        throw ('服务已停止，退出码：' + $LASTEXITCODE + '。请查看上方输出。')
    }
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    if (-not $NoPause) { $null = Read-Host '按 Enter 关闭窗口' }
    exit 1
} finally {
    Pop-Location
}
