// Arquivo: Menu.js (Pai - Host de Autenticação - CORRIGIDO)

// =================================================================
// 0. CONFIGURAÇÃO DE CREDENCIAIS E CONSTANTES
// =================================================================
const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const LOGIN_PATH = '../Login/Login.html';
const SESSION_KEY = 'custom_user_session';
const SESSION_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora em milissegundos

let USER_DATA = null;
let lastActivityTime = Date.now();
let activityCheckInterval;

// Mapeamento de DOM
const dynamicMenuButtons = document.getElementById('dynamic-menu-buttons');
const contentArea = document.getElementById('content-area');
const dynamicFooterButton = document.getElementById('dynamic-footer-button');
const usernameDisplay = document.getElementById('username-display');

// =================================================================
// 1. FUNÇÃO AUXILIAR DE TOAST
// =================================================================
function displayToast(text, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn("toast-container não encontrado. Apenas logando: " + text);
        return;
    }

    const toast = document.createElement('div');
    toast.textContent = text;
    let typeClass = isError ? 'toast-error' : 'toast-success';

    toast.className = 'toast-message ' + typeClass;
    container.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }, 2000);
}


// =================================================================
// 2. CONFIGURAÇÃO GLOBAL DE MÓDULOS
// =================================================================

const MODULE_CONFIG = {
    operacao: {
        id: 'operacao',
        name: 'OPERAÇÃO',
        url: './Operacao/Operacao.html',
        icon: 'fas fa-hammer'
    },
    ferramentas: {
        id: 'ferramentas',
        name: 'FERRAMENTAS',
        url: './Ferramentas/Ferramentas.html',
        icon: 'fas fa-cogs'
    }
};

// Configuração do Módulo de Sobras (Acesso Direto, SEM BOTÃO FIXO)
const SOBRAS_MODULE = {
    id: 'sobras',
    // 🔑 CORREÇÃO CRÍTICA DO CAMINHO COM BASE NA ESTRUTURA
    url: './Ferramentas/W2WFTSobras/W2WFTSobras.html'
};


// =================================================================
// 3. FUNÇÕES DE SEGURANÇA E SESSÃO
// =================================================================
async function updateActivity() {
    lastActivityTime = Date.now();
}

function checkTimeout() {
    const currentTime = Date.now();

    if (currentTime - lastActivityTime > SESSION_TIMEOUT_MS) {
        clearInterval(activityCheckInterval);
        alert('Sua sessão expirou por inatividade. Faça login novamente.');
        handleLogout();
        return;
    }

    if (USER_DATA && USER_DATA.logged_in_at && currentTime - USER_DATA.logged_in_at > SESSION_TIMEOUT_MS) {
        clearInterval(activityCheckInterval);
        alert('Tempo máximo de sessão atingido (1 hora). Faça login novamente.');
        handleLogout();
    }
}

function loadUserProfile(username) {
    if (usernameDisplay) usernameDisplay.textContent = username ? username.toUpperCase() : 'Usuário (Desconhecido)';
}

async function handleLogout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = LOGIN_PATH;
}


// =================================================================
// 4. FUNÇÕES DE CONTEÚDO E COMUNICAÇÃO (postMessage)
// =================================================================

/**
 * Carrega o módulo em iframe. Envia o token SOMENTE se não for o módulo de Sobras (MODO ANÔNIMO).
 */
window.loadContent = function(url, moduleId) {
    if (contentArea) {
        contentArea.innerHTML = '';
        contentArea.style.padding = '0';
        contentArea.style.height = '100vh';

        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.id = `iframe-${moduleId}`;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.margin = '0';
        iframe.style.padding = '0';

        contentArea.appendChild(iframe);
        updateActivity();

        // 🎯 LÓGICA DE COMUNICAÇÃO CONDICIONAL (IGNORA SOBRAS PARA O TESTE ANÔNIMO)
        if (moduleId !== SOBRAS_MODULE.id) {
            iframe.onload = function() {
                setTimeout(() => {
                    if (USER_DATA && USER_DATA.access_token) {
                        iframe.contentWindow.postMessage({
                            action: 'init_supabase_session',
                            jwt: USER_DATA.access_token,
                            username: USER_DATA.username
                        }, '*');
                        console.log(`✅ [Menu.js] JWT e Username enviados para ${moduleId}.`);
                    } else {
                         console.error(`[Menu.js] TOKEN AUSENTE. Módulo ${moduleId} não autenticado.`);
                    }
                }, 500);
            };
        } else {
             console.log(`✅ [Menu.js] Módulo ${moduleId} carregado. POSTMESSAGE IGNORADO (MODO ANÔNIMO).`);
        }
    }
}

/**
 * Função de acesso direto para o módulo de Sobras.
 */
window.loadSobrasModule = function() {
    window.loadContent(SOBRAS_MODULE.url, SOBRAS_MODULE.id);
    toggleMenuButton(SOBRAS_MODULE.id);
};


function showWelcomeMessage() {
    if (contentArea) {
         contentArea.style.padding = '30px';
         contentArea.style.height = 'auto';
         contentArea.innerHTML = `
            <h1>Bem-vindo ao Sistema de Inventário</h1>
            <p>Use o menu lateral para navegar entre os módulos.</p>
        `;
    }
}

function toggleMenuButton(activeModuleId) {
    if (!dynamicMenuButtons || !dynamicFooterButton) return;

    const bodyElement = document.body;
    dynamicFooterButton.innerHTML = '';

    const allModules = {...MODULE_CONFIG, [SOBRAS_MODULE.id]: { id: SOBRAS_MODULE.id, name: 'W2W FT SOBRAS' }};

    if (activeModuleId) {
        // MODO MÓDULO ATIVO (Mostra botão de Voltar)
        dynamicMenuButtons.innerHTML = '';
        bodyElement.classList.add('module-active');

        const moduleData = allModules[activeModuleId];
        let moduleName = moduleData ? moduleData.name : 'MÓDULO';

        dynamicFooterButton.innerHTML = `
            <button id="btnVoltarMenu" class="menu-button">
                <i class="fas fa-arrow-circle-left menu-icon"></i>
                <span>SAIR DE ${moduleName}</span>
            </button>
        `;
        const btnVoltar = document.getElementById('btnVoltarMenu');
        if(btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                toggleMenuButton(null);
                showWelcomeMessage();
            });
        }

    } else {
        // MODO INICIAL: GERA APENAS BOTÕES DO MODULE_CONFIG
        bodyElement.classList.remove('module-active');
        dynamicMenuButtons.innerHTML = '';

        Object.values(MODULE_CONFIG).forEach(module => {
            const buttonHtml = `
                <button id="btn${module.id.charAt(0).toUpperCase() + module.id.slice(1)}" class="menu-button" data-module-id="${module.id}">
                    <i class="${module.icon} menu-icon"></i>
                    <span>${module.name}</span>
                </button>
            `;
            dynamicMenuButtons.innerHTML += buttonHtml;
        });

        // Adiciona listeners aos botões gerados
        Object.values(MODULE_CONFIG).forEach(module => {
            const button = document.querySelector(`[data-module-id="${module.id}"]`);
            if (button) {
                button.addEventListener('click', () => {
                    toggleMenuButton(module.id);
                    window.loadContent(module.url, module.id);
                });
            }
        });
    }
}

// =================================================================
// 5. RECEPÇÃO DE MENSAGENS E INICIALIZAÇÃO
// =================================================================

window.addEventListener('message', function(event) {
    if (event.data && event.data.action === 'return_to_main_menu') {
        toggleMenuButton(null);
        showWelcomeMessage();
    }
    else if (event.data && event.data.action === 'update_activity') {
        updateActivity();
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const customSession = localStorage.getItem(SESSION_KEY);
    if (!customSession) {
        alert('Sessão expirada. Redirecionando para o Login.');
        window.location.href = LOGIN_PATH;
        return;
    }

    try {
        USER_DATA = JSON.parse(customSession);
        if (typeof USER_DATA.logged_in_at === 'string') USER_DATA.logged_in_at = new Date(USER_DATA.logged_in_at).getTime();

        if (!USER_DATA.access_token) {
            console.error("ERRO: TOKEN DE ACESSO AUSENTE na sessão. Redirecionando.");
            throw new Error("Token ausente.");
        }

    } catch (e) {
        console.error("Erro ao carregar dados da sessão. Redirecionando...", e);
        localStorage.removeItem(SESSION_KEY);
        window.location.href = LOGIN_PATH;
        return;
    }

    loadUserProfile(USER_DATA.username);
    updateActivity();

    // Listeners de atividade
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('mousemove', updateActivity);

    // Intervalo de verificação de timeout
    activityCheckInterval = setInterval(checkTimeout, 5 * 60 * 1000);

    const btnLogout = document.getElementById('btn-logout');
    if(btnLogout) btnLogout.addEventListener('click', handleLogout);

    // 🌟 Tela Inicial 🌟
    toggleMenuButton(null);
    showWelcomeMessage();

    // ✅ TOAST CORRIGIDO: Mostra apenas o nome do usuário.
    displayToast(`✅ Usuário Autenticado: ${USER_DATA.username}`, false);
});