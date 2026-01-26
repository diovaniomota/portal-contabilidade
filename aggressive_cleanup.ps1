$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$newLines = New-Object System.Collections.Generic.List[string]

$seenHeader = $false

foreach ($line in $lines) {
    # 1. Remove incomplete input
    # Matches <Input label="S... and does NOT end with /> (ignoring whitespace)
    if ($line -match '<Input label="S' -and -not ($line -match '/>\s*$')) {
        Write-Host "REMOVED BAD INPUT: $line"
        continue
    }

    # 2. Handle Header
    if ($line -match "Configura.*RPS.*Recibo") {
        if ($seenHeader) {
            Write-Host "REMOVED DUPLICATE HEADER: $line"
            continue
        }
        $seenHeader = $true
        
        # Fix encoding
        $cc = [char]0x00E7 # ç
        $ca = [char]0x00E3 # ã
        $co = [char]0x00F3 # ó
        $fixed = "                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configura${cc}${ca}o RPS (Recibo Provis${co}rio de Servi${cc}os)</h4>"
        $newLines.Add($fixed)
        Write-Host "KEPT (AND FIXED) HEADER"
        continue
    }

    $newLines.Add($line)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Done."
