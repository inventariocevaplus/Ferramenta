/*
 * Arquivo: Black.js
 * Gerencia a navegação interna e o retorno seguro para a tela Operacao.html (seu PARENT).
 */

const btnVoltarOperacao = document.getElementById('btnVoltarOperacao');
const usernameDisplayBlack = document.getElementById('username-display-black');
const blackContentArea = document.getElementById('black-content-area');

const subModuleUrls = {
    // URL para o módulo FORMS (crie este arquivo se for usar o botão)
    'btnForms': './Forms/Forms.html',
};

// =================================================================
// 1. FUNÇÃO DE RETORNO PARA OPERACAO.HTML (O PAI DESTE IFRAME)
// =================================================================

function handleVoltarOperacao() {
    // Ação CRÍTICA: Envia uma mensagem para o Operacao.html (o PARENT deste Iframe)
    if (window.parent) {
        window.parent.postMessage({
            action: 'return_to_operacao_main' // Ação que Operacao.js escuta
        }, '*');
    } else {
        console.error("Não foi possível comunicar com o Operacao.js.");
    }
}

// =================================================================
// 2. FUNÇÕES DE UTILIDADE E NAVEGAÇÃO INTERNA
// =================================================================

function loadUsername() {
    const sessionKey = 'custom_user_session';
    const customSession = localStorage.getItem(sessionKey);
    let username = 'Usuário';

    // ... (restante da lógica de carregamento do username) ...
    if (customSession) {
        try {
            const USER_DATA = JSON.parse(customSession);
            username = USER_DATA.username ? USER_DATA.username.toUpperCase() : 'Usuário';
        } catch (e) {
            console.warn("Erro ao ler dados do usuário no Black.js.");
        }
    }
    if (usernameDisplayBlack) {
        usernameDisplayBlack.textContent = username;
    }
}

function loadBlackSubModule(url, buttonId) {
    document.querySelectorAll('.black-menu-button').forEach(btn => {
        btn.classList.remove('active');
    });
    const clickedButton = document.getElementById(buttonId);
    if (clickedButton) {
        clickedButton.classList.add('active');
    }

    if (blackContentArea) {
        blackContentArea.innerHTML = '';

        // Carrega o sub-módulo (ex: Forms)
        blackContentArea.innerHTML = `
            <iframe src="${url}" style="width:100%; height:100%; border:none;"></iframe>
        `;
    }
}


// =================================================================
// 3. INICIALIZAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    loadUsername();

    if (btnVoltarOperacao) {
        btnVoltarOperacao.addEventListener('click', handleVoltarOperacao);
    }

    // Listener de cliques nos botões de sub-módulo (ex: FORMS)
    const menuButtons = document.getElementById('black-menu-buttons');
    if (menuButtons) {
        menuButtons.addEventListener('click', (e) => {
            const button = e.target.closest('.black-menu-button');
            if (button && button.id in subModuleUrls) {
                loadBlackSubModule(subModuleUrls[button.id], button.id);
            }
        });
    }
});