
$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$content = [string]::Join("`r`n", $lines)

# Check if we already have the deletion to avoid duplicates
if ($content -match "delete payload.ambiente_nacional_producao;") {
    Write-Host "Deletion already present."
} else {
    # We want to add it after the existing deletes
    $search = "delete payload.proxima_nfse_homologacao;"
    $insert = "delete payload.proxima_nfse_homologacao;`r`n            delete payload.ambiente_nacional_producao;"
    
    $content = $content.Replace($search, $insert)
    
    # Also verify if serie_nfse_producao needs to be kept. The user wants to save it.
    # The error was SPECIFICALLY about 'ambiente_nacional_producao'.
    
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Added delete payload.ambiente_nacional_producao;"
}
