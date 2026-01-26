
$path = "..\next-dashboard\app\configuracoes\page.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$old = "proxima_nfse_producao: companyData.proxima_nfse_producao,"
$new = "proxima_nfse_producao: companyData.proxima_nfse_producao ? parseInt(companyData.proxima_nfse_producao) : null,"

$contentNormalized = $content -replace "`r`n", "`n"

if ($contentNormalized.Contains($old)) {
    $contentNormalized = $contentNormalized.Replace($old, $new)
    [System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
    Write-Host "Updated page.js to parseInt proxima_nfse_producao."
} else {
    Write-Host "Could not find target string in page.js"
}
