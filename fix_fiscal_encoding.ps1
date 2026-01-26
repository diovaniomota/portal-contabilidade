
$path = "..\next-dashboard\app\actions\fiscal.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# Fix the mojibake comment
$old = "// RPS (NFSe) - Mapeamento ExplÃ­cito"
$new = "// RPS (NFSe) - Mapeamento Explicito"

$contentNormalized = $content -replace "`r`n", "`n"

if ($contentNormalized.Contains($old)) {
    $contentNormalized = $contentNormalized.Replace($old, $new)
    [System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
    Write-Host "Fixed encoding in fiscal.js"
} else {
    Write-Host "Could not find mojibake string in fiscal.js"
}
