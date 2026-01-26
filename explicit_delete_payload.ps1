
$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

$search = "// Salvar Configurações Fiscais no Banco Local"
$replace = "            delete payload.serie_nfse_homologacao;
            delete payload.proximo_nfse_homologacao;
            delete payload.proxima_nfse_homologacao;
            delete payload.ambiente_nacional_homologacao;

            // Salvar Configurações Fiscais no Banco Local"

$content = $content.Replace($search, $replace)

$content | Set-Content -Path $path -Encoding UTF8
Write-Host "Added explicit delete statements to payload."
