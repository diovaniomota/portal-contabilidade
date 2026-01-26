$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

# Define replacements using the exact corrupted sequences seen in the file
$replacements = @{
    "ConfiguraÃ§Ã£o" = "Configuração"
    "ProvisÃ³rio" = "Provisório"
    "ServiÃ§os" = "Serviços"
    "HomologaÃ§Ã£o" = "Homologação"
    "ProduÃ§Ã£o" = "Produção"
    "SÃ©rie" = "Série"
    "PrÃ³ximo" = "Próximo"
}

foreach ($key in $replacements.Keys) {
    if ($content.Contains($key)) {
        Write-Host "Fixing $key..."
        $content = $content.Replace($key, $replacements[$key])
    } else {
        Write-Host "Key not found: $key"
    }
}

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Encoding fix v2 applied."
