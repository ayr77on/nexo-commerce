$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$demoProjectRoot = Split-Path -Parent $PSScriptRoot
$demoOutput = (Resolve-Path -LiteralPath (Join-Path $demoProjectRoot 'dist/demo')).Path
$demoArchivePath = Join-Path $demoProjectRoot 'dist/nexo-commerce-static-demo.zip'
if (-not (Test-Path -LiteralPath (Join-Path $demoOutput 'index.html'))) { throw 'Run npm run build:demo first.' }
$demoStream = [System.IO.File]::Open($demoArchivePath,[System.IO.FileMode]::Create,[System.IO.FileAccess]::Write,[System.IO.FileShare]::None)
$demoZip = [System.IO.Compression.ZipArchive]::new($demoStream,[System.IO.Compression.ZipArchiveMode]::Create,$false)
try {
    foreach ($demoFile in Get-ChildItem -LiteralPath $demoOutput -File -Recurse -Force) {
        # ZIP entries use forward slashes, including when packaged on Windows.
        $demoEntry = $demoFile.FullName.Substring($demoOutput.Length + 1).Replace('\','/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($demoZip,$demoFile.FullName,$demoEntry,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
} finally { $demoZip.Dispose(); $demoStream.Dispose() }
Write-Output "Static demo package: $demoArchivePath"
