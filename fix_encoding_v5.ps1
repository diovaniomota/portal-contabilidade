$path = "..\next-dashboard\app\configuracoes\page.js"
# Force read as UTF8
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

# Define chars
$cc = [char]0x00E7 # ç
$ca = [char]0x00E3 # ã
$co = [char]0x00F3 # ó
$ce = [char]0x00E9 # é

foreach ($line in $lines) {
    $newLine = $line

    # Configuração RPS (Recibo Provisório de Serviços)
    if ($line -match "Configura.*RPS") {
        Write-Host "Fixing Configuração..."
        $newLine = "                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configura$cc$ca`o RPS (Recibo Provis$co`rio de Servi$cc`os)</h4>"
    }
    # Ambiente de Homologação (Testes)
    elseif ($line -match "Ambiente de Homologa.*\(Testes\)") {
        Write-Host "Fixing Homologação..."
        $newLine = "                                            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ambiente de Homologa$cc$ca`o (Testes)</h5>"
    }
    # Série RPS
    elseif ($line -match "Input label=""S.*rie RPS""") {
        Write-Host "Fixing Série..."
        $newLine = $line -replace "label=""S.*rie RPS""", "label=""S$ce`rie RPS"""
    }
    # Próximo RPS
    elseif ($line -match "Input label=""Pr.*ximo RPS""") {
        Write-Host "Fixing Próximo..."
        $newLine = $line -replace "label=""Pr.*ximo RPS""", "label=""Pr$co`ximo RPS"""
    }
    # Ambiente de Produção
    elseif ($line -match "Ambiente de Produ.*o<") {
        Write-Host "Fixing Produção..."
        $newLine = "                                            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ambiente de Produ$cc$ca`o</h5>"
    }
    # Enviar ... (Homologação)
    elseif ($line -match "Enviar para Ambiente Nacional \(Homologa.*o\)") {
        Write-Host "Fixing Enviar Homologação..."
        $newLine = "                                                <span style={{ fontSize: '0.85rem' }}>Enviar para Ambiente Nacional (Homologa$cc$ca`o)</span>"
    }
    # Enviar ... (Produção)
    elseif ($line -match "Enviar para Ambiente Nacional \(Produ.*o\)") {
        Write-Host "Fixing Enviar Produção..."
        $newLine = "                                                <span style={{ fontSize: '0.85rem' }}>Enviar para Ambiente Nacional (Produ$cc$ca`o)</span>"
    }

    $newLines.Add($newLine)
}

# Write back with explicit UTF8 encoding (which includes BOM in PS5, usually safe for Node/React)
$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Done v5 with char codes."
