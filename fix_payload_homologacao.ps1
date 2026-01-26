$path = "..\next-dashboard\app\configuracoes\page.js"

$lines = Get-Content -Path $path -Encoding UTF8

if ($lines -match "delete payload\.ambiente_nacional_homologacao") {
    Write-Host "Delete statements already present. No changes."
    exit 0
}

$deleteLines = @(
    "            delete payload.ambiente_nacional_homologacao;",
    "            delete payload.serie_nfse_homologacao;",
    "            delete payload.proximo_nfse_homologacao;",
    "            delete payload.proxima_nfse_homologacao;",
    ""
)

$inserted = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "const payload = \{") {
        $start = $i
        $end = -1
        $sawProd = $false

        for ($j = $start; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match "ambiente_nacional_producao") { $sawProd = $true }
            if ($lines[$j] -match "^\s*\};\s*$") {
                $end = $j
                break
            }
        }

        if ($end -gt -1 -and $sawProd) {
            $before = @()
            if ($end -ge 0) { $before = $lines[0..$end] }
            $after = @()
            if (($end + 1) -le ($lines.Count - 1)) { $after = $lines[($end + 1)..($lines.Count - 1)] }

            $lines = @($before + $deleteLines + $after)
            $inserted = $true
            break
        }
    }
}

if (-not $inserted) {
    Write-Host "Could not locate the payload block to patch; no changes applied."
    exit 1
}

Set-Content -Path $path -Value $lines -Encoding UTF8
Write-Host "Inserted payload delete statements."
