/*
 * Arquivo: Ferramentas.js (Filho - Iframe)
 * Gerencia o retorno seguro ao Menu principal, comunicação de atividade
 * e agora, a navegação interna para W2W FT SOBRAS.
 */

// Elementos do DOM interno
const btnVoltarMain = document.getElementById('btnVoltarMain');
const contentArea = document.getElementById('ferramentas-content-area');
const usernameDisplayFerramentas = document.getElementById('username-display-ferramentas');
const ferramentasMenuButtons = document.getElementById('ferramentas-menu-buttons'); // Agora será usado

// URLs dos Sub-Módulos (Configuração de URLs internas)
const subModuleUrls = {
    // 🚨 CAMINHO CORRIGIDO: Direciona para a pasta W2WFTSobras e o arquivo HTML dentro dela
    'btnW2WSobras': './W2WFTSobras/W2WFTSobras.html',
};


// =================================================================
// 1. FUNÇÕES DE SEGURANÇA E COMUNICAÇÃO (TIMEOUT)
// =================================================================

function sendActivitySignal() {
    if (window.parent) {
        window.parent.postMessage({
            action: 'update_activity'
        }, '*');
    }
}

function handleVoltarMain() {
    if (window.parent) {
        window.parent.postMessage({
            action: 'return_to_main_menu'
        }, '*');
    }
}

function loadUsername() {
    const sessionKey = 'custom_user_session';
    const customSession = localStorage.getItem(sessionKey);
    let username = 'Usuário';

    if (customSession) {
        try {
            const USER_DATA = JSON.parse(customSession);
            username = USER_DATA.username ? USER_DATA.username.toUpperCase() : 'Usuário';
        } catch (e) {
            console.warn("Erro ao ler dados do usuário no Ferramentas.js.");
        }
    }
    if (usernameDisplayFerramentas) {
        usernameDisplayFerramentas.textContent = username;
    }
}

// =================================================================
// 2. FUNÇÕES DE LAYOUT E NAVEGAÇÃO (REINTRODUZIDAS)
// =================================================================

function showFerramentasWelcomeMessage() {
    // 1. Limpa a seleção de botões
    document.querySelectorAll('.ferr-menu-button').forEach(btn => {
         btn.classList.remove('active');
    });

    // 2. Carrega a mensagem inicial
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="welcome-card">
                <h2 class="module-title">Bem-vindo ao Módulo Ferramentas</h2>
                <p>Selecione uma opção no menu lateral para começar.</p>
            </div>
        `;
    }
}

function loadSubModule(url, buttonId) {
    // 1. Limpa o estado "ativo" e define o novo botão como ativo
    document.querySelectorAll('.ferr-menu-button').forEach(btn => {
        btn.classList.remove('active');
    });
    const clickedButton = document.getElementById(buttonId);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    // 2. Carrega o conteúdo no Iframe
    if (contentArea) {
        contentArea.innerHTML = '';
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.margin = '0';
        iframe.style.padding = '0';
        contentArea.appendChild(iframe);
    }

    sendActivitySignal(); // Sinaliza atividade após carregar novo conteúdo
}


// =================================================================
// 3. INICIALIZAÇÃO E CONTROLE DE INATIVIDADE
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    loadUsername();
    showFerramentasWelcomeMessage(); // Garante a mensagem inicial ao carregar

    if (btnVoltarMain) {
        btnVoltarMain.addEventListener('click', handleVoltarMain);
    }

    // Listener de cliques nos botões de sub-módulo
    if (ferramentasMenuButtons) {
        ferramentasMenuButtons.addEventListener('click', (e) => {
            const button = e.target.closest('.ferr-menu-button');
            if (button && button.id in subModuleUrls) {
                loadSubModule(subModuleUrls[button.id], button.id);
            }
        });
    }

    // LISTENERS GLOBAIS DE ATIVIDADE
    document.addEventListener('click', sendActivitySignal);
    document.addEventListener('keypress', sendActivitySignal);
    document.addEventListener('mousemove', sendActivitySignal);
});