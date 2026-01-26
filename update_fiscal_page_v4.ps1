$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

function Replace-Content {
    param ($inputStr, $pattern, $replacement, $name)
    if ($inputStr -match $pattern) {
        Write-Host "Found match for $name"
        return $inputStr -replace $pattern, $replacement
    } else {
        Write-Host "NO MATCH for $name"
        return $inputStr
    }
}

# 4. JSX (Retry)
# Match: {/* Tabela de Séries/Modelos (Informativa) */}
# We use a relaxed pattern
$pattern4 = "\{\/\*\s*Tabela de Séries\/Modelos \(Informativa\)\s*\*\/\}"
$replace4 = @"
{companyData.habilita_nfse && (
                                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configuração RPS (Recibo Provisório de Serviços)</h4>
                                        
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ambiente de Homologação (Testes)</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <Input label="Série RPS" name="serie_nfse_homologacao" value={companyData.serie_nfse_homologacao} onChange={handleChange} placeholder="Ex: 1" />
                                                <Input label="Próximo RPS" name="proximo_nfse_homologacao" value={companyData.proximo_nfse_homologacao} onChange={handleChange} placeholder="Ex: 1" />
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" name="ambiente_nacional_homologacao" checked={companyData.ambiente_nacional_homologacao} onChange={handleCheckboxChange} />
                                                <span style={{ fontSize: '0.85rem' }}>Enviar para Ambiente Nacional (Homologação)</span>
                                            </label>
                                        </div>

                                        <div>
                                            <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ambiente de Produção</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <Input label="Série RPS" name="serie_nfse_producao" value={companyData.serie_nfse_producao} onChange={handleChange} placeholder="Ex: 1" />
                                                <Input label="Próximo RPS" name="proxima_nfse_producao" value={companyData.proxima_nfse_producao} onChange={handleChange} placeholder="Ex: 1" />
                                            </div>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', cursor: 'pointer' }}>
                                                <input type="checkbox" name="ambiente_nacional_producao" checked={companyData.ambiente_nacional_producao} onChange={handleCheckboxChange} />
                                                <span style={{ fontSize: '0.85rem' }}>Enviar para Ambiente Nacional (Produção)</span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* Tabela de Séries/Modelos (Informativa) */}
"@
$content = Replace-Content -inputStr $content -pattern $pattern4 -replacement $replace4 -name "JSX"

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "Done v4."
