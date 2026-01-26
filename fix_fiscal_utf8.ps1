
$path = "..\next-dashboard\app\actions\fiscal.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Regex replace to be safe
$content = $content -replace "// RPS \(NFSe\) - Mapeamento Expl.*", "// RPS (NFSe) - Mapeamento Explícito"

[System.IO.File]::WriteAllText($path, $content, [System.Text.Encoding]::UTF8)
Write-Host "Fixed encoding in fiscal.js"
