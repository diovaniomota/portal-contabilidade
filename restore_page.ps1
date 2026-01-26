$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]
$headerLine = "                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configuração RPS (Recibo Provisório de Serviços)</h4>"

foreach ($line in $lines) {
    # Remove incomplete input lines
    if ($line.Trim() -eq '<Input label="Sé') {
        Write-Host "Removing incomplete input line."
        continue
    }

    $newLines.Add($line)

    # Insert header after the specific container div
    if ($line -match "padding: '1rem', background: 'var\(--bg-body\)', borderRadius: 'var\(--border-radius\)', border: '1px solid var\(--border-color\)' \}\}>") {
        Write-Host "Inserting header."
        $newLines.Add($headerLine)
    }
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Restore complete."
