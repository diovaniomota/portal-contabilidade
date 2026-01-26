
$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = @()
$skip = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    
    # 1. Remove the stray header inside the Credenciais block (Line 899 approx)
    if ($line -match "Configuração RPS" -and $lines[$i+1] -match "Credenciais Prefeitura") {
        continue
    }

    # 2. Remove the main RPS block (Lines 910-924 approx)
    # It starts with {companyData.habilita_nfse && (
    # followed by a div, followed by Configuração RPS header
    # AND it is NOT the Credenciais block (which we just handled or kept)
    
    # Check if this is the start of the RPS block to remove
    if ($line -match "\{companyData\.habilita_nfse && \(" ) {
        # Check next few lines to confirm it's the RPS block (not Credenciais)
        $isRPSBlock = $false
        for ($j = 1; $j -le 3; $j++) {
            if (($i + $j) -lt $lines.Count) {
                if ($lines[$i+$j] -match "Configuração RPS" -and -not ($lines[$i+$j+1] -match "Credenciais Prefeitura")) {
                    $isRPSBlock = $true
                    break
                }
            }
        }
        
        if ($isRPSBlock) {
            $skip = $true
        }
    }

    if ($skip) {
        # Check for the closing )} of the block
        if ($line -match "\)\}") {
            $skip = $false
        }
        continue
    }

    $newLines += $line
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "RPS configuration removed successfully."
