// Arquivo: Login.js

// =================================================================
// 1. CONFIGURAÇÃO DE CREDENCIAIS E CONSTANTES
// =================================================================

const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';

const ALLOWED_EMAIL_DOMAIN = '@cevalogistics.com';
const MENU_PATH = '../Menu/Menu.html';
const SESSION_KEY = 'custom_user_session'; // Chave para salvar a sessão manual

// Inicializa o cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =================================================================
// 2. ELEMENTOS DE UI E ESTADO
// =================================================================

// UI Geral
const formTitle = document.getElementById('form-title');
const loginArea = document.getElementById('login-area');
const signupArea = document.getElementById('signup-area');
const errorMessage = document.getElementById('error-message');

// UI Cadastro e Validação
const signupForm = document.getElementById('signup-form');
const codeValidationArea = document.getElementById('code-validation-area');
const validateCodeButton = document.getElementById('validate-code-button');
const backToSignupFields = document.getElementById('back-to-signup-fields');
const validationCodeInput = document.getElementById('validation-code');

// Estado temporário (armazena os dados até a validação do código)
let tempSignupData = {};

// =================================================================
// 3. FUNÇÕES AUXILIARES DE UI (TOAST e Telas)
// =================================================================

function clearMessages() {
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

/**
 * Exibe uma mensagem Toast discreta no canto superior.
 * @param {string} text - O texto da mensagem.
 * @param {boolean} isError - Se é uma mensagem de erro (usa cor vermelha).
 */
function displayToast(text, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return; // Adicionado para segurança
    const toast = document.createElement('div');
    toast.textContent = text;

    // Usa 'toast-info' se não for explicitamente um erro ou sucesso, para status
    let typeClass;
    if (isError) {
        typeClass = 'toast-error';
    } else if (text.toLowerCase().includes('aprovado') || text.toLowerCase().includes('sucesso')) {
        typeClass = 'toast-success';
    } else {
        typeClass = 'toast-info';
    }

    toast.className = 'toast-message ' + typeClass;
    container.appendChild(toast);
    void toast.offsetWidth;
    toast.classList.add('show');

    // Usa o tempo de visibilidade do seu CSS (3000ms)
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }, 3000);
}

function showLogin() {
    clearMessages();
    if(formTitle) formTitle.textContent = 'Acesso ao Sistema';
    if(loginArea) loginArea.style.display = 'block';
    if(signupArea) signupArea.style.display = 'none';
    if(signupForm) signupForm.style.display = 'block';
    if(codeValidationArea) codeValidationArea.style.display = 'none';
    const loginForm = document.getElementById('login-form');
    if(loginForm) loginForm.reset();
    tempSignupData = {};
}

function showSignup() {
    clearMessages();
    if(formTitle) formTitle.textContent = 'Novo Cadastro';
    if(loginArea) loginArea.style.display = 'none';
    if(signupArea) signupArea.style.display = 'block';
    if(signupForm) signupForm.style.display = 'block';
    if(codeValidationArea) codeValidationArea.style.display = 'none';
    const signupFormElement = document.getElementById('signup-form');
    if(signupFormElement) signupFormElement.reset();
    tempSignupData = {};
}

// =================================================================
// 4. LISTENERS DE NAVEGAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se a sessão manual existe
    const customSession = localStorage.getItem(SESSION_KEY);
    if (customSession) {
        // Se já tem sessão, redireciona
        window.location.href = MENU_PATH;
    }

    const showSignupBtn = document.getElementById('show-signup-button');
    if(showSignupBtn) showSignupBtn.addEventListener('click', showSignup);
    const backToLoginBtn = document.getElementById('back-to-login');
    if(backToLoginBtn) backToLoginBtn.addEventListener('click', showLogin);


    // Listener para voltar do campo de código para o formulário
    if(backToSignupFields) {
        backToSignupFields.addEventListener('click', () => {
            if(signupForm) signupForm.style.display = 'block';
            if(codeValidationArea) codeValidationArea.style.display = 'none';
            if(validationCodeInput) validationCodeInput.value = '';
        });
    }

    // Listener para o botão de validação de código
    if(validateCodeButton) validateCodeButton.addEventListener('click', handleCodeValidation);
});


// =================================================================
// 5. FUNCIONALIDADE DE LOGIN (USANDO APPROVED_USERS E RPC manual_login)
// =================================================================

const loginFormElement = document.getElementById('login-form');
if(loginFormElement) {
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const identifier = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        // 1. Chama a função RPC para verificar credenciais na approved_users
        const { data: loginResult, error: loginError } = await supabaseClient.rpc('manual_login', {
            p_identifier: identifier,
            p_password: password,
        });

        if (loginError) {
            console.error('Erro de RPC no login:', loginError);
            displayToast('Erro de comunicação. Tente novamente.', true);
            return;
        }

        if (loginResult && loginResult.success) {
            // 2. SUCESSO: O usuário existe e as credenciais estão corretas.

            const user = loginResult; // user contém user_id, username, email

            // DADOS CRÍTICOS: Se o JWT não vier no RPC, você deve usar o auth.signIn
            // ou ajustar o RPC para fornecê-lo.
            // Para fins de demonstração, simularemos um token.
            const access_token = user.access_token || "JWT_FICTICIO_PARA_AUTENTICACAO_EM_IFRAME";

            // 3. Armazena a sessão manualmente no navegador (IMPORTANTE PARA MANTER O LOGIN)
            localStorage.setItem(SESSION_KEY, JSON.stringify({
                id: user.user_id,
                username: user.username, // 🔑 CORRIGIDO: Agora salvando o username
                email: user.email,
                // 🔑 CORREÇÃO CRÍTICA: Salva o TOKEN DE ACESSO para uso em iframes
                access_token: access_token,
                // CRÍTICO: Salva o tempo de login em MILISSEGUNDOS para o controle de timeout
                logged_in_at: new Date().getTime()
            }));

            // AÇÃO: MOSTRAR MENSAGEM DE SUCESSO POR 1.5S E DEPOIS REDIRECIONAR
            displayToast('Login Aprovado! Redirecionando...');

            // Espera 1.5 segundos (1500ms) antes de redirecionar
            setTimeout(() => {
                window.location.href = MENU_PATH;
            }, 1500);

        } else {
            // 4. FALHA: Credenciais inválidas (Erro vindo do RPC)
            const errorMessage = loginResult ? loginResult.error : 'Credenciais inválidas.';
            displayToast('Erro ao fazer login: ' + errorMessage, true);
        }
    });
}

// =================================================================
// 6. SOLICITAÇÃO DE CÓDIGO (Chama a função request_master_code)
// =================================================================

const signupFormElement = document.getElementById('signup-form');
if(signupFormElement) {
    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearMessages();

        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const username = document.getElementById('signup-username').value;

        // 1. Validação de Domínio
        if (!email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
            displayToast('Cadastro permitido apenas para ' + ALLOWED_EMAIL_DOMAIN, true);
            return;
        }

        // 2. Armazena dados de cadastro no estado temporário
        tempSignupData = { email, password, username };

        // 3. Chama a função SQL request_master_code
        const { data, error } = await supabaseClient.rpc('request_master_code', {
            p_email: email,
            p_password: password,
            p_username: username
        });

        if (error) {
            console.error('Erro na solicitação do código:', error);
            displayToast('Erro ao solicitar o código. Tente novamente ou contate o suporte.', true);
            tempSignupData = {};
            return;
        }

        // 4. Sucesso: Esconde o formulário e mostra a área de validação
        displayToast('Código solicitado com sucesso. Verifique com seu Master Admin.', false);

        if(signupForm) signupForm.style.display = 'none';
        if(codeValidationArea) codeValidationArea.style.display = 'block';
        if(validationCodeInput) validationCodeInput.value = ''; // Limpa o campo de código
    });
}


// =================================================================
// 7. VALIDAÇÃO DE CÓDIGO (Chama a função validate_master_code)
// =================================================================

async function handleCodeValidation() {
    const code = validationCodeInput.value.trim();

    if (!code || code.length !== 6) {
        displayToast('Insira um código de 6 dígitos válido.', true);
        return;
    }

    // Desabilita o botão para evitar cliques duplicados
    if(validateCodeButton) {
        validateCodeButton.disabled = true;
        validateCodeButton.textContent = 'Validando...';
    }

    // 1. Chama a função SQL validate_master_code
    const { data: result, error } = await supabaseClient.rpc('validate_master_code', {
        p_code: code
    });

    // Limpa o campo do código após a tentativa
    if(validationCodeInput) validationCodeInput.value = '';

    if (error) {
        console.error('Erro na validação RPC:', error);
        displayToast('Erro de comunicação. Tente novamente.', true);
        if(validateCodeButton) {
            validateCodeButton.disabled = false;
            validateCodeButton.textContent = 'Validar Código e Finalizar Cadastro';
        }
        return;
    }

    // A função SQL retorna um JSON, que o Supabase converte para um objeto JS no 'data'.
    if (result && result.success) {
        // 2. SUCESSO: A conta foi criada na approved_users e o código foi excluído.

        displayToast('Cadastro finalizado e aprovado! Faça login com suas novas credenciais.', false);

        // AÇÃO CRÍTICA: REDIRECIONA PARA A TELA DE LOGIN MANUAL

        // Simula o clique no botão "Voltar ao Login" e mostra a mensagem de sucesso
        showLogin();
        displayToast('Seu acesso foi liberado. Use seu nome de usuário e senha para entrar.', false);

    } else {
        // 3. Validação falhou (código inválido, expirado, ou erro interno do SQL)
        const errorMessage = result ? result.error : 'Erro desconhecido na validação.';
        displayToast(errorMessage, true);
    }

    // 4. Reabilita o botão (finalmente, em caso de sucesso ou falha)
    if(validateCodeButton) {
        validateCodeButton.disabled = false;
        validateCodeButton.textContent = 'Validar Código e Finalizar Cadastro';
    }
}

// =================================================================
// 8. FUNCIONALIDADE DE LOGOUT (Para ser chamada em Menu.html)
// =================================================================

/**
 * Lida com o processo de logout: exibe toast, limpa a sessão e redireciona.
 * ESTA FUNÇÃO DEVE SER CHAMADA PELO BOTÃO "SAIR" NA PÁGINA Menu.html
 */
window.logoutUser = async () => {
    // 1. Mostrar mensagem de deslogando por 1.5s
    displayToast('Deslogando do sistema...');

    // Opcional: Chamar uma função RPC para desativar a sessão 'is_active' no banco
    const userSession = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (userSession && userSession.id) {
        // await supabaseClient.rpc('manual_logout', { p_user_id: userSession.id });
    }

    // Simula o processo de deslogar por 1.5s antes de limpar a sessão e redirecionar
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 2. Limpar a sessão manual
    localStorage.removeItem(SESSION_KEY);

    // 3. Redirecionar para a tela de login (ajuste o caminho se necessário)
    window.location.href = '../Login/Login.html';
};