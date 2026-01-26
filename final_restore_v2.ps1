$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$newLines = New-Object System.Collections.Generic.List[string]

$headerCount = 0

foreach ($line in $lines) {
    # 1. Restore Senha input
    if ($line -match '<Input label="E-mail" name="email"') {
        $newLines.Add($line)
        $newLines.Add('                            {!editingUser && <Input label="Senha" name="password" type="password" value={userForm.password} onChange={handleUserFormChange} required minLength={6} />}')
        Write-Host "RESTORED PASSWORD INPUT"
        continue
    }

    # 2. Handle Header (Remove duplicates)
    if ($line -match "RPS \(Recibo") {
        $headerCount++
        if ($headerCount -gt 1) {
            Write-Host "REMOVED DUPLICATE HEADER (Count $headerCount): $line"
            continue
        }
        # Ensure encoding is correct for the first one
        $cc = [char]0x00E7
        $ca = [char]0x00E3
        $co = [char]0x00F3
        $fixed = "                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configura${cc}${ca}o RPS (Recibo Provis${co}rio de Servi${cc}os)</h4>"
        $newLines.Add($fixed)
        Write-Host "KEPT HEADER 1"
        continue
    }

    $newLines.Add($line)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Done v2."
