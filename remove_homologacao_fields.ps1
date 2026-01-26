
$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

# Remove fields from payload in handleSaveCompany
$content = $content -replace "serie_nfse_homologacao: companyData.serie_nfse_homologacao,", ""
$content = $content -replace "proximo_nfse_homologacao: companyData.proximo_nfse_homologacao,", ""
$content = $content -replace "ambiente_nacional_homologacao: companyData.ambiente_nacional_homologacao,", ""

# Also remove fields from state initialization to be clean
$content = $content -replace "serie_nfse_homologacao: '',", ""
$content = $content -replace "proximo_nfse_homologacao: '',", ""
$content = $content -replace "ambiente_nacional_homologacao: false,", ""

$content | Set-Content -Path $path -Encoding UTF8
Write-Host "Removed homologation fields from payload and state."
