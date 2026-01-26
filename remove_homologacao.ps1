$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8
$newLines = New-Object System.Collections.Generic.List[string]

$skip = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    # Detect start of Homologacao block
    # It starts with <div style={{ marginBottom: '1.5rem' }}> and the NEXT line contains "Ambiente de Homologação"
    if ($line -match "marginBottom: '1.5rem'" -and ($i + 1 -lt $lines.Count) -and $lines[$i+1] -match "Ambiente de Homologa") {
        Write-Host "Starting removal at line $($i+1)"
        $skip = $true
        continue
    }

    if ($skip) {
        # We are skipping. Check if we reached the end of the block.
        # The block ends with a </div>. 
        # Inside the block we have <h5...>, <div...<Input...Input.../div>, <label...input...span.../label>
        # Finally </div>.
        
        # Heuristic: If we see "Ambiente de Produção", we definitely went too far (should have stopped).
        if ($line -match "Ambiente de Produ") {
            Write-Host "Hit Produção block. Stopping removal."
            $skip = $false
            # We must ADD this line because it's part of the next block
            # But wait, the previous line was the closing </div> of the homologacao block which we wanted to skip?
            # Actually, the structure is:
            # <div (Homologacao)> ... </div>
            # <div (Producao)> ... </div>
            
            # If I skip until I hit Producao, I might skip the closing div of Homologacao AND the empty line between them.
            # That is fine.
            $newLines.Add($line)
            continue
        }
        
        # If we just want to remove the specific block, we can just skip everything until we see the start of the next block
        # The next block starts with <div> (without marginBottom 1.5rem usually, or maybe it has?)
        # Let's look at the file content:
        # 925: </div>
        # 926:
        # 927: <div>
        # 928: <h5...>Ambiente de Produção</h5>
        
        # So we skip until we see "Ambiente de Produção" or the div wrapping it.
        # Let's just skip lines that contain the Homologacao fields.
        
        continue
    }

    $newLines.Add($line)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Homologacao block removed."
