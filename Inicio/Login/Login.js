const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MENU_PATH = '../TelaInicio/TelaInicio.html';

function displayToast(text, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.className = `toast-message ${isError ? 'toast-error' : 'toast-success'} show`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function showSignup() {
    document.getElementById('login-area').style.display = 'none';
    document.getElementById('signup-area').style.display = 'block';
    document.getElementById('form-title').textContent = 'Validar Convite';
}

function showLogin() {
    document.getElementById('login-area').style.display = 'block';
    document.getElementById('signup-area').style.display = 'none';
    document.getElementById('form-title').textContent = 'Entrar no App';
}

// LOGIN: Quem já está cadastrado
async function handleLogin(e) {
    e.preventDefault();
    const nome = document.getElementById('login-user').value.trim();
    const codigo = document.getElementById('login-code').value.trim();

    const { data, error } = await supabaseClient
        .from('cadastro_usuarios')
        .select('*')
        .eq('user_nome', nome)
        .eq('codigo_acesso', codigo)
        .maybeSingle();

    if (data) {
        // ADICIONADO: Timestamp de expiração (Momento atual)
        const sessionData = {
            ...data,
            login_at: new Date().getTime()
        };

        localStorage.setItem('user_session', JSON.stringify(sessionData));
        displayToast('Acesso concedido!');
        setTimeout(() => window.location.href = MENU_PATH, 1000);
    } else {
        displayToast('Usuário ou código não encontrados.', true);
    }
}

// SIGNUP: Primeiro acesso
async function handleSignup(e) {
    e.preventDefault();
    const nome = document.getElementById('signup-nome').value.trim();
    const tel = document.getElementById('signup-tel').value.trim();
    const codigo = document.getElementById('signup-code').value.trim();

    const { data: convite } = await supabaseClient
        .from('cadastro_usuarios')
        .select('*')
        .eq('codigo_acesso', codigo)
        .maybeSingle();

    if (!convite) {
        displayToast('Código de convite inválido!', true);
        return;
    }

    if (convite.user_nome !== 'PENDENTE') {
        displayToast('Este código já foi utilizado.', true);
        return;
    }

    const { data, error } = await supabaseClient
        .from('cadastro_usuarios')
        .update({ user_nome: nome, telefone: tel })
        .eq('codigo_acesso', codigo)
        .select()
        .single();

    if (!error) {
        // ADICIONADO: Timestamp de expiração no cadastro também
        const sessionData = {
            ...data,
            login_at: new Date().getTime()
        };

        localStorage.setItem('user_session', JSON.stringify(sessionData));
        displayToast('Cadastro realizado!');
        setTimeout(() => window.location.href = MENU_PATH, 1000);
    } else {
        displayToast('Erro ao finalizar cadastro.', true);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('signup-form')?.addEventListener('submit', handleSignup);
});