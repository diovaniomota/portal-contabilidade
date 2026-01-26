
$path = "..\next-dashboard\app\configuracoes\page.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 1. Define the block of deletes to be replaced
$oldDeletes = @"
            };
            delete payload.ambiente_nacional_homologacao;
            delete payload.serie_nfse_homologacao;
            delete payload.proximo_nfse_homologacao;
            delete payload.proxima_nfse_homologacao;
            delete payload.ambiente_nacional_producao;
            delete payload.serie_nfse_producao;
            delete payload.proxima_nfse_producao;
"@

$newDeletes = @"
            };

            // Payload específico para o Supabase (remove campos que não existem colunas no banco)
            const supabasePayload = { ...payload };
            delete supabasePayload.ambiente_nacional_homologacao;
            delete supabasePayload.serie_nfse_homologacao;
            delete supabasePayload.proximo_nfse_homologacao;
            delete supabasePayload.proxima_nfse_homologacao;
            delete supabasePayload.ambiente_nacional_producao;
            delete supabasePayload.serie_nfse_producao;
            delete supabasePayload.proxima_nfse_producao;
"@

# Normalize for matching
$contentNormalized = $content -replace "`r`n", "`n"
$oldDeletesNormalized = $oldDeletes -replace "`r`n", "`n"
$newDeletesNormalized = $newDeletes -replace "`r`n", "`n"

if ($contentNormalized.Contains($oldDeletesNormalized)) {
    $contentNormalized = $contentNormalized.Replace($oldDeletesNormalized, $newDeletesNormalized)
    Write-Host "Replaced delete block."
} else {
    Write-Host "Could not find delete block."
    # Fallback: try to find just the first few lines if the user edited something
    $fallbackSearch = "            };`n            delete payload.ambiente_nacional_homologacao;"
    if ($contentNormalized.Contains($fallbackSearch)) {
        Write-Host "Trying partial match..."
        # This is risky without strict bounds, but let's try to match the whole block with regex if exact match failed
        # Actually, let's assume the exact match failed due to whitespace and try a simpler approach
    }
}

# 2. Replace usages in Supabase calls
# We need to be careful not to replace the Focus call which is further down
# Focus call: updateFiscalSettingsAction(payload) -> Should stay 'payload'

# Replace update(payload)
$contentNormalized = $contentNormalized.Replace("update(payload)", "update(supabasePayload)")
# Replace insert([{ ...payload
$contentNormalized = $contentNormalized.Replace("insert([{ ...payload", "insert([{ ...supabasePayload")
# Replace retryPayload source
$contentNormalized = $contentNormalized.Replace("const retryPayload = { ...payload };", "const retryPayload = { ...supabasePayload };")

# Save
[System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
Write-Host "Updated Supabase calls to use supabasePayload."
