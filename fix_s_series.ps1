$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

$ce = [char]0x00E9 # é

foreach ($line in $lines) {
    $newLine = $line

    # Match the line with "serie_nfse_homologacao" and "Input"
    if ($line -match "name=""serie_nfse_homologacao""") {
        Write-Host "Fixing Série Homologação line..."
        # Reconstruct the line completely to ensure it's clean
        $newLine = '                                                <Input label="S' + $ce + 'rie RPS" name="serie_nfse_homologacao" value={companyData.serie_nfse_homologacao} onChange={handleChange} placeholder="Ex: 1" />'
    }
    # Match the line with "serie_nfse_producao"
    elseif ($line -match "name=""serie_nfse_producao""") {
        Write-Host "Fixing Série Produção line..."
        $newLine = '                                                <Input label="S' + $ce + 'rie RPS" name="serie_nfse_producao" value={companyData.serie_nfse_producao} onChange={handleChange} placeholder="Ex: 1" />'
    }

    $newLines.Add($newLine)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Fixed Series lines."
