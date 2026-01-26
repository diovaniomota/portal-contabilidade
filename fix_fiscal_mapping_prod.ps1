
$path = "..\next-dashboard\app\actions\fiscal.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. Update Production Mapping
# Since the previous exact match failed for production, let's use a simpler anchor
$oldProd = @"
        if (data.serie_nfe) payload.serie_nfe_producao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;
    } else { // Homologação
"@

$newProd = @"
        if (data.serie_nfe) payload.serie_nfe_producao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;
        
        // RPS (NFSe) - Mapeamento Explícito
        if (data.serie_nfse_producao) payload.serie_rps_producao = data.serie_nfse_producao;
        if (data.proxima_nfse_producao) payload.proximo_numero_rps_producao = data.proxima_nfse_producao;
    } else { // Homologação
"@

# Normalize
$contentNormalized = $content -replace "`r`n", "`n"
$oldProdNormalized = $oldProd -replace "`r`n", "`n"
$newProdNormalized = $newProd -replace "`r`n", "`n"

if ($contentNormalized.Contains($oldProdNormalized)) {
    $contentNormalized = $contentNormalized.Replace($oldProdNormalized, $newProdNormalized)
    Write-Host "Updated Production RPS mapping."
    [System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
} else {
    Write-Host "Could not find Production block."
    # Debug
    Write-Host "Looking for:"
    Write-Host $oldProdNormalized
}
