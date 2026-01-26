$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

foreach ($line in $lines) {
    $newLine = $line

    # Replace Configuração line
    if ($line -match "Configura.*RPS.*\(Recibo.*Provis.*rio.*de.*Servi.*os\)") {
        Write-Host "Fixing Configuração line..."
        $newLine = '                                        <h4 style={{ margin: ''0 0 1rem 0'', fontSize: ''0.95rem'', fontWeight: 600 }}>Configuração RPS (Recibo Provisório de Serviços)</h4>'
    }
    # Replace Homologação title
    elseif ($line -match "Ambiente de Homologa.*\(Testes\)") {
        Write-Host "Fixing Homologação title..."
        $newLine = '                                            <h5 style={{ fontSize: ''0.85rem'', fontWeight: 600, color: ''var(--text-secondary)'', marginBottom: ''0.5rem'' }}>Ambiente de Homologação (Testes)</h5>'
    }
    # Replace Série RPS (matches both occurrences)
    elseif ($line -match "Input label=""S.*rie RPS""") {
        Write-Host "Fixing Série RPS..."
        # We need to preserve the rest of the line, just fix the label
        $newLine = $line -replace "label=""S.*rie RPS""", "label=""Série RPS"""
    }
    # Replace Próximo RPS (matches both occurrences)
    elseif ($line -match "Input label=""Pr.*ximo RPS""") {
        Write-Host "Fixing Próximo RPS..."
        $newLine = $line -replace "label=""Pr.*ximo RPS""", "label=""Próximo RPS"""
    }
    # Replace Produção title
    elseif ($line -match "Ambiente de Produ.*o") {
        Write-Host "Fixing Produção title..."
        $newLine = '                                            <h5 style={{ fontSize: ''0.85rem'', fontWeight: 600, color: ''var(--text-secondary)'', marginBottom: ''0.5rem'' }}>Ambiente de Produção</h5>'
    }
    # Replace Enviar Homologação
    elseif ($line -match "Enviar para Ambiente Nacional \(Homologa.*o\)") {
        Write-Host "Fixing Enviar Homologação..."
        $newLine = '                                                <span style={{ fontSize: ''0.85rem'' }}>Enviar para Ambiente Nacional (Homologação)</span>'
    }
    # Replace Enviar Produção
    elseif ($line -match "Enviar para Ambiente Nacional \(Produ.*o\)") {
        Write-Host "Fixing Enviar Produção..."
        $newLine = '                                                <span style={{ fontSize: ''0.85rem'' }}>Enviar para Ambiente Nacional (Produção)</span>'
    }

    $newLines.Add($newLine)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Done v4 line-by-line fix."
