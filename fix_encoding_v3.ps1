$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

# Define bad sequences using char codes to avoid script encoding issues
# Ã§Ã£ (for Configuração, Homologação, Produção)
$bad_cao = "$([char]195)$([char]167)$([char]195)$([char]163)o"
# Ã³ (for Provisório, Próximo)
$bad_o = "$([char]195)$([char]179)"
# Ã§ (for Serviços)
$bad_c = "$([char]195)$([char]167)"
# Ã© (for Série)
$bad_e = "$([char]195)$([char]169)"

Write-Host "Replacing bad sequences..."

if ($content.Contains($bad_cao)) {
    Write-Host "Found bad 'ção' sequence"
    $content = $content.Replace($bad_cao, "ção")
}

if ($content.Contains($bad_o)) {
    Write-Host "Found bad 'ó' sequence"
    $content = $content.Replace($bad_o, "ó")
}

if ($content.Contains($bad_c)) {
    Write-Host "Found bad 'ç' sequence"
    $content = $content.Replace($bad_c, "ç")
}

if ($content.Contains($bad_e)) {
    Write-Host "Found bad 'é' sequence"
    $content = $content.Replace($bad_e, "é")
}

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Fix applied."
