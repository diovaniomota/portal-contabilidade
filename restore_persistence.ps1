
$path = "..\next-dashboard\app\configuracoes\page.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$content = $content.Replace("delete supabasePayload.ambiente_nacional_producao;", "// delete supabasePayload.ambiente_nacional_producao;")
$content = $content.Replace("delete supabasePayload.serie_nfse_producao;", "// delete supabasePayload.serie_nfse_producao;")
$content = $content.Replace("delete supabasePayload.proxima_nfse_producao;", "// delete supabasePayload.proxima_nfse_producao;")

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Restored persistence for production fields in page.js"
