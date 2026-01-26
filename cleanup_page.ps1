$path = "..\next-dashboard\app\configuracoes\page.js"
$lines = Get-Content -Path $path -Encoding UTF8

$newLines = New-Object System.Collections.Generic.List[string]

foreach ($line in $lines) {
    # Skip the specific garbage lines
    if ($line -match "io de Servi.*os\)</h4") {
        Write-Host "Removing garbage line 912: $line"
        continue
    }
    if ($line.Trim() -eq '<Input label="Sé') {
        Write-Host "Removing garbage line (partial input): $line"
        continue
    }

    $newLines.Add($line)
}

$newLines | Set-Content -Path $path -Encoding UTF8
Write-Host "Cleanup complete."
