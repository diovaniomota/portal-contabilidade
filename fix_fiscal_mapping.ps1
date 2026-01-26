
$path = "..\next-dashboard\app\actions\fiscal.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. Update Production Mapping
# We need to add serie_rps_producao and proximo_rps_producao to the payload
# Focus API documentation says for NFSe it uses serie_rps_producao and proximo_numero_rps_producao?
# Let's check common usage. Usually it is:
# serie_rps_producao
# proximo_numero_rps_producao

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

# 2. Update Homologation Mapping
$oldHom = @"
        if (data.serie_nfe) payload.serie_nfe_homologacao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_homologacao = data.proxima_nfe;
    }
"@

$newHom = @"
        if (data.serie_nfe) payload.serie_nfe_homologacao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_homologacao = data.proxima_nfe;

        // RPS (NFSe) - Mapeamento Explícito
        if (data.serie_nfse_homologacao) payload.serie_rps_homologacao = data.serie_nfse_homologacao;
        if (data.proximo_nfse_homologacao) payload.proximo_numero_rps_homologacao = data.proximo_nfse_homologacao;
    }
"@

$contentNormalized = $content -replace "`r`n", "`n"
$oldProdNormalized = $oldProd -replace "`r`n", "`n"
$newProdNormalized = $newProd -replace "`r`n", "`n"
$oldHomNormalized = $oldHom -replace "`r`n", "`n"
$newHomNormalized = $newHom -replace "`r`n", "`n"

if ($contentNormalized.Contains($oldProdNormalized)) {
    $contentNormalized = $contentNormalized.Replace($oldProdNormalized, $newProdNormalized)
    Write-Host "Updated Production RPS mapping."
} else {
    Write-Host "Could not find Production block."
}

if ($contentNormalized.Contains($oldHomNormalized)) {
    $contentNormalized = $contentNormalized.Replace($oldHomNormalized, $newHomNormalized)
    Write-Host "Updated Homologation RPS mapping."
} else {
    Write-Host "Could not find Homologation block."
}

[System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
