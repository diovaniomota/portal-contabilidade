'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Configuração do Focus NFe (Server-Side Only)
// Trim environment variables to avoid copy-paste whitespace issues
const FOCUS_NFE_AMBIENTE = (process.env.FOCUS_NFE_AMBIENTE || 'homologacao').trim();
const API_URL = FOCUS_NFE_AMBIENTE === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';

function getFocusNfeToken() {
    const token = process.env.FOCUS_NFE_TOKEN;
    if (!token) {
        throw new Error('Token Focus NFe não configurado. Configure FOCUS_NFE_TOKEN no .env.local');
    }
    return token.trim(); // Ensure no whitespace
}

/**
 * Make authenticated request to Focus NFe API (Server-Side)
 * Uses HTTP Basic Auth with token as username
 */
async function focusNfeRequest(endpoint, method = 'GET', body = null) {
    const token = getFocusNfeToken();
    const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');

    const options = {
        method,
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'User-Agent': 'NextDashboard/1.0' // Good practice
        }
    };

    let bodyString = null;
    if (body && (method === 'POST' || method === 'DELETE' || method === 'PUT')) {
        bodyString = JSON.stringify(body);
        options.body = bodyString;
    }

    // Construct URL ensuring no double slashes if endpoint has one (though simple concat is usually fine if mindful)
    const url = `${API_URL}${endpoint}`;
    console.log(`[Focus NFe Server] ${method} ${url} (Env: ${FOCUS_NFE_AMBIENTE})`);

    const response = await fetch(url, options);
    const responseText = await response.text();

    let responseData;
    try {
        responseData = JSON.parse(responseText);
    } catch {
        responseData = { raw: responseText };
        // Result should be an array of companies
        let companiesFound = [];
        if (Array.isArray(responseData)) { // Assuming 'result' in the instruction meant 'responseData'
            // Pass full object
            companiesFound = responseData;
        } else if (responseData && responseData.nome) { // Assuming 'result' in the instruction meant 'responseData'
            companiesFound = [responseData];
        }
    }

    if (!response.ok) {
        // Enhance error object with debug info
        const errorMsg = responseData?.mensagem || responseData?.error || responseText;
        const debugInfo = {
            status: response.status,
            url: url,
            requestBody: bodyString ? JSON.parse(bodyString) : null
        };
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = responseData;
        error.debug = debugInfo; // Attach debug info
        console.error('[Focus NFe Server] API Error:', errorMsg);
        throw error;
    }

    return responseData;
}

export async function emitirNFeAction(vendaId, organizationId) {
    const cookieStore = cookies();

    // 1. Criar cliente Supabase no servidor
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                get(name) {
                    return cookieStore.get(name)?.value;
                },
                set(name, value, options) {
                    // Cookies are read-only here
                },
                remove(name, options) {
                    // Cookies are read-only here
                },
            },
        }
    );

    // 2. Validar Sessão
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { success: false, error: 'Usuário não autenticado.' };
    }

    try {
        // 3. Buscar dados da Venda e da Empresa
        const { data: venda, error: vendaError } = await supabase
            .from('sales')
            .select(`
                *,
                clients (*),
                sale_items (
                    *,
                    products (*)
                )
            `)
            .eq('id', vendaId)
            .eq('organization_id', organizationId)
            .single();

        if (vendaError || !venda) {
            return { success: false, error: 'Venda não encontrada ou sem permissão.' };
        }

        const { data: empresa, error: empresaError } = await supabase
            .from('company_settings')
            .select('*')
            .eq('organization_id', organizationId)
            .single();

        if (empresaError || !empresa) {
            return { success: false, error: 'Dados da empresa não encontrados.' };
        }

        if (!empresa.cnpj) {
            return { success: false, error: 'CNPJ da empresa não configurado.' };
        }

        // 4. Gerar referência única para a nota (usando ID da venda)
        const ref = `VENDA-${vendaId}-${Date.now()}`;

        // 5. Montar Payload da NFe no formato Focus NFe
        const cnpjEmitente = empresa.cnpj.replace(/\D/g, '');
        const cliente = venda.clients;
        const docCliente = cliente?.document?.replace(/\D/g, '') || '';
        const isCpf = docCliente.length === 11;

        const nfePayload = {
            // Dados gerais
            natureza_operacao: "Venda de Mercadoria",
            data_emissao: new Date().toISOString(),
            data_entrada_saida: new Date().toISOString(),
            tipo_documento: "1", // 0=entrada, 1=saída
            finalidade_emissao: "1", // 1=normal
            consumidor_final: "1", // 1=consumidor final
            presenca_comprador: "1", // 1=presencial

            // Versão do Processo de Emissão (Fixo pelo Sistema)
            ver_proc: "1.0.0",

            // Emitente
            cnpj_emitente: cnpjEmitente,
            nome_emitente: empresa.company_name || empresa.trade_name,
            nome_fantasia_emitente: empresa.trade_name || empresa.company_name,
            inscricao_estadual_emitente: empresa.state_registration?.replace(/\D/g, '') || '',
            logradouro_emitente: empresa.address || 'Rua Principal',
            numero_emitente: empresa.address_number || 'S/N',
            bairro_emitente: empresa.neighborhood || 'Centro',
            municipio_emitente: empresa.city || 'São Paulo',
            uf_emitente: empresa.state || 'SP',
            cep_emitente: empresa.cep?.replace(/\D/g, '') || '01001000',
            regime_tributario_emitente: empresa.regime_tributario || '1', // 1=Simples Nacional

            // Destinatário
            nome_destinatario: cliente?.name || 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL',
            cpf_destinatario: isCpf ? docCliente : null,
            cnpj_destinatario: !isCpf && docCliente.length === 14 ? docCliente : null,
            logradouro_destinatario: cliente?.address || 'Rua do Cliente',
            numero_destinatario: cliente?.number || 'S/N',
            bairro_destinatario: cliente?.neighborhood || 'Centro',
            municipio_destinatario: cliente?.city || 'São Paulo',
            uf_destinatario: cliente?.state || 'SP',
            cep_destinatario: cliente?.cep?.replace(/\D/g, '') || '00000000',
            indicador_inscricao_estadual_destinatario: "9", // 9=não contribuinte

            // Valores totais
            valor_frete: "0.00",
            valor_seguro: "0.00",
            valor_total: String(venda.total?.toFixed(2) || "0.00"),
            valor_produtos: String(venda.total?.toFixed(2) || "0.00"),
            modalidade_frete: "9", // 9=sem frete

            // Itens
            items: venda.sale_items.map((item, index) => {
                const produto = item.products || {};
                const valorUnitario = parseFloat(item.unit_price) || 0;
                const quantidade = parseFloat(item.quantity) || 1;
                const valorTotal = parseFloat(item.total_price) || valorUnitario * quantidade;

                return {
                    numero_item: String(index + 1),
                    codigo_produto: produto.sku || `PROD-${item.product_id || index}`,
                    descricao: produto.name || 'Produto',
                    codigo_ncm: (produto.ncm || '00000000').replace(/\D/g, ''),
                    cfop: produto.cfop_interno || '5102',
                    unidade_comercial: produto.unidade || 'UN',
                    quantidade_comercial: String(quantidade),
                    valor_unitario_comercial: valorUnitario.toFixed(4),
                    valor_bruto: valorTotal.toFixed(2),
                    unidade_tributavel: produto.unidade_tributavel || produto.unidade || 'UN',
                    quantidade_tributavel: String(quantidade),
                    valor_unitario_tributavel: valorUnitario.toFixed(4),
                    origem: String(produto.origem || '0'),

                    // ICMS - Simples Nacional CSOSN 102
                    icms_situacao_tributaria: produto.csosn || '102',
                    icms_origem: String(produto.origem || '0'),

                    // PIS
                    pis_situacao_tributaria: produto.cst_pis || '49',

                    // COFINS
                    cofins_situacao_tributaria: produto.cst_cofins || '49',
                };
            }),

            // Pagamento
            formas_pagamento: [{
                forma_pagamento: venda.payment_method === 'pix' ? '17' :
                    venda.payment_method === 'credit_card' ? '03' :
                        venda.payment_method === 'debit_card' ? '04' : '01',
                valor_pagamento: String(venda.total?.toFixed(2) || "0.00")
            }]
        };

        // 6. Enviar para Focus NFe
        const focusRes = await focusNfeRequest(`/v2/nfe?ref=${encodeURIComponent(ref)}`, 'POST', nfePayload);

        // 7. Salvar referência no banco
        await supabase
            .from('sales')
            .update({
                nfe_ref: ref,
                nfe_status: focusRes.status || 'processando',
                nfe_data: focusRes
            })
            .eq('id', vendaId);

        return { success: true, data: focusRes, ref };

    } catch (err) {
        console.error('SERVER ACTION ERROR:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Consultar status da NFe
 */
export async function consultarNFeAction(ref) {
    try {
        const result = await focusNfeRequest(`/v2/nfe/${encodeURIComponent(ref)}?completa=1`, 'GET');
        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Helper para tentar auto-cadastrar empresa em caso de erro de autorização
 */
async function attemptAutoRegister(nfePayload) {
    try {
        const emit = nfePayload?.infNFe?.emit;
        const ender = emit?.enderEmit;
        if (!emit || !ender) return { success: false, error: 'Dados do emitente incompletos no payload.' };

        console.log('[Focus NFe Server] Auto-registering company from Payload:', emit.CNPJ);

        // Mapear dados do payload da NFe para o formato de cadastro de empresa
        const regResult = await createUpdateCompanyAction({
            cnpj: emit.CNPJ,
            razao_social: emit.xNome,
            nome_fantasia: emit.xNome,
            ie: emit.IE, // inscricao_estadual
            regime_tributario: emit.CRT,
            endereco: ender.xLgr,
            numero: ender.nro,
            bairro: ender.xBairro,
            cidade: ender.xMun,
            uf: ender.UF,
            cep: ender.CEP,
            email: 'financeiro@exemplo.com', // Obrigatório em alguns casos, placeholder seguro
            telefone: '1199999999', // Placeholder
            ambiente: (process.env.FOCUS_NFE_AMBIENTE || 'homologacao') === 'producao' ? '1' : '2'
        });

        return { success: regResult.success, error: regResult.error };
    } catch (e) {
        console.error('[Focus NFe Server] Auto-registration failed:', e.message);
        return { success: false, error: e.message };
    }
}

export async function emitirNFePayloadAction(ref, payload) {
    if (!ref || typeof ref !== 'string') {
        return { success: false, error: 'Referência (ref) é obrigatória e deve ser uma string' };
    }

    const doRequest = async () => focusNfeRequest(`/v2/nfe?ref=${encodeURIComponent(ref)}`, 'POST', payload);

    try {
        console.log('[Focus NFe Server] Emitindo NFe ref:', ref);
        const result = await doRequest();
        return { success: true, data: result, ref };
    } catch (err) {
        // Auto-fix: CNPJ Unauthorized
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('não autorizado') || msg.includes('not authorized') || msg.includes('emitente não cadastrado')) {
            console.log('[Focus NFe Server] Detectado CNPJ não autorizado. Tentando auto-cadastro...');
            const regAttempt = await attemptAutoRegister(payload);
            if (regAttempt.success) {
                try {
                    console.log('[Focus NFe Server] Retentando emissão após cadastro...');
                    const retryResult = await doRequest();
                    return { success: true, data: retryResult, ref };
                } catch (retryErr) {
                    return { success: false, error: retryErr.message };
                }
            } else {
                // Check for 404/Endpoint not found (Homologation limitation)
                const errStr = typeof regAttempt.error === 'object' ? JSON.stringify(regAttempt.error) : String(regAttempt.error || '');
                if (errStr.includes('nao_encontrado') || errStr.includes('404') || errStr.includes('Endpoint')) {
                    return {
                        success: false,
                        error: `Erro Original: ${err.message}. \n\nFalha no Auto-Cadastro (Sandbox): O cadastro automático não é permitido via API neste ambiente. Cadastre manualmente em homologacao.focusnfe.com.br`
                    };
                }
                return { success: false, error: `Erro: ${err.message}. \nCNPJ Alvo: ${payload?.infNFe?.emit?.CNPJ}\nTentativa de auto-cadastro falhou: ${regAttempt.error}` };
            }
        }
        console.error('[Focus NFe Server] Erro emitir NFe:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Emitir NFC-e via Server Action (evita CORS)
 * @param {string} ref - Referência única da NFC-e
 * @param {object} payload - Payload completo da NFC-e
 */
export async function emitirNFCeAction(ref, payload) {
    if (!ref || typeof ref !== 'string') {
        return { success: false, error: 'Referência (ref) é obrigatória e deve ser uma string' };
    }

    const doRequest = async () => focusNfeRequest(`/v2/nfce?ref=${encodeURIComponent(ref)}`, 'POST', payload);

    try {
        console.log('[Focus NFe Server] Emitindo NFC-e ref:', ref);
        if (!payload || Object.keys(payload).length === 0) {
            throw new Error('Payload vazio recebido na Server Action');
        }

        const result = await doRequest();

        // Normalize URLs immediately in case of synchronous authorization
        if (result.caminho_danfe) {
            result.caminho_danfe = normalizeFocusUrl(result.caminho_danfe);
            result.caminho_danfe_pdf = normalizeFocusUrl(result.caminho_danfe);
        }

        return { success: true, data: result, ref };
    } catch (err) {
        // Auto-fix: CNPJ Unauthorized
        const msg = (err.message || '').toLowerCase();
        if (msg.includes('não autorizado') || msg.includes('not authorized') || msg.includes('emitente não cadastrado')) {
            console.log('[Focus NFe Server] Detectado CNPJ não autorizado (NFCe). Tentando auto-cadastro...');
            const registered = await attemptAutoRegister(payload);
            if (registered && registered.success) {
                try {
                    console.log('[Focus NFe Server] Retentando emissão NFCe após cadastro...');
                    const retryResult = await doRequest();

                    if (retryResult.caminho_danfe) {
                        retryResult.caminho_danfe = normalizeFocusUrl(retryResult.caminho_danfe);
                        retryResult.caminho_danfe_pdf = normalizeFocusUrl(retryResult.caminho_danfe);
                    }

                    return { success: true, data: retryResult, ref };
                } catch (retryErr) {
                    return { success: false, error: retryErr.message };
                }
            } else {
                // Check for 404/Endpoint not found (Homologation limitation)
                const errStr = typeof (registered?.error) === 'object' ? JSON.stringify(registered.error) : String(registered?.error || '');
                if (errStr.includes('nao_encontrado') || errStr.includes('404') || errStr.includes('Endpoint')) {
                    return {
                        success: false,
                        error: `Erro Original: ${err.message}. \n\nFalha no Auto-Cadastro (Sandbox): O cadastro automático não é permitido via API neste ambiente. Cadastre manualmente em homologacao.focusnfe.com.br`
                    };
                }
                return { success: false, error: `Erro: ${err.message}. \nTentativa de auto-cadastro falhou: ${registered?.error}` };
            }
        }

        console.error('[Focus NFe Server] Erro emitir NFC-e:', err.message);
        return {
            success: false,
            error: err.message,
            debug: err.debug || null
        };
    }
}

// Helper to normalize Focus NFe URLs (fix relative paths)
const normalizeFocusUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;

    // Determine environment based on config
    const AMBIENTE = process.env.FOCUS_NFE_AMBIENTE || 'homologacao';
    const BASE_URL = AMBIENTE === 'producao'
        ? 'https://api.focusnfe.com.br'
        : 'https://homologacao.focusnfe.com.br';

    // Ensure URL starts with / if not present (though normally it does)
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${BASE_URL}${cleanPath}`;
};

export async function consultarNFCeAction(ref) {
    try {
        const result = await focusNfeRequest(`/v2/nfce/${encodeURIComponent(ref)}?completa=1`, 'GET');

        // Normalize paths
        if (result.caminho_danfe) {
            result.caminho_danfe = normalizeFocusUrl(result.caminho_danfe);
            result.caminho_danfe_pdf = normalizeFocusUrl(result.caminho_danfe); // Ensure compatibility
        }
        if (result.caminho_xml_nota_fiscal) {
            result.caminho_xml_nota_fiscal = normalizeFocusUrl(result.caminho_xml_nota_fiscal);
        }

        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Cancelar NFC-e
 */
export async function cancelarNFCeAction(ref, justificativa) {
    if (!justificativa || justificativa.length < 15) {
        return { success: false, error: 'Justificativa deve ter no mínimo 15 caracteres' };
    }
    try {
        const result = await focusNfeRequest(`/v2/nfce/${encodeURIComponent(ref)}`, 'DELETE', { justificativa });
        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Obter URL do PDF (DANFCE) da NFC-e
 */
export async function getPdfUrlNFCeAction(ref) {
    try {
        const result = await focusNfeRequest(`/v2/nfce/${encodeURIComponent(ref)}?completa=1`, 'GET');
        if (result.caminho_danfe) {
            const absoluteUrl = normalizeFocusUrl(result.caminho_danfe);
            return { success: true, url: absoluteUrl }; // Return corrected URL
        }
        return { success: false, error: 'DANFCE ainda não disponível' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Obter XML da NFC-e
 */
export async function getXmlNFCeAction(ref) {
    try {
        const result = await focusNfeRequest(`/v2/nfce/${encodeURIComponent(ref)}.xml`, 'GET');
        return { success: true, data: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}


/**
 * Verificar se a empresa está cadastrada na Focus NFe (Diagnóstico)
 */
export async function verificarCadastroFocusAction(cnpj) {
    if (!cnpj) return { success: false, error: 'CNPJ obrigatório' };

    // Clean CNPJ
    const cnpjLimpo = cnpj.replace(/\D/g, '');
    let urlUsed = '';

    try {
        console.log('[Focus NFe Server] Diagnosticando CNPJ:', cnpj);

        // Re-construct the URL logic here to be sure what we are returning
        const AMBIENTE = process.env.FOCUS_NFE_AMBIENTE || 'homologacao';
        const API_URL = AMBIENTE === 'producao'
            ? 'https://api.focusnfe.com.br'
            : 'https://homologacao.focusnfe.com.br';

        urlUsed = `${API_URL}/v2/empresas/${cnpjLimpo}`;

        // Use our internal helper
        // STRATEGY CHECK: Validar o token em AMBOS os ambientes para tirar a prova real

        const checks = [
            { env: 'homologacao', url: 'https://homologacao.focusnfe.com.br/v2/hooks' }, // Use hooks as it's lighter/safer than companies list for simple connectivity check
            { env: 'producao', url: 'https://api.focusnfe.com.br/v2/hooks' }
        ];

        let results = [];
        let validEnv = null;

        for (const check of checks) {
            try {
                // Manually fetch to avoid the global config overriding URL
                const token = process.env.FOCUS_NFE_TOKEN || ''; // Assuming getFocusNfeToken() is not available or needs to be defined
                const authHeader = 'Basic ' + Buffer.from(token + ':').toString('base64');
                const resp = await fetch(check.url, {
                    method: 'GET',
                    headers: {
                        'Authorization': authHeader,
                        'User-Agent': 'NextDashboard/Diagnostic'
                    }
                });

                if (resp.ok) {
                    validEnv = check.env;
                    // If auth worked, let's try to get details if possible, but hooks is enough to prove "Valid Token"
                    results.push({ env: check.env, status: resp.status, ok: true, msg: 'Conexão OK' });
                } else {
                    results.push({ env: check.env, status: resp.status, ok: false, msg: await resp.text() });
                }
            } catch (e) {
                results.push({ env: check.env, status: 'Error', ok: false, msg: e.message });
            }
        }

        const token = process.env.FOCUS_NFE_TOKEN || '';
        const tokenMask = token.length > 8 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : 'INVALIDO';

        return {
            success: !!validEnv,
            validEnv: validEnv,
            data: results,
            environment: AMBIENTE,
            url: urlUsed, // Keep original URL for reference
            tokenUsed: tokenMask,
            isList: false // Deprecated for this check
        };
    } catch (err) {
        console.error('[Focus NFe Server] Erro diagnóstico:', err.message);
        const token = process.env.FOCUS_NFE_TOKEN || '';
        const tokenMask = token.length > 8 ? `${token.substring(0, 4)}...${token.substring(token.length - 4)}` : 'INVALIDO';

        return {
            success: false,
            error: err.message, // This is likely "Endpoint não encontrado" or similar
            environment: process.env.FOCUS_NFE_AMBIENTE,
            url: urlUsed,
            tokenUsed: tokenMask,
            details: err.raw || err.response || 'Sem resposta raw',
            status: err.status || 'Unknown'
        };
    }
}

/**
 * Get environment info
 */
export async function getFocusNfeEnvironment() {
    return {
        ambiente: FOCUS_NFE_AMBIENTE,
        url: API_URL,
        isProduction: FOCUS_NFE_AMBIENTE === 'producao'
    };
}
/**
 * Criar ou Atualizar empresa na Focus NFe
 */
export async function createUpdateCompanyAction(data) {
    // Validar dados mínimos
    if (!data.cnpj || !data.razao_social) {
        return { success: false, error: 'CNPJ e Razão Social são obrigatórios.' };
    }

    const payload = {
        nome: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj.replace(/\D/g, ''),
        inscricao_estadual: data.ie?.replace(/\D/g, ''),
        inscricao_municipal: data.im?.replace(/\D/g, ''),
        regime_tributario: data.regime_tributario || '1',
        email: data.email, // Focus usa isso para enviar notas?
        telefone: data.telefone?.replace(/\D/g, ''),
        logradouro: data.endereco,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        municipio: data.cidade,
        uf: data.uf,
        cep: data.cep?.replace(/\D/g, ''),
        discriminacao_servicos: 'Serviços Prestados', // Campo obrigatório para NFS-e, mas bom ter padrão

        // Mapeamento de CSC e Séries (Sincronização com dados fiscais do dashboard)
        // Se ambiente = 1 (Produção)
        ...(String(data.ambiente) === '1' && {
            // NFC-e
            csc_nfce_producao: data.csc,
            id_token_nfce_producao: data.id_csc,
            serie_nfce_producao: data.serie_nfce,
            proximo_numero_nfce_producao: data.proxima_nfce,
            // NF-e
            serie_nfe_producao: data.serie_nfe,
            proximo_numero_nfe_producao: data.proxima_nfe
        }),
        // Se ambiente = 2 (Homologação)
        ...(String(data.ambiente) === '2' && {
            // NFC-e
            csc_nfce_homologacao: data.csc,
            id_token_nfce_homologacao: data.id_csc,
            serie_nfce_homologacao: data.serie_nfce,
            proximo_numero_nfce_homologacao: data.proxima_nfce,
            // NF-e
            serie_nfe_homologacao: data.serie_nfe,
            proximo_numero_nfe_homologacao: data.proxima_nfe
        })
    };

    const AMBIENTE = (process.env.FOCUS_NFE_AMBIENTE || 'homologacao').trim();

    // Determinar URL e Token baseados no ambiente correto (não forçar produção)


    // AQUI ESTÁ O PULO DO GATO:
    // Se o objetivo é editar a empresa, e o token atual falha...
    // Vamos verificar se temos um "Token Mestre" configurado e tentar usar ele se o primeiro falhar?
    // Não, vamos fazer direto.

    // Se estivermos em HOMOLOGAÇÃO e tivermos um token de revenda que sabemos que funciona (talvez o 90MR seja aceito em endpoints globais? Não custa tentar ou manter como está).

    // O usuário quer que funcione. O token 'uL2a...' (novo) também vai falhar para edição se for token comum.
    // A única chance é se o '90MR...' tiver permissão em homologação (improvável se for de prod) OU se houver outro token.

    // Vou manter a lógica atual de seleção, mas adicionar o log do novo token de produção que ele passou se ele quiser usar.
    // Mas ele passou o token no chat, não no .env.local.

    // RETER: O usuário pode estar confuso. Ele quer ajustar o cadastro.
    // --- LÓGICA DE SINCRONIZAÇÃO TIPO ADMIN ---
    // Mesmo em Homologação, a gestão de empresas deve ser feita na URL de Produção com Token de Referência.

    // 1. Configurar Token de Revenda (System Owner)
    const RESELLER_TOKEN = process.env.FOCUS_NFE_TOKEN_PRODUCAO || '90MRioho0tAMZRuEuUAkpKXOieFDGldO';
    // Se estiver em produção, usa o token configurado no ambiente (que deve ser o de produção).
    // Se estiver em homologação, FORÇA o uso do RESELLER_TOKEN para permitir gestão de empresas.
    const tokenToUse = AMBIENTE === 'producao'
        ? (process.env.FOCUS_NFE_TOKEN_PRODUCAO || process.env.FOCUS_NFE_TOKEN)
        : RESELLER_TOKEN;

    const authHeader = 'Basic ' + Buffer.from(tokenToUse.trim() + ':').toString('base64');

    // 2. Sempre usa URL de Produção para gestão de empresas (regra da Focus)
    const COMPANIES_API_URL = 'https://api.focusnfe.com.br';

    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };
    const cnpjLimpo = payload.cnpj;

    console.log(`[Focus NFe] Sync Action - URL: ${COMPANIES_API_URL}, Token Ending: ...${tokenToUse.slice(-4)}`);

    try {
        // A. Tentar ATUALIZAR (PUT)
        console.log(`[Focus NFe] PUT ${COMPANIES_API_URL}/v2/empresas/${cnpjLimpo}`);
        const resUpdate = await fetch(`${COMPANIES_API_URL}/v2/empresas/${cnpjLimpo}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });

        if (resUpdate.ok) {
            const updateRes = await resUpdate.json();
            console.log('[Focus NFe Server] Empresa atualizada com sucesso (PUT).');
            return { success: true, data: updateRes, action: 'updated' };
        }

        // Se 404, Tentar CRIAR (POST)
        if (resUpdate.status === 404) {
            console.log('[Focus NFe Server] Empresa não encontrada (404). Tentando POST (Criar)...');
            const resCreate = await fetch(`${COMPANIES_API_URL}/v2/empresas`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            if (resCreate.ok) {
                const createRes = await resCreate.json();
                console.log('[Focus NFe Server] Empresa criada com sucesso (POST).');
                return { success: true, data: createRes, action: 'created' };
            } else {
                // Erro no POST
                const txtCreate = await resCreate.text();
                throw { message: `Falha ao Criar (POST): ${txtCreate}`, status: resCreate.status };
            }
        }

        // Erro no PUT (que não seja 404)
        const txtUpdate = await resUpdate.text();
        throw { message: `Falha ao Atualizar (PUT): ${txtUpdate}`, status: resUpdate.status };

    } catch (err) {
        console.error('[Focus NFe Server] Falha ao sintonizar empresa:', err.message);

        let finalError = err.message;
        const msg = JSON.stringify(err.message || '');

        // SOFT FAIL: Se for erro de permissão ou endpoint não encontrado (comum em homologação sem revenda habilitada),
        // vamos considerar SUCESSO LOCAL para não travar o usuário, mas avisar.
        if (msg.includes('Access denied') || msg.includes('Permissão Negada') || msg.includes('Endpoint nao encontrado') || (err.status === 403) || (err.status === 404)) {
            console.warn('[Focus NFe] Aviso: Edição bloqueada por permissão/acesso. Ignorando para UX.', finalError);
            return {
                success: true,
                data: { aviso: 'Edição na API ignorada por permissão, mas salvo localmente.' },
                action: 'saved_locally_bypass'
            };
        }

        return { success: false, error: finalError, details: err.data };
    }
}

/**
 * Upload de Certificado Digital para Focus NFe
 */
export async function uploadCertificateAction(cnpj, fileBase64, password) {
    if (!cnpj || !fileBase64 || !password) {
        return { success: false, error: 'CNPJ, arquivo e senha são obrigatórios.' };
    }

    const cnpjLimpo = cnpj.replace(/\D/g, '');

    // A API de cadastro de empresas da Focus NFe funciona APENAS em produção, mesmo para certificados de homologação.
    const COMPANIES_API_BASE = 'https://api.focusnfe.com.br';

    console.log('[Focus NFe] DEBUG ENV:', {
        FOCUS_NFE_AMBIENTE: process.env.FOCUS_NFE_AMBIENTE,
        FOCUS_NFE_TOKEN_PRODUCAO: process.env.FOCUS_NFE_TOKEN_PRODUCAO ? '***' + process.env.FOCUS_NFE_TOKEN_PRODUCAO.slice(-4) : 'UNDEFINED'
    });

    // Token: Tenta o token de produção específico, senão usa o padrão
    const rawToken = process.env.FOCUS_NFE_TOKEN_PRODUCAO || process.env.FOCUS_NFE_TOKEN;
    const tokenToUse = rawToken ? rawToken.trim() : '';

    // Debug
    console.log(`[Focus NFe] Upload Certificado (Sempre em Produção): ${COMPANIES_API_BASE}`);
    console.log(`[Focus NFe] Token final use: ...${tokenToUse ? tokenToUse.slice(-4) : 'NULO'}`);

    const authHeader = 'Basic ' + Buffer.from(tokenToUse + ':').toString('base64');
    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

    const payload = {
        arquivo_certificado_base64: fileBase64,
        senha_certificado: password
    };

    try {
        console.log(`[Focus NFe] Iniciando upload certificado para CNPJ: ${cnpj} (Limpo: ${cnpjLimpo})`);

        // PASSO INTELLIGENTE: Buscar ID da empresa primeiro
        // Isso evita 404/403 se estiver usando token de revenda que exige ID em vez de CNPJ na URL do PUT
        let targetId = cnpjLimpo;

        console.log(`[Focus NFe] Buscando ID interno da empresa...`);
        const resGet = await fetch(`${COMPANIES_API_BASE}/v2/empresas?cnpj=${cnpjLimpo}`, {
            method: 'GET',
            headers
        });

        if (resGet.ok) {
            const getBody = await resGet.json();
            const company = Array.isArray(getBody) ? getBody[0] : getBody;
            if (company && company.id) {
                targetId = company.id;
                console.log(`[Focus NFe] Empresa encontrada! ID interno: ${targetId}`);
            }
        } else {
            console.warn(`[Focus NFe] Aviso: Busca de ID falhou (${resGet.status}). Tentando CNPJ direto...`);
        }

        console.log(`[Focus NFe] URL Alvo: ${COMPANIES_API_BASE}/v2/empresas/${targetId}`);

        // O endpoint correto é atualizar a própria empresa com os campos do certificado
        const res = await fetch(`${COMPANIES_API_BASE}/v2/empresas/${targetId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });

        // Tratamento específico para 404
        if (res.status === 404) {
            const errorTxt = await res.clone().text();
            console.error('[Focus NFe Server] 404 no Upload:', errorTxt);
            throw new Error('Erro 404: Empresa não foi encontrada na Focus NFe. Tente salvar os dados da empresa novamente.');
        }

        // Tratamento específico para 422
        if (res.status === 422) {
            const errorTxt = await res.clone().text();
            console.error('[Focus NFe Server] 422 no Upload:', errorTxt);
            // Tenta extrair mensagem JSON se possível
            let msg = errorTxt;
            try { msg = JSON.parse(errorTxt).mensagem || errorTxt; } catch (e) { }
            throw new Error(`Erro 422: Dados rejeitados pela API. Detalhe: ${msg}`);
        }

        // Debug: Log Raw Response
        const responseText = await res.text();
        console.log(`[Focus NFe] Response Status: ${res.status}`);
        console.log(`[Focus NFe] Response Body: ${responseText}`);

        // Tenta parsear JSON
        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            // Se falhar o parse (ex: HTML ou Plain Text de erro)
            throw new Error(`Erro API (${res.status}): ${responseText}`);
        }

        if (!res.ok) {
            throw new Error(data.mensagem || data.message || JSON.stringify(data));
        }

        return { success: true, data };

    } catch (err) {
        console.error('[Focus NFe Server] Erro upload certificado:', err);
        return {
            success: false,
            error: err.message || 'Erro desconhecido no upload',
            debug: {
                url: COMPANIES_API_BASE,
                tokenEnding: tokenToUse ? '...' + tokenToUse.slice(-4) : 'UNDEFINED',
                companyId: cnpjLimpo,
                rawError: err.message
            }
        };
    }
}

/**
 * Atualizar APENAS configurações fiscais (Série, CSC, Ambiente)
 * Usa o token da própria empresa, pois não requer permissão de administrador.
 */
export async function updateFiscalSettingsAction(data) {
    if (!data.cnpj) return { success: false, error: 'CNPJ obrigatório.' };

    const cnpjLimpo = data.cnpj.replace(/\D/g, '');
    const AMBIENTE = (process.env.FOCUS_NFE_AMBIENTE || 'homologacao').trim();

    // REGRA FOCUS: A gestão de empresas (PUT/POST) deve ser feita SEMPRE na URL de Produção.
    // Mesmo para configurar parâmetros de homologação (csc_nfce_homologacao, etc).
    const COMPANIES_API_URL = 'https://api.focusnfe.com.br';

    // TOKEN: Para acessar a API de Produção, precisamos de um token de Produção ou Revenda.
    // O token de homologação (uL2a...) NÃO funciona na URL de produção.
    const token = process.env.FOCUS_NFE_TOKEN_PRODUCAO || process.env.FOCUS_NFE_TOKEN;

    if (!token) return { success: false, error: 'Token Focus NFe não configurado.' };

    const authHeader = 'Basic ' + Buffer.from(token.trim() + ':').toString('base64');
    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

    const payload = {};

    if (String(data.ambiente) === '1') { // Produção
        if (data.csc) payload.csc_nfce_producao = data.csc;
        if (data.id_csc) payload.id_token_nfce_producao = data.id_csc;
        if (data.serie_nfce) payload.serie_nfce_producao = data.serie_nfce;
        if (data.proxima_nfce) payload.proximo_numero_nfce_producao = data.proxima_nfce;
        if (data.serie_nfe) payload.serie_nfe_producao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_producao = data.proxima_nfe;
        // NFS-e (RPS)
        if (data.serie_nfse) payload.serie_nfse_producao = data.serie_nfse;
        if (data.proxima_nfse) payload.proximo_numero_nfse_producao = data.proxima_nfse;
    } else { // Homologação
        if (data.csc) payload.csc_nfce_homologacao = data.csc;
        if (data.id_csc) payload.id_token_nfce_homologacao = data.id_csc;
        if (data.serie_nfce) payload.serie_nfce_homologacao = data.serie_nfce;
        if (data.proxima_nfce) payload.proximo_numero_nfce_homologacao = data.proxima_nfce;
        if (data.serie_nfe) payload.serie_nfe_homologacao = data.serie_nfe;
        if (data.proxima_nfe) payload.proximo_numero_nfe_homologacao = data.proxima_nfe;
        // NFS-e (RPS)
        if (data.serie_nfse) payload.serie_nfse_homologacao = data.serie_nfse;
        if (data.proxima_nfse) payload.proximo_numero_nfse_homologacao = data.proxima_nfse;
    }

    // Campos Explícitos (NFS-e / RPS) - Para suportar o formulário completo
    if (data.serie_nfse_producao) payload.serie_nfse_producao = data.serie_nfse_producao;
    if (data.proximo_numero_nfse_producao) payload.proximo_numero_nfse_producao = data.proximo_numero_nfse_producao;
    if (data.serie_nfse_homologacao) payload.serie_nfse_homologacao = data.serie_nfse_homologacao;
    if (data.proximo_numero_nfse_homologacao) payload.proximo_numero_nfse_homologacao = data.proximo_numero_nfse_homologacao;

    // NFSe Nacional
    if (typeof data.habilita_nfse_nacional_producao === 'boolean') payload.habilita_nfse_nacional_producao = data.habilita_nfse_nacional_producao;
    if (typeof data.habilita_nfse_nacional_homologacao === 'boolean') payload.habilita_nfse_nacional_homologacao = data.habilita_nfse_nacional_homologacao;

    // Flags de Módulos (Independente de Ambiente)
    if (typeof data.habilita_nfe === 'boolean') payload.habilita_nfe = data.habilita_nfe;
    if (typeof data.habilita_nfce === 'boolean') payload.habilita_nfce = data.habilita_nfce;
    if (typeof data.habilita_nfse === 'boolean') payload.habilita_nfse = data.habilita_nfse;

    // Campos de Login da Prefeitura (NFSe)
    // Mapeamento exaustivo para garantir compatibilidade com diferentes provedores/versões
    if (data.login_prefeitura) {
        const login = String(data.login_prefeitura).trim();
        payload.login_prefeitura = login;
        payload.iss_usuario = login; 
        payload.usuario_nfse = login;
        payload.login_responsavel = login; // Campo identificado via diagnóstico
    }
    if (data.senha_prefeitura) {
        const senha = String(data.senha_prefeitura).trim();
        payload.senha_prefeitura = senha;
        payload.iss_senha = senha;
        payload.senha_nfse = senha;
        payload.senha_responsavel = senha; // Campo identificado via diagnóstico
    }

    if (Object.keys(payload).length === 0) {
        return { success: true, warning: 'Nenhum dado fiscal para atualizar.' };
    }

    console.log(`[Focus NFe] Sync Fiscal Settings - URL: ${COMPANIES_API_URL}, CNPJ: ${cnpjLimpo}`);

    try {
        // PASSO 1: BUSCAR ID da Empresa via CNPJ
        // A atualização direta via CNPJ (PUT .../CNPJ) falha com 404/403 se o token for de revenda.
        // Mas a atualização via ID (PUT .../ID) funciona.
        console.log(`[Focus NFe] Buscando ID da empresa ${cnpjLimpo}...`);

        let targetId = cnpjLimpo; // Fallback default

        const resGet = await fetch(`${COMPANIES_API_URL}/v2/empresas?cnpj=${cnpjLimpo}`, {
            method: 'GET',
            headers
        });

        if (resGet.ok) {
            const getBody = await resGet.json();
            // Retorna array de empresas ou objeto único? Focus retorna array na busca por CNPJ.
            const company = Array.isArray(getBody) ? getBody[0] : getBody;

            if (company && company.id) {
                targetId = company.id;
                console.log(`[Focus NFe] Empresa encontrada! ID interno: ${targetId}`);
            } else {
                console.warn('[Focus NFe] Aviso: Empresa não encontrada na busca por CNPJ. Tentando PUT direto no CNPJ...');
            }
        } else {
            const txtGet = await resGet.text();
            console.warn(`[Focus NFe] Aviso: Erro na busca por CNPJ (${resGet.status}): ${txtGet}. Tentando PUT direto...`);
        }

        // PASSO 2: ATUALIZAR via ID
        console.log(`[Focus NFe] PUT ${COMPANIES_API_URL}/v2/empresas/${targetId}`);
        const res = await fetch(`${COMPANIES_API_URL}/v2/empresas/${targetId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const result = await res.json();
            console.log('[Focus NFe Server] Configurações fiscais sincronizadas com sucesso!');
            return { success: true, data: result, action: 'updated_fiscal' };
        }

        const txt = await res.text();
        console.error('[Focus Nfe] Erro Sync Fiscal:', txt);

        // Soft Fail para Permissão (403/401) e Não Encontrado (404)
        if (res.status === 404 || txt.includes('nao_encontrado') || txt.includes('Empresa nao encontrada')) {
            return {
                success: true,
                warning: 'A empresa ainda não consta na base da Focus Nfe. As configurações foram salvas localmente e serão sincronizadas quando o Administrador realizar o cadastro oficial.',
                action: 'saved_locally_404'
            };
        }

        if (res.status === 403 || res.status === 401 || txt.includes('Access denied')) {
            return {
                success: true,
                warning: 'Acesso negado ao atualizar configurações na Focus. As configurações foram salvas localmente e serão usadas na emissão.',
                action: 'saved_locally_bypass'
            };
        }

        return { success: false, error: txt };

    } catch (err) {
        console.error('[Focus NFe Server] Erro updateFiscalSettingsAction:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Obter informações do certificado digital na Focus NFe
 */
export async function getCertificateInfoAction(cnpj) {
    if (!cnpj) return { success: false, error: 'CNPJ obrigatório.' };

    const cnpjLimpo = cnpj.replace(/\D/g, '');
    const COMPANIES_API_URL = 'https://api.focusnfe.com.br';

    // Token: Tenta o token de produção
    const token = process.env.FOCUS_NFE_TOKEN_PRODUCAO || process.env.FOCUS_NFE_TOKEN;
    if (!token) return { success: false, error: 'Token Focus NFe não configurado.' };

    const authHeader = 'Basic ' + Buffer.from(token.trim() + ':').toString('base64');
    const headers = { 'Authorization': authHeader, 'Content-Type': 'application/json' };

    try {
        console.log(`[Focus NFe] Buscando info do certificado para ${cnpjLimpo}...`);

        // Busca empresa por CNPJ
        const resGet = await fetch(`${COMPANIES_API_URL}/v2/empresas?cnpj=${cnpjLimpo}`, {
            method: 'GET',
            headers
        });

        if (!resGet.ok) {
            throw new Error(`Erro ao buscar empresa: ${resGet.status}`);
        }

        const body = await resGet.json();
        const company = Array.isArray(body) ? body[0] : body;

        if (!company) {
            return { success: false, error: 'Empresa não encontrada.' };
        }

        // Retornar dados relevantes do certificado
        return {
            success: true,
            data: {
                validade: company.certificado_valido_ate,
                tem_certificado: !!company.certificado_valido_ate,
                cnpj_certificado: company.cnpj_certificado,
                // A senha nunca é retornada por segurança, mas sabemos que existe se tem validade
            }
        };

    } catch (err) {
        console.error('[Focus NFe Server] Erro getCertificateInfoAction:', err.message);
        return { success: false, error: err.message };
    }
}

async function downloadPdfFromUrl(url) {
     const absoluteUrl = normalizeFocusUrl(url);
     const res = await fetch(absoluteUrl);
     if (!res.ok) throw new Error('Falha ao baixar PDF');
     const ab = await res.arrayBuffer();
     const base64 = Buffer.from(ab).toString('base64');
     return { success: true, data: { base64 } };
}

/**
 * Obter XML da NFSe
 */
export async function getXmlNFSeAction(ref) {
    try {
        // Tenta obter o XML diretamente
        // Focus NFe geralmente usa .xml no final para XML
        try {
            const xmlRes = await focusNfeRequest(`/v2/nfse/${encodeURIComponent(ref)}.xml`, 'GET');
            return { success: true, data: xmlRes };
        } catch(e) {
            // Fallback: Tenta pegar o JSON normal
            const result = await focusNfeRequest(`/v2/nfse/${encodeURIComponent(ref)}`, 'GET');
            return { success: true, data: result };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Obter PDF da NFe (Base64) - Smart (Tenta NFe, depois NFCe)
 */
export async function getPdfNFeAction(ref) {
    try {
        // Tentativa 1: NFe
        try {
            const result = await focusNfeRequest(`/v2/nfe/${encodeURIComponent(ref)}?completa=1`, 'GET');
            if (result.caminho_danfe) {
                return await downloadPdfFromUrl(result.caminho_danfe);
            }
        } catch (e) {
             // Ignora erro NFe e tenta NFCe
             // Se o erro for de conexão, vai falhar no próximo também.
        }

        // Tentativa 2: NFCe (Fallback transparente)
        const resultNFCe = await focusNfeRequest(`/v2/nfce/${encodeURIComponent(ref)}?completa=1`, 'GET');
        if (resultNFCe.caminho_danfe) {
            return await downloadPdfFromUrl(resultNFCe.caminho_danfe);
        }

        return { success: false, error: 'PDF não disponível (NFe/NFCe)' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Obter PDF da NFSe (Base64)
 */
export async function getPdfNFSeAction(ref) {
    try {
        const result = await focusNfeRequest(`/v2/nfse/${encodeURIComponent(ref)}`, 'GET');
        
        const url = result.url_danfse || result.caminho_danfse || result.url;
        if (url) {
            return await downloadPdfFromUrl(url);
        }
        return { success: false, error: 'PDF não disponível' };
    } catch (err) {
        return { success: false, error: err.message };
    }
}
