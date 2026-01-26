
$path = "..\next-dashboard\app\configuracoes\page.js"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

$oldBlock = @"
            };
            delete payload.ambiente_nacional_homologacao;
            delete payload.serie_nfse_homologacao;
            delete payload.proximo_nfse_homologacao;
            delete payload.proxima_nfse_homologacao;
            delete payload.ambiente_nacional_producao;
            delete payload.serie_nfse_producao;
            delete payload.proxima_nfse_producao;


            // Salvar Configurações Fiscais no Banco Local
            const { data: existing } = await supabase
                .from('company_settings')
                .select('id')
                .eq('organization_id', organizationId)
                .single();

            let error;
            if (existing) {
                ({ error } = await supabase.from('company_settings').update(payload).eq('id', existing.id));
            } else {
                ({ error } = await supabase.from('company_settings').insert([{ ...payload, organization_id: organizationId }]));
            }

            if (error) {
                const msg = String(error.message || '');
                // Tratamento erro coluna ver_proc (legacy fix)
                if (msg.includes("Could not find the 'ver_proc' column") || msg.toLowerCase().includes('column \"ver_proc\" does not exist')) {
                    const retryPayload = { ...payload };
                    delete retryPayload.ver_proc;
                    if (existing) {
                        await supabase.from('company_settings').update(retryPayload).eq('id', existing.id);
                    } else {
                        await supabase.from('company_settings').insert([{ ...retryPayload, organization_id: organizationId }]);
                    }
"@

$newBlock = @"
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


            // Salvar Configurações Fiscais no Banco Local
            const { data: existing } = await supabase
                .from('company_settings')
                .select('id')
                .eq('organization_id', organizationId)
                .single();

            let error;
            if (existing) {
                ({ error } = await supabase.from('company_settings').update(supabasePayload).eq('id', existing.id));
            } else {
                ({ error } = await supabase.from('company_settings').insert([{ ...supabasePayload, organization_id: organizationId }]));
            }

            if (error) {
                const msg = String(error.message || '');
                // Tratamento erro coluna ver_proc (legacy fix)
                if (msg.includes("Could not find the 'ver_proc' column") || msg.toLowerCase().includes('column \"ver_proc\" does not exist')) {
                    const retryPayload = { ...supabasePayload };
                    delete retryPayload.ver_proc;
                    if (existing) {
                        await supabase.from('company_settings').update(retryPayload).eq('id', existing.id);
                    } else {
                        await supabase.from('company_settings').insert([{ ...retryPayload, organization_id: organizationId }]);
                    }
"@

# Normalize line endings for replacement
$contentNormalized = $content -replace "`r`n", "`n"
$oldBlockNormalized = $oldBlock -replace "`r`n", "`n"
$newBlockNormalized = $newBlock -replace "`r`n", "`n"

if ($contentNormalized.Contains($oldBlockNormalized)) {
    $contentNormalized = $contentNormalized.Replace($oldBlockNormalized, $newBlockNormalized)
    # Convert back to CRLF if needed, or just save
    [System.IO.File]::WriteAllText($path, $contentNormalized, [System.Text.Encoding]::UTF8)
    Write-Host "Sync logic fixed successfully."
} else {
    Write-Host "Could not find the target block for replacement."
    # Debug: Print a snippet of what we found
    Write-Host "Searching for start: " $oldBlockNormalized.Substring(0, 50)
}
