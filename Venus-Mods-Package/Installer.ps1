param([switch]$UseGameRuntime,[string]$LayoutTestPath,[switch]$SelfTest,[string]$GameFolder,[ValidateSet('check','install','uninstall')][string]$Action='check',[int]$Selection=15)
$ErrorActionPreference='Stop'
$installerRoot=$PSScriptRoot
function New-CityProcess([string]$SelectedFolder,[string]$SelectedAction) {
    $resolved=(Resolve-Path -LiteralPath $SelectedFolder).Path
    if (-not (Test-Path -LiteralPath (Join-Path $resolved 'resources\app.asar') -PathType Leaf)) { throw 'Choose the game folder containing resources and Venus University.exe.' }
    $nodeCommand=if ($UseGameRuntime) { $null } else { Get-Command node.exe -ErrorAction SilentlyContinue }
    $runtimePath=if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $resolved 'Venus University.exe' }
    if (-not (Test-Path -LiteralPath $runtimePath -PathType Leaf)) { throw 'The base game executable was not found. Choose the Windows 0.2.0 game folder.' }
    $scriptPath=Join-Path $installerRoot 'install.cjs'
    foreach ($value in @($scriptPath,$resolved)) { if ($value.Contains('"')) { throw 'The selected path contains unsupported quotes.' } }
    $info=New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName=$runtimePath
    $info.Arguments='"'+$scriptPath+'" '+$SelectedAction+' "'+$resolved.TrimEnd('\')+'" '+$Selection
    $info.WorkingDirectory=$installerRoot
    $info.UseShellExecute=$false
    $info.CreateNoWindow=$true
    $info.WindowStyle=[System.Diagnostics.ProcessWindowStyle]::Hidden
    $info.RedirectStandardOutput=$true
    $info.RedirectStandardError=$true
    if (-not $nodeCommand) { $info.EnvironmentVariables['ELECTRON_RUN_AS_NODE']='1' }
    $process=New-Object System.Diagnostics.Process
    $process.StartInfo=$info
    return $process
}
if ($SelfTest) {
    if (-not $GameFolder) { throw 'SelfTest requires GameFolder.' }
    $probe=New-CityProcess $GameFolder $Action
    [void]$probe.Start()
    $outputTask=$probe.StandardOutput.ReadToEndAsync()
    $errorTask=$probe.StandardError.ReadToEndAsync()
    if (-not $probe.WaitForExit(60000)) { $probe.Kill(); throw "The installation check timed out. No completed installation was reported." }
    $output=$outputTask.GetAwaiter().GetResult()
    $errors=$errorTask.GetAwaiter().GetResult()
    Write-Output $output
    if ($probe.ExitCode -ne 0) { throw $errors }
    exit 0
}
