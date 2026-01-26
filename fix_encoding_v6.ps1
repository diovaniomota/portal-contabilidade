$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

$cc = [char]0x00E7 # ç
$ca = [char]0x00E3 # ã
$co = [char]0x00F3 # ó
$ce = [char]0x00E9 # é

foreach ($line in $lines) {
    $newLine = $line

    # Fix Provisóio -> Provisório
    if ($line -match "Recibo Provis.io") {
        Write-Host "Fixing Provisório typo..."
        $newLine = $line -replace "Recibo Provis.io", "Recibo Provis${co}rio"
    }
    
    # Fix Séie -> Série
    if ($line -match "label=""S.ie RPS""") {
        Write-Host "Fixing Série typo..."
        $newLine = $line -replace "label=""S.ie RPS""", "label=""S${ce}rie RPS"""
    }

    # Fix any remaining broken chars if present (safety net)
    if ($line -match "Homologa.o") {
         $newLine = $newLine -replace "Homologa.o", "Homologa${cc}${ca}o"
    }
    if ($line -match "Produ.o") {
         $newLine = $newLine -replace "Produ.o", "Produ${cc}${ca}o"
    }

    $newLines.Add($newLine)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Done v6 typo fix."
