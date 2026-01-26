
$path = "..\next-dashboard\app\actions\fiscal.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# The file likely contains "Homologação" encoded in a specific way or just standard UTF8 char
# The previous read output shows: } else { // Homologação
# But the previous failure showed: } else { // HomologaÃ§Ã£o
# This suggests we might have a mixed encoding issue or console display issue.
# Let's match purely on the code structure, ignoring the comment content.

$oldProd = @"
        if (data.serie_nfe) payload.serie_nfe_producao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;
    } else { //
"@

$newProd = @"
        if (data.serie_nfe) payload.serie_nfe_producao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;
        
        // RPS (NFSe) - Mapeamento Explícito
        if (data.serie_nfse_producao) payload.serie_rps_producao = data.serie_nfse_producao;
        if (data.proxima_nfse_producao) payload.proximo_numero_rps_producao = data.proxima_nfse_producao;
    } else { //
"@

# We'll use regex to match ignoring the comment content after //
$regexPattern = [regex]::Escape("if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;`r`n    } else { //") + ".*"
# Actually simpler: just match the code part
$anchor = "if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;`n    } else {"

# Normalize content
$contentNormalized = $content -replace "`r`n", "`n"

if ($contentNormalized.Contains($anchor)) {
    $insertion = "`n        // RPS (NFSe) - Mapeamento Explícito`n        if (data.serie_nfse_producao) payload.serie_rps_producao = data.serie_nfse_producao;`n        if (data.proxima_nfse_producao) payload.proximo_numero_rps_producao = data.proxima_nfse_producao;"
    
    # Insert before the closing brace of the if block (which is before the else)
    # Wait, the structure is:
    # if (...) { ...
    #    ...
    # } else {
    
    # We want to insert inside the 'if' block (Production), just before '} else {'
    
    $replaceTarget = "if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;"
    $replacement = "if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;" + $insertion
    
    $contentNormalized = $contentNormalized.Replace($replaceTarget, $replacement)
    
    [System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
    Write-Host "Updated Production RPS mapping successfully."
} else {
    Write-Host "Could not find anchor code."
    # Debug info
    $idx = $contentNormalized.IndexOf("payload.proximo_numero_nfe_producao")
    if ($idx -ge 0) {
        Write-Host "Found near: " $contentNormalized.Substring($idx, 100)
    }
}
