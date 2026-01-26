
$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$content = [string]::Join("`r`n", $lines)

# Check if we already have the deletion
if ($content -match "delete payload.proxima_nfse_producao;") {
    Write-Host "RPS deletion already present."
} else {
    # Add after environment deletion
    $search = "delete payload.ambiente_nacional_producao;"
    $insert = "delete payload.ambiente_nacional_producao;`r`n            delete payload.serie_nfse_producao;`r`n            delete payload.proxima_nfse_producao;"
    
    $content = $content.Replace($search, $insert)
    
    [System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
    Write-Host "Added delete statements for RPS production fields."
}
