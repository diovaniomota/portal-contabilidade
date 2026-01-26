
$path = "..\next-dashboard\app\configuracoes\page.js"
if (-not (Test-Path $path)) {
    Write-Host "File not found at $path"
    exit
}

$lines = Get-Content -Path $path -Encoding UTF8
Write-Host "Total lines: $($lines.Count)"

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    if ($line -match "Configuração RPS" -and $lines[$i+1] -match "Credenciais Prefeitura") {
        Write-Host "Found Stray Header at line $($i+1)"
    }

    if ($line -match "\{companyData\.habilita_nfse && \(" ) {
         # Check next few lines
        for ($j = 1; $j -le 3; $j++) {
            if (($i + $j) -lt $lines.Count) {
                 # Debug: Print what we are checking
                 # Write-Host "Checking line $($i+$j+1): $($lines[$i+$j])"
                if ($lines[$i+$j] -match "Configuração RPS" -and -not ($lines[$i+$j+1] -match "Credenciais Prefeitura")) {
                    Write-Host "Found RPS Block Start at line $($i+1)"
                    break
                }
            }
        }
    }
}
