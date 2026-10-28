#Requires -Version 5.1
[CmdletBinding()]
param([switch]$CheckOnly)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$required=@('index.html','style.css','animation.js','cinematic.js','blade-fx.js','image-settings.js','assets\config.js','assets\contours.js','assets\artwork.jpg','assets\avatar.jpg','assets\hiyuki-line-plate.png','assets\ice-crystal-v5.png','assets\hiyuki-native-hd-poster.png','assets\hiyuki-native-hd-motion.mp4','assets\icons\launch.ico','assets\icons\settings.ico','extension\windows-wallpaper.mjs','extension\payload.mjs','extension\renderer.mjs','extension\cdp.mjs','extension\pet-settle.mjs','extension\startup-readiness.mjs','extension\wallpaper.css','windows\StartupGate.cs','tools\build-startup-gate.ps1','tools\start-codex-background.ps1','tools\launch-hidden.vbs','tools\settings-hidden.vbs','tools\open-codex-settings.ps1','tools\open-codex-settings.mjs')
$missing=@($required | Where-Object {-not(Test-Path -LiteralPath (Join-Path $repo $_) -PathType Leaf)})
if($missing.Count) {throw ('项目文件不完整，请完整解压后重试。缺少：'+($missing -join ', '))}
$package=Get-AppxPackage -Name OpenAI.Codex | Select-Object -First 1
if(-not $package -or $package.SignatureKind -ne 'Store') {throw '请先安装并至少正常打开一次 Microsoft Store 官方版 Codex。'}
$node=Join-Path $package.InstallLocation 'app\resources\cua_node\bin\node.exe'
if(-not(Test-Path -LiteralPath $node)) {throw '当前 Codex 版本没有所需的 Node 运行时，本安装器不能接入这个版本。'}
$runtimeVersion=(& $node --version | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or $runtimeVersion -notmatch '^v(\d+)\.' -or [int]$matches[1] -lt 22) {throw '需要 Codex 附带的 Node.js 22 或以上运行时。'}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not(Test-Path -LiteralPath $compiler)) {throw '未找到 Windows .NET Framework 的 C# 编译器。'}
if($CheckOnly) {
  [pscustomobject]@{result='PASS';packageVersion=$package.Version.ToString();runtime=$runtimeVersion;requiredFiles=$required.Count;compilerAvailable=$true;installPerformed=$false} | ConvertTo-Json
  return
}
& (Join-Path $PSScriptRoot 'build-startup-gate.ps1')
$shell=New-Object -ComObject WScript.Shell
$entries=@(@('Codex（绯雪开屏）','launch-hidden.vbs','launch.ico'),@('Codex（绯雪设置）','settings-hidden.vbs','settings.ico'))
$locations=@([Environment]::GetFolderPath('Desktop'),[Environment]::GetFolderPath('Programs'))
foreach($location in $locations) {
  foreach($entry in $entries) {
    $shortcutPath=Join-Path $location ($entry[0]+'.lnk')
    $arguments='"'+(Join-Path $PSScriptRoot $entry[1])+'"'
    if(Test-Path -LiteralPath $shortcutPath) {
      $existing=$shell.CreateShortcut($shortcutPath)
      if(-not $existing.Arguments.Equals($arguments,[StringComparison]::OrdinalIgnoreCase)) {throw ('同名快捷方式指向其他目录，请先移走旧快捷方式再安装：'+$shortcutPath)}
    }
  }
}
foreach($location in $locations) {
  foreach($entry in $entries) {
    $shortcut=$shell.CreateShortcut((Join-Path $location ($entry[0]+'.lnk')))
    $shortcut.TargetPath=Join-Path $env:WINDIR 'System32\wscript.exe'
    $shortcut.Arguments='"'+(Join-Path $PSScriptRoot $entry[1])+'"'
    $shortcut.WorkingDirectory=$repo
    $shortcut.IconLocation=(Join-Path $repo ('assets\icons\'+$entry[2]))+',0'
    $shortcut.Save()
  }
}
$stateRoot=Join-Path $env:LOCALAPPDATA 'OpenAI\ChatGPTFix'
New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
[pscustomobject]@{version='1.0.0';visualVersion=13;installedAt=(Get-Date).ToString('o');root=$repo;desktop=(Join-Path $locations[0] 'Codex（绯雪开屏）.lnk');application=(Join-Path $package.InstallLocation 'app\ChatGPT.exe');configSha256=(Get-FileHash -LiteralPath (Join-Path $repo 'assets\config.js') -Algorithm SHA256).Hash} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateRoot 'installed.json') -Encoding UTF8
Write-Output '安装成功。请从托盘完全退出 Codex，再双击桌面的 Codex（绯雪开屏）。'
