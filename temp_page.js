'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Save, User, Building, Settings as SettingsIcon, FileText, Upload, Shield, CheckCircle,
    Wrench, ShoppingCart, ShoppingBag, Wallet, DollarSign, Receipt, ClipboardList, Users, Building2,
    Package, Truck, ArrowUpCircle, ArrowDownCircle, BarChart2, Car, Import, Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
// Focus NFe doesn't require OAuth token - uses HTTP Basic Auth directly
import { useTheme } from '../context/ThemeContext';
import PageTitle from '../components/UI/PageTitle';
import { useOrganization } from '../context/OrganizationContext';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Link from 'next/link';
import { verificarCadastroFocusAction, getCertificateInfoAction } from '../actions/fiscal';
import { createUserAction } from '../actions/users';
import ConfirmModal from '../components/UI/ConfirmModal';

const ALL_MODULES = [
    { id: 'dashboard', name: 'Dashboard', icon: SettingsIcon, category: 'Principal', required: true },
    { id: 'ordens-servico', name: 'Ordens de Serviço', icon: Wrench, category: 'Principal' },
    { id: 'pdv', name: 'PDV', icon: ShoppingCart, category: 'Vendas' },
    { id: 'caixa', name: 'Controle de Caixa', icon: Wallet, category: 'Vendas' },
    { id: 'movimentacoes', name: 'Movimentações', icon: DollarSign, category: 'Vendas' },
    { id: 'nfe', name: 'NF-e', icon: Receipt, category: 'Faturamento' },
    { id: 'vendas', name: 'Consultar Vendas', icon: ClipboardList, category: 'Faturamento' },
    { id: 'clientes', name: 'Clientes', icon: Users, category: 'Cadastros' },
    { id: 'vehicles', name: 'Veículos', icon: Car, category: 'Cadastros' },
    { id: 'fornecedores', name: 'Fornecedores', icon: Building2, category: 'Cadastros' },
    { id: 'produtos', name: 'Produtos', icon: Package, category: 'Cadastros' },
    { id: 'transportadoras', name: 'Transportadoras', icon: Truck, category: 'Cadastros' },
    { id: 'compras', name: 'Compras/Entradas', icon: ShoppingBag, category: 'Cadastros' },
    { id: 'contas-pagar', name: 'Contas a Pagar', icon: ArrowUpCircle, category: 'Financeiro' },
    { id: 'contas-receber', name: 'Contas a Receber', icon: ArrowDownCircle, category: 'Financeiro' },
    { id: 'relatorios', name: 'Relatórios', icon: BarChart2, category: 'Relatórios' },
];

export default function SettingsPage() {
    const router = useRouter();
    const { theme, changeTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('company');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'danger'
    });
    const [certFile, setCertFile] = useState(null);
    const [certPassword, setCertPassword] = useState('');
    const [certStatus, setCertStatus] = useState(null);
    const [certInfo, setCertInfo] = useState(null); // Dados do certificado da API
    const fileInputRef = useRef(null);

    const { organizationId, organization } = useOrganization();
    const [officialData, setOfficialData] = useState(null);
    const [searchOrgId, setSearchOrgId] = useState(''); // Novo estado para busca

    const [companyData, setCompanyData] = useState({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        ie: '',
        cep: '',
        endereco: '',
        numero: '',
        bairro: '',
        cidade: '',
        uf: '',
        cod_municipio: '',
        regime_tributario: '1',
        cnae: '',
        ambiente: '2',
        serie_nfe: '1',
        proxima_nfe: '1',
        serie_nfce: '1',
        proxima_nfce: '1',
        ver_proc: '1.0.0',
        id_csc: '',
        csc: '',
        // Flags de Módulos (Focus NFe)
        habilita_nfe: false,
        habilita_nfce: false,
        habilita_nfse: false,
        login_prefeitura: '',
        senha_prefeitura: '',
        // Campos NFS-e (RPS) Explícitos
        serie_nfse_homologacao: '',
        proxima_nfse_homologacao: '',
        serie_nfse_producao: '',
        proxima_nfse_producao: '',
        habilita_nfse_nacional_homologacao: false,
        habilita_nfse_nacional_producao: false
    });



    // System preferences state
    const [notifications, setNotifications] = useState(true);
    const [sounds, setSounds] = useState(false);

    // Load preferences from localStorage
    useEffect(() => {
        const savedNotif = localStorage.getItem('work-notifications');
        const savedSounds = localStorage.getItem('work-sounds');
        if (savedNotif !== null) setNotifications(savedNotif === 'true');
        if (savedSounds !== null) setSounds(savedSounds === 'true');
    }, []);

    const toggleNotifications = () => {
        const newVal = !notifications;
        setNotifications(newVal);
        localStorage.setItem('work-notifications', String(newVal));
    };

    const toggleSounds = () => {
        const newVal = !sounds;
        setSounds(newVal);
        localStorage.setItem('work-sounds', String(newVal));
        if (newVal) {
            // Play a test sound when enabled
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleScAAABMgJqWe1s8P2+fwr+bVAQAbJe5wY1TE0N3nLSqfEMHEF+fv7yCRQAAlp9+QygphZe4u5VRDRFhnMfSn1onCkeVqJxsRxY1dqW6s4BGBSBysL22dCQKb5mpk2UsNnKqwLeMRgU0hLC6r3QxEGamppNRLzpzocG6kkEGRpCwso9NKWGVmIRCNFNzkLOugkMTaZmvnWk6L2SQo5NXQEJjh5+beEgrYJC2u59KHlqFm4dRSVJsg621kzsRYYeah1VHV2h7qbmZQhlhgJR2T0xmg6e1mUMYbYB+WUtZe5ytq1oeMHyDblFVbo+jom4sG15vbWNtfJKknH0kKmJqY2Z6j5qYdCMqZ2xoaHaGkZSBKS1xdHNwc3+Kj4F0Lix2e3dxbneEi4N6PSp8gH54b212g4d+fjsthYN9e3NpbXl/gXxEMoSEfHpzbnNzeHd2SzWGhH98c3Fzc3VydE47iIR/fnZyc3JycnJPPImEf351c3NzcnJxUkCJg398dnJycnJxcFRDh4R/fHZyc3JxcXBVRYWDgH13cnNycXBwVkiDg4B9eHJzcnFwcFdKgoKBfnlzc3JxcHBYS4GCgX56c3NycXBwWUyAgIF/e3RzcnFwcVlNf4GBf3t0c3JxcHBaTX6BgX98dXNycXBwW05+gYF/fHVzc3FwcFtOfoCBgH12c3JxcHBcT32BgX9+dXRycXBwXFB8gIGAf3d0c3JxcF1RfICAf4B4dHNycXBeUnuAgH+AeXRzcnFwX1N6gIB/gHl1c3JxcF9TeYCAf4F6dXNycXBgVHiAf3+BenVzcnFwYFR4gH9/gXt2c3JxcGFVd4B/f4J7dnNycXBhVnaAf3+CfHdzcnFwYldAgH+AgH18d3RycXBiV3d/f4CAf314dHNycGJYd39/gICAf3l0c3JwY1h2f3+AgIB/eXRzcnBjWHV/f4CAgH96dXNycGRZc39/gICAgHt2dHJwZFlzf3+AgICAe3Z0cnBkWnN/f4CAgIB8d3VycWRac39/gICAgHx3dXJxZFpyf3+AgICAe3d1cnFlW3F/f4CAgH98d3VycWVbcX9/gICAf3x3dXJxZVtxf3+AgIB/fHd1cnFmW3B/f4CAgH98d3VycWZcb39/gICAgHx3dXJxZlxvf3+AgIB/fHd1cnFnXG5/f4CAgH98d3VycWdcbn9/gICAgHx3dXNxZ1xuf3+AgIB/fHd1c3FnXW1/f4CAgH98d3VzcWddbX9/gICAgHx3dXNxaF1tf3+AgIB/fHd2c3FoXW1/f4CAgH98d3ZzcWhdAA==');
            audio.volume = 0.3;
            audio.play();
        }
    };

    // User management state
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
        permissions: {}
    });

    // Módulos Completos para Permissões Granulares (1:1 com Sidebar)
    const PERMISSION_MODULES = [
        // Principal
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'ordens_servico', label: 'Ordens de Serviço' },

        // Vendas
        { id: 'pdv', label: 'PDV (Frente de Caixa)' },
        { id: 'caixa', label: 'Controle de Caixa' },
        { id: 'fluxo_caixa', label: 'Movimentações de Caixa' },

        // Faturamento
        { id: 'nfe', label: 'Emitir / Gerenciar NF-e' },
        { id: 'nfce', label: 'Emitir NFC-e' },
        { id: 'vendas', label: 'Consultar Histórico de Vendas' },

        // Cadastros
        { id: 'clientes', label: 'Clientes' },
        { id: 'veiculos', label: 'Veículos' },
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'produtos', label: 'Produtos / Estoque' },
        { id: 'transportadoras', label: 'Transportadoras' },
        { id: 'compras', label: 'Compras / Entradas' },

        // Financeiro
        { id: 'contas_receber', label: 'Contas a Receber' },
        { id: 'contas_pagar', label: 'Contas a Pagar' },

        // Sistema
        { id: 'relatorios', label: 'Relatórios' },
        { id: 'configuracoes', label: 'Configurações' },
    ];

    const fetchUsers = async () => {
        if (!organizationId) return;
        const { data } = await supabase
            .from('app_users')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });
        setUsers(data || []);
    };

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
    }, [activeTab]);

    const handleUserFormChange = (e) => {
        setUserForm({ ...userForm, [e.target.name]: e.target.value });
    };

    const togglePermission = (key) => {
        // Se for undefined, considera true (padrão permissivo). Então o inverso é false.
        const currentVal = userForm.permissions[key] !== false;
        setUserForm({
            ...userForm,
            permissions: { ...userForm.permissions, [key]: !currentVal }
        });
    };

    const handleSaveUser = async () => {
        if (!organizationId) {
            console.error('Erro ao salvar usuário: organizationId está nulo ou indefinido.');
            showModal('Sessão Expirada', 'Não foi possível identificar sua organização. Por favor, recarregue a página e tente novamente.', 'error');
            return;
        }

        setLoading(true);
        try {
            console.log('Iniciando salvamento de usuário...', {
                email: userForm.email,
                role: userForm.role,
                orgId: organizationId
            });

            const payload = {
                name: userForm.name,
                email: userForm.email,
                role: userForm.role,
                permissions: userForm.permissions,
                organization_id: organizationId
            };

            if (editingUser) {
                const { error: updateError } = await supabase.from('app_users').update(payload).eq('id', editingUser.id);
                if (updateError) throw updateError;
                showModal('Usuário Atualizado!', 'Os dados foram salvos com sucesso.', 'success');
            } else {
                // Create user in Supabase Auth first (Server Action to avoid session hijack)
                const result = await createUserAction({
                    name: userForm.name,
                    email: userForm.email,
                    password: userForm.password
                });

                if (!result.success) {
                    throw new Error(result.error || 'Erro desconhecido ao criar usuário.');
                }

                payload.auth_id = result.authId;
                console.log('Inserindo no banco app_users com auth_id:', result.authId);
                const { error: dbError } = await supabase.from('app_users').insert([payload]);

                if (dbError) {
                    console.error('Erro de RLS ou Banco na inserção:', dbError);
                    throw new Error(dbError.message);
                }

                showModal('Usuário Criado!', 'O usuário foi cadastrado com sucesso.', 'success');
            }

            setShowUserModal(false);
            setEditingUser(null);
            setUserForm({ name: '', email: '', password: '', role: 'user', permissions: { dashboard: true, clientes: true, produtos: true, notas: false, financeiro: false, configuracoes: false } });
            fetchUsers();
        } catch (error) {
            console.error('Erro capturado ao salvar usuário:', error);
            showModal('Erro ao Salvar', error.message || 'Ocorreu um erro inesperado.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            permissions: user.permissions || {}
        });
        setShowUserModal(true);
    };

    // ConfirmModal removido daqui (bloco incorreto)

    // Hooks movidos para o topo do componente

    useEffect(() => {
        if (organizationId) {
            fetchCompanySettings();
        }
    }, [organizationId]);

    // Verificar status do certificado - Focus NFe gerencia certificado pelo painel
    const checkCertificateStatus = async (cnpj) => {
        if (!cnpj) return;
        try {
            const result = await getCertificateInfoAction(cnpj);
            if (result.success && result.data?.tem_certificado) {
                setCertInfo(result.data);
                setCertStatus('ativo');
            } else {
                setCertInfo(null);
                setCertStatus(null);
            }
        } catch (error) {
            console.error('[Certificado] Erro ao verificar status:', error);
            setCertInfo(null);
        }
    };

    const fetchCompanySettings = async () => {
        if (!organizationId) return;

        // 1. Buscar configurações fiscais (company_settings)
        const { data: settings } = await supabase
            .from('company_settings')
            .select('*')
            .eq('organization_id', organizationId)
            .single();
        let finalData = {};

        if (settings) {
            finalData = {
                // Preservar configurações técnicas/fiscais
                regime_tributario: String(settings.regime_tributario || '1'),
                ambiente: String(settings.ambiente || '2'),
                serie_nfe: String(settings.serie_nfe || '1'),
                proxima_nfe: String(settings.proxima_nfe || '1'),
                serie_nfce: String(settings.serie_nfce || '1'),
                proxima_nfce: String(settings.proxima_nfce || '1'),
                id_csc: String(settings.id_csc || ''),
                csc: settings.csc || '',
                ver_proc: settings.ver_proc || '1.0.0',
                // Flags de Módulos
                habilita_nfe: !!settings.habilita_nfe,
                habilita_nfce: !!settings.habilita_nfce,
                habilita_nfse: !!settings.habilita_nfse,
                login_prefeitura: settings.login_prefeitura || '',
                senha_prefeitura: settings.senha_prefeitura || '',
                // RPS
                serie_nfse_homologacao: String(settings.serie_nfse_homologacao || ''),
                proxima_nfse_homologacao: String(settings.proxima_nfse_homologacao || ''),
                serie_nfse_producao: String(settings.serie_nfse_producao || ''),
                proxima_nfse_producao: String(settings.proxima_nfse_producao || ''),
                habilita_nfse_nacional_homologacao: !!settings.habilita_nfse_nacional_homologacao,
                habilita_nfse_nacional_producao: !!settings.habilita_nfse_nacional_producao,
                // Fallback para campos de endereço se organization não for encontrada
                cep: settings.cep || '',
                endereco: settings.endereco || '',
                numero: settings.numero || '',
                bairro: settings.bairro || '',
                cidade: settings.cidade || '',
                uf: settings.uf || '',
                cod_municipio: settings.cod_municipio || '',
                ie: settings.ie || '',
                cnae: settings.cnae || '',
                razao_social: settings.razao_social || '',
                nome_fantasia: settings.nome_fantasia || '',
                cnpj: settings.cnpj || ''
            };
        }

        // Lógica de recuperação de organização via user profile removida em favor de OrganizationContext
        // O contexto já provê organizationId e organization oficiais.

        setCompanyData(prev => ({ ...prev, ...finalData }));

        // Verificar status do certificado
        if (finalData.cnpj) {
            checkCertificateStatus(finalData.cnpj);
        }
    };

    const handleSearchOrganization = async () => {
        if (!searchOrgId) return showModal('Atenção', 'Digite o ID da organização para buscar.', 'warning');

        setLoading(true);
        try {
            // Tenta buscar por organization_code (ID curto)
            // Se for número, busca por code, senão tenta uuid
            let query = supabase.from('organizations').select('*');

            if (!isNaN(searchOrgId) && searchOrgId.trim() !== '') {
                query = query.eq('organization_code', parseInt(searchOrgId));
            } else {
                query = query.eq('id', searchOrgId);
            }

            const { data: org, error } = await query.single();

            if (error || !org) {
                throw new Error('Organização não encontrada com este ID.');
            }

            if (org.status !== 'ativo') {
                // throw new Error('Esta organização está inativa ou suspensa.');
                // Apenas avisar, mas permitir importar dados para configuração/reativação
                showModal('Atenção', 'Esta organização consta como inativa no sistema, mas os dados foram carregados para configuração.', 'warning');
            } else {
                showModal('Dados Carregados', 'Os dados da empresa foram preenchidos com sucesso.', 'success');
            }

            // Atualizar estado com dados encontrados
            setOfficialData(org);
            // setOrganizationId(org.id); // Removido para evitar mudança de contexto não autorizada

            setCompanyData(prev => ({
                ...prev,
                razao_social: org.razao_social || '',
                nome_fantasia: org.nome_fantasia || '',
                cnpj: org.cnpj || '',
                ie: org.ie || '',
                cnae: org.cnae || '',
                cep: org.cep || '',
                endereco: org.logradouro || org.endereco || '', // Tenta logradouro primeiro (padrão novo), fallback para endereco
                numero: org.numero || '',
                bairro: org.bairro || '',
                cidade: org.cidade || '',
                uf: org.uf || '',
                cod_municipio: org.cod_municipio || ''
            }));
        } catch (err) {
            console.error(err);
            if (err.code === '42703' || (err.message && err.message.includes('400'))) {
                showModal('Coluna Ausente', 'A coluna "organization_code" não existe no banco de dados. Execute o script "add_organization_code.txt" no Supabase para habilitar busca por ID curto.', 'warning');
            } else {
                showModal('Erro na Busca', err.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        let { name, value } = e.target;

        if (name === 'cnpj') {
            // Máscara de CNPJ
            value = value.replace(/\D/g, '') // Remove não dígitos
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2')
                .slice(0, 18); // Limita tamanho máximo
            // Atualizar status do certificado ao mudar CNPJ
            // checkCertificateStatus(value);
        }

        setCompanyData({ ...companyData, [name]: value });
    };

    const handleBlurCNPJ = async () => {
        const cnpj = companyData.cnpj.replace(/\D/g, '');
        if (cnpj.length !== 14) return;

        setLoading(true);
        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!res.ok) throw new Error('CNPJ não encontrado');

            const data = await res.json();

            setCompanyData(prev => ({
                ...prev,
                razao_social: data.razao_social,
                nome_fantasia: data.nome_fantasia || data.razao_social,
                cep: data.cep,
                endereco: data.logradouro,
                numero: data.numero,
                bairro: data.bairro,
                cidade: data.municipio,
                uf: data.uf,
                cod_municipio: data.codigo_municipio_ibge,
                cnae: data.cnae_fiscal_descricao
            }));

            // Optional: Notify user visualy or just fill silently
        } catch (error) {
            console.error(error);
            // Silent fail or minimal alert to not disrupt flow too much if offline
        } finally {
            setLoading(false);
        }
    };

    const showModal = (title, message, type = 'success') => {
        setModal({ isOpen: true, title, message, type });
    };

    const handleSaveCompany = async () => {
        // --- SEPARAÇÃO DE RESPONSABILIDADES ---

        // 1. ABA DADOS DA EMPRESA (Somente Leitura / Gerenciado pelo Admin)
        if (activeTab === 'company') {
            // Opcional: Permitir salvar apenas localmente CASO precise corrigir algo que não veio do Admin, 
            // mas o ideal é bloquear para manter integridade.
            // Como o usuário pediu explicitamente: "Se o cliente tentar alterar... deve aparecer um erro".
            return showModal('Ação Bloqueada', 'Os dados cadastrais da empresa são gerenciados pelo Administrador e não podem ser alterados aqui. Entre em contato com o suporte para alterações.', 'error');
        }

        // 2. ABA DADOS FISCAIS (Editável pelo Cliente + Sync Focus)
        if (activeTab === 'fiscal') {
            setLoading(true);
            const payload = {
                ...companyData,
                regime_tributario: parseInt(companyData.regime_tributario),
                ambiente: parseInt(companyData.ambiente),
                serie_nfe: parseInt(companyData.serie_nfe),
                proxima_nfe: parseInt(companyData.proxima_nfe),
                habilita_nfe: companyData.habilita_nfe,
                habilita_nfce: companyData.habilita_nfce,
                habilita_nfse: companyData.habilita_nfse,
                login_prefeitura: companyData.login_prefeitura,
                senha_prefeitura: companyData.senha_prefeitura,
                // RPS e NFSe
                serie_nfse_homologacao: companyData.serie_nfse_homologacao,
                proxima_nfse_homologacao: companyData.proxima_nfse_homologacao,
                serie_nfse_producao: companyData.serie_nfse_producao,
                proxima_nfse_producao: companyData.proxima_nfse_producao,
                habilita_nfse_nacional_homologacao: companyData.habilita_nfse_nacional_homologacao,
                habilita_nfse_nacional_producao: companyData.habilita_nfse_nacional_producao
            };

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
                    showModal('Aviso de Banco', 'Salvo, mas coluna ver_proc ausente. Contate suporte.', 'warning');
                } else {
                    setLoading(false);
                    return showModal('Erro ao Salvar', error.message, 'error');
                }
            }

            // Sincronizar com Focus NFe (Apenas Fiscal)
            try {
                const { updateFiscalSettingsAction } = await import('../actions/fiscal');
                const focusRes = await updateFiscalSettingsAction(payload);

                if (focusRes.success) {
                    if (focusRes.action === 'saved_locally_404' || focusRes.action === 'saved_locally_bypass') {
                        // Soft Fail tratado como SUCESSO para o usuário não travar
                        showModal('Configuração Salva', 'Seus dados fiscais (Série, CSC, etc.) foram salvos localmente e serão usados para emissão de notas. \n\nNota: A sincronização automática com o servidor da Focus ficou pendente, mas isso não impede a emissão.', 'success');
                    } else if (focusRes.warning) {
                        showModal('Salvo com Alerta', `Dados salvos localmente. Alerta da Focus: ${focusRes.warning}`, 'warning');
                    } else {
                        showModal('Sucesso', 'Configurações fiscais atualizadas e sincronizadas com a Focus NFe.', 'success');
                    }
                } else {
                    console.error('Focus Sync Error:', focusRes);
                    // Fallback visual para sucesso local mesmo com erro de sync
                    showModal('Salvo Localmente', `Os dados foram salvos no banco local e estão prontos para uso. \n\nErro na Sincronização (Ignorável): ${focusRes.error}`, 'warning');
                }
            } catch (syncErr) {
                console.error('Sync Error:', syncErr);
                showModal('Salvo Localmente', 'Dados salvos com sucesso no banco local. Falha apenas na comunicação externa (sem impacto imediato).', 'success');
            }
            setLoading(false);
        }
    };

    const handleDiagnostic = async () => {
        if (!companyData.cnpj) return showModal('Erro', 'CNPJ é obrigatório para o teste.', 'error');
        setLoading(true);
        try {
            const result = await verificarCadastroFocusAction(companyData.cnpj);
            if (result.success) {
                showModal(
                    'Sucesso - Comunicação OK',
                    `A API do Focus NFe (${result.environment}) respondeu corretamente!\n\nStatus: Conectado\nToken: Válido e Operacional.\n\nSua configuração de comunicação está correta.`,
                    'success'
                );
            } else if (result.validEnv && result.validEnv !== result.environment) {
                showModal(
                    'Alerta - Ambiente Incorreto!',
                    `Bingo! Descobrimos o problema.\n\nVocê configurou o ambiente para "${result.environment}", mas esse token SÓ FUNCIONA em "${result.validEnv}".\n\nSolução: Troque o token pelo correto de ${result.environment} OU mude a configuração para ${result.validEnv}.`,
                    'warning'
                );
            } else if (!result.success) {
                const details = result.data.map(r => `${r.env.toUpperCase()}: ${r.ok ? 'OK' : r.status}`).join('\n');
                showModal(
                    'Erro - Token Inválido em Ambos Ambientes',
                    `Testei esse token em Produção e Homologação, e falhou nos dois.\n\nResultados:\n${details}\n\nConclusão: O token está incorreto, expirado ou bloqueado. Gere um novo no painel da Focus.`,
                    'error'
                );
            } else {
                showModal(
                    'Sucesso - Token Validado!',
                    `O token está funcionando corretamente no ambiente ${result.validEnv}!\n\nSe ainda não conseguir emitir nota, verifique se o CNPJ da nota bate com o cadastro.`,
                    'success'
                );
            }
        } catch (err) {
            showModal('Erro Inesperado', err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCertUpload = async () => {
        if (!certFile || !certPassword) {
            return showModal('Dados em falta', 'Selecione o arquivo do certificado e informe a senha.', 'warning');
        }

        setLoading(true);
        try {
            // Ler arquivo como Base64
            const reader = new FileReader();
            reader.readAsDataURL(certFile);
            reader.onload = async () => {
                const base64Content = reader.result.split(',')[1];

                try {
                    const { uploadCertificateAction } = await import('../actions/fiscal');
                    const result = await uploadCertificateAction(companyData.cnpj, base64Content, certPassword);

                    if (result.success) {
                        showModal('Certificado Enviado', 'O certificado foi enviado e instalado com sucesso na Focus NFe.', 'success');
                        setCertFile(null);
                        setCertPassword('');
                        checkCertificateStatus(companyData.cnpj);
                    } else {
                        // Debug info if available
                        let debugMsg = '';
                        if (result.debug) {
                            debugMsg = `\n\nDetalhes Técnicos:\nToken Final: ${result.debug.tokenEnding}\nEnvio para: ${result.debug.url}\nCNPJ: ${result.debug.companyId}`;
                        }
                        showModal('Erro no Envio', `Falha ao enviar certificado: ${result.error}${debugMsg}`, 'error');
                    }
                } catch (apiErr) {
                    showModal('Erro', 'Erro ao comunicar com o servidor de envio.', 'error');
                    console.error(apiErr);
                } finally {
                    setLoading(false);
                }
            };
            reader.onerror = () => {
                showModal('Erro', 'Falha ao ler o arquivo do certificado.', 'error');
                setLoading(false);
            };

        } catch (err) {
            console.error(err);
            setLoading(false);
            showModal('Erro Inesperado', 'Ocorreu um erro ao processar o certificado.', 'error');
        }
    };

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setCompanyData({ ...companyData, [name]: checked });
    };

    return (
        <div>
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                autoClose={modal.type === 'success' ? 3000 : 0}
            />

            <PageTitle title="Configurações" subtitle="Preferências do sistema e dados da empresa" />

            <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Button variant={activeTab === 'company' ? 'primary' : 'ghost'} icon={Building} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('company')}>Dados da Empresa</Button>
                    <Button variant={activeTab === 'fiscal' ? 'primary' : 'ghost'} icon={FileText} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('fiscal')}>Dados Fiscais</Button>
                    <Button variant={activeTab === 'certificado' ? 'primary' : 'ghost'} icon={Shield} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('certificado')}>Certificado Digital</Button>
                    <Button variant={activeTab === 'users' ? 'primary' : 'ghost'} icon={User} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('users')}>Usuários</Button>
                    <Button variant={activeTab === 'accountant' ? 'primary' : 'ghost'} icon={Briefcase} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('accountant')}>Contabilidade</Button>
                    <Button variant={activeTab === 'system' ? 'primary' : 'ghost'} icon={SettingsIcon} style={{ justifyContent: 'flex-start' }} onClick={() => setActiveTab('system')}>Sistema</Button>

                </div>

                <div style={{ flex: 1 }}>
                    {activeTab === 'company' && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Dados Cadastrais</h3>

                            {/* Buscar Organização por ID */}
                            <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Configuração Rápida:</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <label style={{ fontSize: '0.85rem', fontWeight: 500 }}>Id:</label>
                                        <input
                                            type="text"
                                            placeholder="000000"
                                            value={searchOrgId}
                                            onChange={(e) => setSearchOrgId(e.target.value)}
                                            style={{
                                                width: '100px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border-color)',
                                                fontSize: '0.9rem',
                                                textAlign: 'center',
                                                background: 'var(--bg-card)'
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearchOrganization()}
                                        />
                                        <Button
                                            variant="secondary"
                                            onClick={handleSearchOrganization}
                                            disabled={loading}
                                            style={{ height: '28px', padding: '0 8px', minWidth: 'auto' }}
                                            icon={Import}
                                        >

                                        </Button>
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        (Digite o ID da organização para importar os dados)
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Input
                                        label="CNPJ"
                                        name="cnpj"
                                        value={companyData.cnpj}
                                        readOnly={true}
                                        style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }}
                                    />
                                    <Input label="Inscrição Estadual" name="ie" value={companyData.ie} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                </div>
                                <Input
                                    label="Razão Social"
                                    name="razao_social"
                                    value={companyData.razao_social}
                                    readOnly={true}
                                    style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }}
                                />
                                <Input
                                    label="Nome Fantasia"
                                    name="nome_fantasia"
                                    value={companyData.nome_fantasia}
                                    readOnly={true}
                                    style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }}
                                />
                                <Input label="CNAE Principal" name="cnae" value={companyData.cnae} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                            </div>

                            <h3 style={{ margin: '2rem 0 1rem', fontSize: '1.1rem', fontWeight: 600 }}>Endereço</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 100px', gap: '1rem' }}>
                                    <Input label="CEP" name="cep" value={companyData.cep} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                    <Input label="Logradouro" name="endereco" value={companyData.endereco} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                    <Input label="Número" name="numero" value={companyData.numero} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 150px', gap: '1rem' }}>
                                    <Input label="Bairro" name="bairro" value={companyData.bairro} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                    <Input label="Cidade" name="cidade" value={companyData.cidade} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                    <Input label="UF" name="uf" value={companyData.uf} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} maxLength={2} />
                                    <Input label="Cód. IBGE" name="cod_municipio" value={companyData.cod_municipio} readOnly={true} style={{ background: 'var(--bg-body)', cursor: 'not-allowed', opacity: 0.8 }} />
                                </div>
                            </div>
                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: 'var(--border-radius)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Shield size={24} style={{ color: 'var(--warning-color)' }} />
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--warning-color)', marginBottom: '0.2rem' }}>Edição Bloqueada</p>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        Estes dados são gerenciados exclusivamente pelo Administrador e sincronizados automaticamente. Entre em contato com o suporte para solicitar alterações.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'accountant' && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Acesso do Contador</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.2rem' }}>Gerencie o acesso do seu escritório de contabilidade ao portal de XMLs.</p>
                                </div>
                                <Button
                                    onClick={() => {
                                        setEditingUser(null);
                                        setUserForm({ name: '', email: '', password: '', role: 'accountant', permissions: {} });
                                        setShowUserModal(true);
                                    }}
                                    icon={User}
                                >
                                    Adicionar Contador
                                </Button>
                            </div>

                            <div style={{ borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: 'var(--bg-hover)' }}>
                                        <tr>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>NOME</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>EMAIL</th>
                                            <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>STATUS</th>
                                            <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem' }}>AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.filter(u => u.role === 'accountant').length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    Nenhum contador cadastrado. Adicione um para liberar o acesso aos XMLs.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.filter(u => u.role === 'accountant').map(user => (
                                                <tr key={user.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ padding: '0.5rem', background: 'var(--primary-color-alpha)', color: 'var(--primary-color)', borderRadius: '50%' }}>
                                                                <Briefcase size={16} />
                                                            </div>
                                                            <span style={{ fontWeight: 500 }}>{user.name}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{user.email}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span style={{ background: 'var(--success-alpha)', color: 'var(--success-color)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                                            ATIVO
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        <Button variant="ghost" size="sm" icon={Wrench} onClick={() => handleEditUser(user)} title="Editar" />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--border-radius)' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.5rem' }}>Como funciona?</h4>
                                <ul style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.2rem', margin: 0 }}>
                                    <li style={{ marginBottom: '0.4rem' }}>Ao cadastrar um contador, ele receberá acesso exclusivo ao <strong>Portal da Contabilidade</strong>.</li>
                                    <li style={{ marginBottom: '0.4rem' }}>Ele poderá baixar todos os XMLs de notas fiscais (NF-e e NFC-e) emitidas pela sua empresa.</li>
                                    <li style={{ marginBottom: '0.4rem' }}>O contador <strong>não tem acesso</strong> ao seu financeiro, vendas ou configurações, apenas aos arquivos fiscais.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fiscal' && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Dados Fiscais e Tributários</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Módulos Habilitados */}
                                <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', background: 'var(--bg-body)' }}>
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Módulos Habilitados (Focus NFe)</label>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="checkbox" name="habilita_nfe" checked={companyData.habilita_nfe} onChange={handleCheckboxChange} style={{ transform: 'scale(1.2)' }} />
                                            <span>Habilitar NF-e (Modelo 55)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="checkbox" name="habilita_nfce" checked={companyData.habilita_nfce} onChange={handleCheckboxChange} style={{ transform: 'scale(1.2)' }} />
                                            <span>Habilitar NFC-e (Modelo 65)</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                            <input type="checkbox" name="habilita_nfse" checked={companyData.habilita_nfse} onChange={handleCheckboxChange} style={{ transform: 'scale(1.2)' }} />
                                            <span>Habilitar NFS-e (Serviços)</span>
                                        </label>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        Ative apenas os módulos contratados. Isso atualizará o cadastro na Focus NFe.
                                    </p>
                                </div>

                                
                                {companyData.habilita_nfse && (
                                    <>
                                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Credenciais Prefeitura (NFS-e)</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <Input label="Login Prefeitura" name="login_prefeitura" value={companyData.login_prefeitura} onChange={handleChange} placeholder="Ex: Usuário ou CPF/CNPJ" />
                                                <Input label="Senha Prefeitura" name="senha_prefeitura" type="password" value={companyData.senha_prefeitura} onChange={handleChange} placeholder="••••••" />
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                                Necessário para emissão de Nota Fiscal de Serviço (NFS-e).
                                            </p>
                                        </div>

                                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 600 }}>Configuração RPS (Recibo Provisório de Serviços)</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                                <div>
                                                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Homologação</h5>
                                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                        <Input label="Série" name="serie_nfse_homologacao" value={companyData.serie_nfse_homologacao} onChange={handleChange} placeholder="Ex: 1" />
                                                        <Input label="Próximo RPS" name="proxima_nfse_homologacao" value={companyData.proxima_nfse_homologacao} onChange={handleChange} placeholder="Ex: 1" />
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" name="habilita_nfse_nacional_homologacao" checked={companyData.habilita_nfse_nacional_homologacao} onChange={handleCheckboxChange} />
                                                            <span>Ambiente Nacional</span>
                                                        </label>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h5 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>Produção</h5>
                                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                                        <Input label="Série" name="serie_nfse_producao" value={companyData.serie_nfse_producao} onChange={handleChange} placeholder="Ex: 1" />
                                                        <Input label="Próximo RPS" name="proxima_nfse_producao" value={companyData.proxima_nfse_producao} onChange={handleChange} placeholder="Ex: 1" />
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                                            <input type="checkbox" name="habilita_nfse_nacional_producao" checked={companyData.habilita_nfse_nacional_producao} onChange={handleCheckboxChange} />
                                                            <span>Ambiente Nacional</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
            

                                {/* Tabela de Séries/Modelos (Informativa) */}
                                <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        <div>Tipo</div>
                                        <div>Modelo</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.75rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ fontWeight: 600 }}>NFC-e</div>
                                        <div style={{ textAlign: 'left' }}>65</div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '0.75rem', padding: '0.5rem 0', borderTop: '1px solid var(--border-color)' }}>
                                        <div style={{ fontWeight: 600 }}>NF-e</div>
                                        <div style={{ textAlign: 'left' }}>55</div>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Regime Tributário</label>
                                    <select name="regime_tributario" value={companyData.regime_tributario} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                        <option value="1">Simples Nacional</option>
                                        <option value="2">Simples Nacional - Excesso</option>
                                        <option value="3">Regime Normal (Lucro Presumido/Real)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Ambiente NFe</label>
                                    <select name="ambiente" value={companyData.ambiente} onChange={handleChange} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                        <option value="2">Homologação (Testes)</option>
                                        <option value="1">Produção (Real)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Input label="Série NFe" name="serie_nfe" type="number" value={companyData.serie_nfe} onChange={handleChange} />
                                    <Input label="Próximo Número NFe" name="proxima_nfe" type="number" value={companyData.proxima_nfe} onChange={handleChange} />
                                </div>

                                <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    Configurações NFC-e (Cupom Fiscal)
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <Input label="Série NFC-e" name="serie_nfce" type="number" value={companyData.serie_nfce} onChange={handleChange} />
                                    <Input label="Próximo Número NFC-e" name="proxima_nfce" type="number" value={companyData.proxima_nfce} onChange={handleChange} />
                                </div>
                                <div style={{ marginTop: '0.5rem' }}>
                                    <Input
                                        label="Versão do sistema emissor (verProc)"
                                        name="ver_proc"
                                        value="1.0.0"
                                        readOnly={true}
                                        style={{ background: 'var(--bg-body)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '1rem', marginTop: '1rem' }}>
                                    <Input label="ID CSC" name="id_csc" type="text" value={companyData.id_csc} onChange={handleChange} placeholder="Ex: 1" />
                                    <Input label="CSC (Código de Segurança do Contribuinte)" name="csc" type="text" value={companyData.csc} onChange={handleChange} placeholder="Obtido na SEFAZ do seu estado" />
                                </div>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    O CSC é necessário para emitir NFC-e. Obtenha na SEFAZ do seu estado.
                                </p>
                            </div>
                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <Button variant="primary" icon={Save} onClick={handleSaveCompany} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Configurações'}</Button>
                                <Button variant="secondary" onClick={handleDiagnostic} disabled={loading} title="Verifica se a empresa existe na API">Testar Comunicação (Diagnóstico)</Button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'certificado' && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Certificado Digital A1</h3>

                            {certInfo?.tem_certificado ? (
                                <div style={{
                                    padding: '1.5rem',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    borderRadius: 'var(--border-radius)',
                                    marginBottom: '2rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem'
                                }}>
                                    <CheckCircle size={32} style={{ color: 'var(--success-color)' }} />
                                    <div>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--success-color)' }}>Certificado Ativo</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                            Validade: <strong>{new Date(certInfo.validade).toLocaleDateString('pt-BR')}</strong>
                                        </p>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            CNPJ Vinculado: {certInfo.cnpj_certificado || companyData.cnpj}
                                        </p>
                                    </div>
                                    <div style={{ marginLeft: 'auto' }}>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm('Deseja substituir o certificado atual?')) {
                                                    setCertInfo(null);
                                                }
                                            }}
                                        >
                                            Substituir
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: 'var(--border-radius)',
                                    padding: '3rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    marginBottom: '2rem',
                                    cursor: 'pointer',
                                    background: certFile ? 'var(--bg-hover)' : 'transparent',
                                    transition: 'all 0.2s'
                                }} onClick={() => fileInputRef.current?.click()}>

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        style={{ display: 'none' }}
                                        accept=".pfx,.p12"
                                        onChange={(e) => setCertFile(e.target.files[0])}
                                    />

                                    <Shield size={48} style={{ marginBottom: '1rem', color: certFile ? 'var(--primary-color)' : 'var(--text-muted)' }} />

                                    {certFile ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{certFile.name}</p>
                                            <p style={{ fontSize: '0.85rem' }}>{(certFile.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Selecione o arquivo do certificado digital (.pfx ou .p12)</p>
                                            <Button variant="secondary" icon={Upload}>Escolher Arquivo</Button>
                                        </>
                                    )}
                                </div>
                            )}

                            <div style={{ opacity: certInfo?.tem_certificado ? 0.6 : 1, pointerEvents: certInfo?.tem_certificado ? 'none' : 'auto' }}>
                                <Input
                                    label="Senha do Certificado"
                                    type="password"
                                    placeholder={certInfo?.tem_certificado ? "•••••••••• (Salva)" : "Digite a senha do certificado"}
                                    value={certPassword}
                                    onChange={(e) => setCertPassword(e.target.value)}
                                    autoComplete="new-password"
                                />

                                <div style={{ marginTop: '1.5rem', display: 'flex' }}>
                                    <Button
                                        onClick={handleCertUpload}
                                        disabled={loading || !certFile || !certPassword}
                                        style={{ width: 'auto' }}
                                        icon={Upload}
                                    >
                                        {loading ? 'Enviando...' : 'Enviar Certificado'}
                                    </Button>
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <p><strong>Importante:</strong> O certificado digital A1 é necessário para emissão de NFe. Certifique-se de que o certificado está válido e dentro do prazo de validade. O certificado será enviado de forma segura para a API de emissão.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gerenciar Usuários</h3>
                                <Button variant="primary" icon={User} onClick={() => { setEditingUser(null); setUserForm({ name: '', email: '', password: '', role: 'user', permissions: { dashboard: true, clientes: true, produtos: true, notas: false, financeiro: false, configuracoes: false } }); setShowUserModal(true); }}>
                                    Novo Usuário
                                </Button>
                            </div>

                            {/* User List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {users.length === 0 ? (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Nenhum usuário cadastrado ainda.</p>
                                ) : users.map(user => (
                                    <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                                {user.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: 600 }}>{user.name}</p>
                                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.email}</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: user.role === 'admin' ? 'rgba(220, 53, 69, 0.15)' : 'rgba(13, 110, 253, 0.15)', color: user.role === 'admin' ? 'var(--danger-color)' : 'var(--primary-color)' }}>
                                                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                                            </span>
                                            <button onClick={() => handleEditUser(user)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-color)', padding: '0.5rem' }}>Editar</button>
                                            <button onClick={() => handleDeleteUser(user.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-color)', padding: '0.5rem' }}>Excluir</button>
                                        </div>
                                    </div>
                                ))}
                            </div>


                        </div>
                    )}

                    {activeTab === 'system' && (
                        <div className="card">
                            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 600 }}>Preferências do Sistema</h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {/* Tema */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>Tema da Interface</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Escolha entre tema claro ou escuro</p>
                                    </div>
                                    <select
                                        value={theme}
                                        onChange={(e) => changeTheme(e.target.value)}
                                        style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="light">☀️ Claro</option>
                                        <option value="dark">🌙 Escuro</option>
                                    </select>
                                </div>

                                {/* Notificações */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>Notificações por E-mail</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Receber alertas sobre notas fiscais e atualizações</p>
                                    </div>
                                    <div
                                        onClick={toggleNotifications}
                                        style={{
                                            width: '48px', height: '24px',
                                            background: notifications ? 'var(--primary-color)' : 'var(--border-color)',
                                            borderRadius: '24px', cursor: 'pointer', position: 'relative', transition: '0.3s'
                                        }}
                                    >
                                        <span style={{
                                            position: 'absolute', top: '2px',
                                            left: notifications ? '26px' : '2px',
                                            width: '20px', height: '20px',
                                            background: 'white', borderRadius: '50%', transition: '0.3s'
                                        }}></span>
                                    </div>
                                </div>

                                {/* Som */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>Sons do Sistema</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tocar sons ao concluir ações</p>
                                    </div>
                                    <div
                                        onClick={toggleSounds}
                                        style={{
                                            width: '48px', height: '24px',
                                            background: sounds ? 'var(--primary-color)' : 'var(--border-color)',
                                            borderRadius: '24px', cursor: 'pointer', position: 'relative', transition: '0.3s'
                                        }}
                                    >
                                        <span style={{
                                            position: 'absolute', top: '2px',
                                            left: sounds ? '26px' : '2px',
                                            width: '20px', height: '20px',
                                            background: 'white', borderRadius: '50%', transition: '0.3s'
                                        }}></span>
                                    </div>
                                </div>

                                {/* Idioma */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>Idioma</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Idioma da interface do sistema</p>
                                    </div>
                                    <select style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                        <option value="pt-BR">🇧🇷 Português (Brasil)</option>
                                        <option value="en">🇺🇸 English</option>
                                        <option value="es">🇪🇸 Español</option>
                                    </select>
                                </div>

                                {/* Fuso Horário */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)' }}>
                                    <div>
                                        <p style={{ fontWeight: 600 }}>Fuso Horário</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Define o horário padrão do sistema</p>
                                    </div>
                                    <select style={{ padding: '0.5rem 1rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                                        <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                                        <option value="America/Manaus">Manaus (GMT-4)</option>
                                        <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                                    </select>
                                </div>

                                {/* Logs de Auditoria */}
                                <div
                                    onClick={() => router.push('/auditoria')}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem',
                                        background: 'var(--bg-body)',
                                        borderRadius: 'var(--border-radius)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-body)'}
                                >
                                    <div>
                                        <p style={{ fontWeight: 600 }}>Logs de Auditoria</p>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                            Histórico de alterações no sistema
                                        </p>
                                    </div>
                                    <span style={{ color: 'var(--text-tertiary)' }}>→</span>
                                </div>

                                {/* Versão */}
                                <div style={{ padding: '1rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', textAlign: 'center' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        <strong>Work ERP</strong> - Versão 1.0.0
                                    </p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                        © 2026 Todos os direitos reservados
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* User Modal (Global) */}
            {showUserModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--border-radius)', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Input label="Nome Completo" name="name" value={userForm.name} onChange={handleUserFormChange} required />
                            <Input label="E-mail" name="email" type="email" value={userForm.email} onChange={handleUserFormChange} required disabled={!!editingUser} />
                            {!editingUser && <Input label="Senha" name="password" type="password" value={userForm.password} onChange={handleUserFormChange} required minLength={6} />}

                            {userForm.role === 'accountant' ? (
                                <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--border-radius)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                    <p style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.9rem' }}>Função: Contador</p>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                                        Este usuário terá acesso restrito ao Portal da Contabilidade para baixar XMLs.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Função</label>
                                        <select name="role" value={userForm.role} onChange={handleUserFormChange} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                            <option value="user">Usuário</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 500 }}>Permissões de Acesso</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {PERMISSION_MODULES.map(perm => (
                                                <div key={perm.id} onClick={() => togglePermission(perm.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', background: 'var(--bg-body)', borderRadius: 'var(--border-radius)', cursor: 'pointer', border: '1px solid var(--border-color)' }}>
                                                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: '2px solid var(--border-color)', background: userForm.permissions[perm.id] !== false ? 'var(--primary-color)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {userForm.permissions[perm.id] !== false && <span style={{ color: 'white', fontSize: '0.7rem' }}>✓</span>}
                                                    </div>
                                                    <span style={{ fontSize: '0.9rem' }}>{perm.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <Button variant="secondary" onClick={() => setShowUserModal(false)} style={{ flex: 1 }}>Cancelar</Button>
                            <Button variant="primary" onClick={handleSaveUser} disabled={loading} style={{ flex: 1 }}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
            />
        </div >
    );
}