# 将 Node.js 加入当前会话 PATH，然后启动开发服务器
$nodePath = "C:\Program Files\nodejs"
if (-not (Test-Path "$nodePath\node.exe")) {
    Write-Host "未找到 Node.js，请修改此脚本中的 `$nodePath 为你的 node 安装目录" -ForegroundColor Red
    exit 1
}
$env:Path = "$nodePath;$env:Path"
Set-Location $PSScriptRoot\..

Write-Host "Node: $(node -v)" -ForegroundColor Green
Write-Host "正在启动 Next.js 开发服务器…" -ForegroundColor Green
& node .\node_modules\next\dist\bin\next dev
