$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

$headerCount = 0

foreach ($line in $lines) {
    # Remove incomplete input lines: <Input label="Sé
    if ($line.Trim() -eq '<Input label="Sé') {
        Write-Host "Removing incomplete input: $line"
        continue
    }

    # Handle Header
    if ($line -match "Configura.*RPS.*Recibo Provis.*rio") {
        $headerCount++
        # The first occurrence is the one we want (at line 913 approx)
        # The second occurrence (at line 946 approx) is the accidental duplicate inside the other div
        if ($headerCount -gt 1) {
             Write-Host "Removing duplicate header: $line"
             continue
        }
        
        # Fix encoding for the kept header
        # Using char codes to be safe: ç=00E7, ã=00E3, ó=00F3
        $cc = [char]0x00E7
        $ca = [char]0x00E3
        $co = [char]0x00F3
        $newLine = "                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configura${cc}${ca}o RPS (Recibo Provis${co}rio de Servi${cc}os)</h4>"
        $newLines.Add($newLine)
        continue
    }

    $newLines.Add($line)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Final cleanup complete."
