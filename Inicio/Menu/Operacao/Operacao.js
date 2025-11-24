/*
 * Arquivo: Operacao.js (Filho - Iframe)
 * Gerencia a navegação interna, o dropdown de Contratos, e o retorno seguro ao Menu principal.
 * Também escuta o retorno de Iframes filhos (como Black.html).
 * ADICIONADO: Comunicação com o Pai para manter a sessão ativa (Logout de 1h).
 */

// Elementos do DOM interno
const btnVoltarMain = document.getElementById('btnVoltarMain');
const contentArea = document.getElementById('operacao-content-area');
const operacaoMenuButtons = document.getElementById('operacao-menu-buttons');
const usernameDisplayOperacao = document.getElementById('username-display-operacao');
const btnContratos = document.getElementById('btnContratos');
const contratosDropdown = document.getElementById('contratos-dropdown');
const operacaoMainLayout = document.querySelector('.operacao-main-layout');
const clockDisplay = document.getElementById('clock-display'); // Certifique-se de ter este ID no seu HTML

// URLs dos Sub-Módulos
const subModuleUrls = {
    'btnDashOperacao': '../Operacao/DashOperacao.html',
    'btnConsultaOperacao': '../Operacao/ConsultaOperacao.html',
};

// =================================================================
// 1. FUNÇÕES DE SEGURANÇA E TEMPO
// =================================================================

function sendActivitySignal() {
    // Envia uma mensagem para o Menu.js (Pai) para atualizar o lastActivityTime.
    if (window.parent) {
        window.parent.postMessage({
            action: 'update_activity'
        }, '*');
    }
}

function updateClock() {
    const now = new Date();
    // Exibe a hora, minutos e segundos.
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (clockDisplay) {
        clockDisplay.textContent = timeString;
    }
}

// =================================================================
// 2. FUNÇÕES DE NAVEGAÇÃO E LAYOUT
// =================================================================

function handleVoltarMain() {
    // Envia a mensagem segura para o Menu.js (Pai do Operacao.html)
    if (window.parent) {
        window.parent.postMessage({
            action: 'return_to_main_menu'
        }, '*');
    }
}

function toggleSidebarOperacao(show) {
    // Controla a classe que esconde/mostra a barra lateral da Operação (Operacao.css)
    if (operacaoMainLayout) {
        if (show) {
            operacaoMainLayout.classList.remove('full-content-mode');
        } else {
            operacaoMainLayout.classList.add('full-content-mode');
        }
    }
}

function showOperacaoWelcomeMessage() {
    // 1. Garante que o menu da Operação esteja visível e limpa a seleção
    toggleSidebarOperacao(true);
    document.querySelectorAll('.op-menu-button').forEach(btn => {
         btn.classList.remove('active');
    });

    // 2. Carrega a mensagem inicial
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="welcome-card">
                <h2 class="module-title">Bem-vindo ao Módulo Operação</h2>
                <p>Selecione uma opção no menu lateral para começar.</p>
            </div>
        `;
    }
}

function loadSubModule(url, buttonId) {
    // 1. Limpa o estado "ativo"
    document.querySelectorAll('.op-menu-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // 2. Controla o layout (esconde ou mostra o menu da Operação)
    if (buttonId.includes('ContratoBlack')) {
        // Módulo Stanley Black tem seu próprio menu, então esconde o da Operação
        toggleSidebarOperacao(false);
    } else {
        // Dash e Consulta usam o menu da Operação
        toggleSidebarOperacao(true);
    }

    // 3. Define o novo botão como ativo
    const clickedButton = document.getElementById(buttonId);
    if (clickedButton) {
        clickedButton.classList.add('active');
        // Se for um sub-botão, marque o botão pai (CONTRATOS) como ativo visualmente
        if (clickedButton.classList.contains('sub-button')) {
            btnContratos.classList.add('active');
        }
    }

    // 4. Carrega o conteúdo no Iframe
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

function toggleContratosDropdown() {
    btnContratos.classList.toggle('active');
    contratosDropdown.classList.toggle('active');
    sendActivitySignal(); // Sinaliza atividade ao interagir com o dropdown
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
            console.warn("Erro ao ler dados do usuário no Operacao.js.");
        }
    }
    if (usernameDisplayOperacao) {
        usernameDisplayOperacao.textContent = username;
    }
}


// =================================================================
// 3. RECEPÇÃO DE MENSAGENS (Ouvir Retorno de Iframes Filhos)
// =================================================================

window.addEventListener('message', function(event) {
    // Ação 'return_to_operacao_main' é enviada pelo Black.js ao clicar em 'SAIR DE STANLEY BLACK'
    if (event.data && event.data.action === 'return_to_operacao_main') {
        showOperacaoWelcomeMessage();
        sendActivitySignal(); // Sinaliza atividade ao retornar

        // Garante que o dropdown de Contratos feche no retorno
        if (contratosDropdown && contratosDropdown.classList.contains('active')) {
            toggleContratosDropdown();
        }
    }
});


// =================================================================
// 4. INICIALIZAÇÃO E CONTROLE DE INATIVIDADE
// =================================================================

document.addEventListener('DOMContentLoaded', () => {

    loadUsername();
    showOperacaoWelcomeMessage(); // Garante a mensagem inicial ao carregar

    // Inicia o relógio e o atualiza a cada segundo
    updateClock();
    setInterval(updateClock, 1000);

    if (btnVoltarMain) {
        btnVoltarMain.addEventListener('click', handleVoltarMain);
    }

    // Listener para abrir/fechar o dropdown CONTRATOS
    if (btnContratos) {
        btnContratos.addEventListener('click', toggleContratosDropdown);
    }

    // Listener de cliques nos botões de sub-módulo
    if (operacaoMenuButtons) {
        operacaoMenuButtons.addEventListener('click', (e) => {
            const button = e.target.closest('.op-menu-button');
            if (button) {
                const url = button.getAttribute('data-url');

                // Trata sub-módulos (Contrato Black)
                if (url) {
                    loadSubModule(url, button.id);
                }
                // Trata módulos padrões (Dash, Consulta)
                else if (button.id in subModuleUrls) {
                    loadSubModule(subModuleUrls[button.id], button.id);
                }

                // Fecha o dropdown se um item sub ou padrão (não-Contratos) for clicado
                if (button.id !== 'btnContratos' && contratosDropdown.classList.contains('active')) {
                    // Espera-se que o loadSubModule já tenha sido chamado antes de fechar
                    setTimeout(toggleContratosDropdown, 10);
                }
            }
        });
    }

    // ADICIONADO: LISTENERS DE ATIVIDADE PARA COMUNICAR O PAI
    // Qualquer atividade no Operacao.js reinicia o contador de 1 hora no Menu.js
    document.addEventListener('click', sendActivitySignal);
    document.addEventListener('keypress', sendActivitySignal);
    document.addEventListener('mousemove', sendActivitySignal);
});