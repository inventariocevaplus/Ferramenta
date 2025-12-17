const supabaseClient = window.supabase.createClient(
    'https://wzvjgfubiodrjlycuiqa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ'
);

// Função de Notificação (Toast) que some em 1 segundo
function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 1000);
}

// Inicialização e Trava de Segurança
async function inicializar() {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return window.location.href = '../../Login/Login.html';

    const user = JSON.parse(sessionData);
    const horaAtual = new Date().getTime();

    // Verifica se a sessão expirou (1 hora = 3.600.000 ms)
    if (!user.login_at || (horaAtual - user.login_at > 3600000)) {
        localStorage.removeItem('user_session');
        window.location.href = '../../Login/Login.html';
        return;
    }

    document.getElementById('logged-user-display').textContent = `Olá, ${user.user_nome}!`;
    carregarDadosPerfil(user.user_nome);
}

// Carrega os dados do Supabase
async function carregarDadosPerfil(nome) {
    const { data: usuario, error } = await supabaseClient
        .from('cadastro_usuarios')
        .select('user_nome, email, telefone, codigo_acesso, salario_base')
        .eq('user_nome', nome)
        .maybeSingle();

    if (usuario) {
        document.getElementById('p-nome').value = usuario.user_nome;
        document.getElementById('p-email').value = usuario.email || "";
        document.getElementById('p-tel').value = usuario.telefone || "";
        document.getElementById('p-salario').value = usuario.salario_base || 0;
        document.getElementById('p-codigo').value = usuario.codigo_acesso;
    }

    // Busca contagem de indicados ativos
    const { count } = await supabaseClient
        .from('cadastro_usuarios')
        .select('*', { count: 'exact', head: true })
        .eq('quem_indicou', nome)
        .neq('user_nome', 'PENDENTE');

    document.getElementById('p-indicados').textContent = count || 0;
}

// Lógica de Ocultar/Mostrar Código
function toggleCodigo() {
    const input = document.getElementById('p-codigo');
    const eye = document.getElementById('toggle-eye');

    if (input.type === "password") {
        input.type = "text";
        eye.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = "password";
        eye.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

// Salva Email ou Salário
async function salvarCampo(tipo) {
    const nome = document.getElementById('p-nome').value;
    let updateData = {};

    if (tipo === 'salario') {
        updateData.salario_base = parseFloat(document.getElementById('p-salario').value);
    } else if (tipo === 'email') {
        updateData.email = document.getElementById('p-email').value;
    }

    const { error } = await supabaseClient
        .from('cadastro_usuarios')
        .update(updateData)
        .eq('user_nome', nome);

    if (!error) {
        showToast("Dados salvos com sucesso!");
    } else {
        showToast("Erro ao salvar no banco.", true);
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', inicializar);