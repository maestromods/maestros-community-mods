$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$payload = Join-Path $dist 'payload.zip'
if (Test-Path -LiteralPath $payload) { throw 'dist/payload.zip already exists. Move the previous dist output aside before rebuilding.' }
$zip = [IO.Compression.ZipFile]::Open($payload, [IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath (Join-Path $root 'Venus-Mods-Package') -Recurse -File | Sort-Object FullName | ForEach-Object {
    $entry = $_.FullName.Substring($root.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally { $zip.Dispose() }
$hash = (Get-FileHash -LiteralPath $payload -Algorithm SHA256).Hash.ToLowerInvariant()
$source = [IO.File]::ReadAllText((Join-Path $root 'Setup.cs'))
$source = $source -replace 'PayloadHash="[a-f0-9]{64}"', ('PayloadHash="' + $hash + '"')
$generated = Join-Path $dist 'Setup.generated.cs'
[IO.File]::WriteAllText($generated, $source)
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { throw '.NET Framework C# compiler was not found.' }
$exe = Join-Path $dist 'Maestro-Community-Mods-Setup-1.1.3.exe'
& $compiler /nologo /target:winexe "/out:$exe" /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll "/resource:$payload,VenusModsPayload" "/resource:$(Join-Path $root 'Installer-background.png'),CityLifePreview" $generated
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
@($exe, $payload) | ForEach-Object { $item = Get-FileHash -LiteralPath $_ -Algorithm SHA256; "$($item.Hash.ToLowerInvariant())  $([IO.Path]::GetFileName($_))" } | Set-Content -LiteralPath (Join-Path $dist 'SHA256.txt')
Write-Host "Built installer in $dist"
