$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

Write-Host "File length: $($content.Length)"

$markers = @(
    "Necessário para emissão de Nota Fiscal de Serviço (NFS-e).",
    "Necessário para emissão",
    "Credenciais Prefeitura",
    "habilita_nfse"
)

foreach ($m in $markers) {
    $idx = $content.IndexOf($m)
    Write-Host "Marker '$m': $idx"
}
