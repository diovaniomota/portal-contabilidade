$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

$ce = [char]0x00E9 # é

foreach ($line in $lines) {
    $newLine = $line

    # Catch Série (or Séie or SÃ©rie)
    if ($line -match "label=""S.*RPS""") {
        Write-Host "Fixing Série (Broader Regex)..."
        $newLine = $line -replace "label=""S.*RPS""", "label=""S${ce}rie RPS"""
    }

    $newLines.Add($newLine)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Done v8."
