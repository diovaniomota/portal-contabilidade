
$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$patterns = @(
    "serie_nfse_homologacao",
    "proximo_nfse_homologacao",
    "proxima_nfse_homologacao",
    "ambiente_nacional_homologacao"
)

$newLines = @()
foreach ($line in $lines) {
    $skip = $false
    foreach ($p in $patterns) {
        if ($line -match $p) {
            $skip = $true
            break
        }
    }
    
    if (-not $skip) {
        $newLines += $line
    }
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Removed all homologation property lines."
