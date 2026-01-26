$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$newLines = New-Object System.Collections.Generic.List[string]

$cc = [char]0x00E7
$ca = [char]0x00E3
$co = [char]0x00F3
$headerLine = "                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configura${cc}${ca}o RPS (Recibo Provis${co}rio de Servi${cc}os)</h4>"

foreach ($line in $lines) {
    # 1. Remove ALL existing RPS headers (we will re-insert the correct one)
    if ($line -match "Configura.*RPS.*Recibo" -or $line -match "RPS \(Recibo") {
        Write-Host "Removing header: $line"
        continue
    }

    $newLines.Add($line)

    # 2. Insert header at correct location (Fiscal Tab)
    # The container has marginTop: '1rem'
    if ($line -match "marginTop: '1rem', padding: '1rem', background: 'var\(--bg-body\)'") {
        Write-Host "Found Fiscal RPS Container. Inserting header."
        $newLines.Add($headerLine)
    }
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Locations fixed."
