$path = "..\next-dashboard\app\configuracoes\page.js"
$content = Get-Content -Path $path -Raw -Encoding UTF8

# Replacement 1: State Initialization
$oldState = @"
        login_prefeitura: '',
        senha_prefeitura: ''
    });
"@
$newState = @"
        login_prefeitura: '',
        senha_prefeitura: '',
        serie_nfse_homologacao: '',
        proximo_nfse_homologacao: '',
        serie_nfse_producao: '',
        proxima_nfse_producao: '',
        ambiente_nacional_homologacao: false,
        ambiente_nacional_producao: false
    });
"@
$content = $content.Replace($oldState, $newState)

# Replacement 2: Fetch Mapping
$oldFetch = @"
                login_prefeitura: settings.login_prefeitura || '',
                senha_prefeitura: settings.senha_prefeitura || '',
"@
$newFetch = @"
                login_prefeitura: settings.login_prefeitura || '',
                senha_prefeitura: settings.senha_prefeitura || '',
                serie_nfse_homologacao: settings.serie_nfse_homologacao || '',
                proximo_nfse_homologacao: settings.proximo_nfse_homologacao || '',
                serie_nfse_producao: settings.serie_nfse_producao || '',
                proxima_nfse_producao: settings.proxima_nfse_producao || '',
                ambiente_nacional_homologacao: !!settings.ambiente_nacional_homologacao,
                ambiente_nacional_producao: !!settings.ambiente_nacional_producao,
"@
$content = $content.Replace($oldFetch, $newFetch)

# Replacement 3: Save Payload
$oldSave = @"
                login_prefeitura: companyData.login_prefeitura,
                senha_prefeitura: companyData.senha_prefeitura
            };
"@
$newSave = @"
                login_prefeitura: companyData.login_prefeitura,
                senha_prefeitura: companyData.senha_prefeitura,
                serie_nfse_homologacao: companyData.serie_nfse_homologacao,
                proximo_nfse_homologacao: companyData.proximo_nfse_homologacao,
                serie_nfse_producao: companyData.serie_nfse_producao,
                proxima_nfse_producao: companyData.proxima_nfse_producao,
                ambiente_nacional_homologacao: companyData.ambiente_nacional_homologacao,
                ambiente_nacional_producao: companyData.ambiente_nacional_producao
            };
"@
$content = $content.Replace($oldSave, $newSave)

# Replacement 4: JSX Implementation
$oldJsx = @"
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            Necessário para emissão de Nota Fiscal de Serviço (NFS-e).
                                        </p>
                                    </div>
                                )}
"@
$newJsx = @"
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                            Necessário para emissão de Nota Fiscal de Serviço (NFS-e).
                                        </p>
                                    </div>
                                )}

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
"@
$content = $content.Replace($oldJsx, $newJsx)

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "File updated successfully."
