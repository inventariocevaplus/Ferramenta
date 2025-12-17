const supabaseClient = window.supabase.createClient(
    'https://wzvjgfubiodrjlycuiqa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ'
);

let podeGerar = true;

async function inicializar() {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) {
        window.location.href = '../../Login/Login.html';
        return;
    }

    const user = JSON.parse(sessionData);

    // --- AJUSTE: TRAVA DE SEGURANÇA DE 1 HORA ---
    const horaAtual = new Date().getTime();
    const umaHora = 60 * 60 * 1000;

    if (!user.login_at || (horaAtual - user.login_at > umaHora)) {
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem('user_session');
        window.location.href = '../../Login/Login.html';
        return;
    }
    // --------------------------------------------

    const display = document.getElementById('logged-user-display');
    if (display) display.textContent = `Olá, ${user.user_nome}!`;

    carregarTabela(user.user_nome);
}

async function carregarTabela(userName) {
    const { data, error } = await supabaseClient
        .from('cadastro_usuarios')
        .select('user_nome')
        .eq('quem_indicou', userName)
        .neq('user_nome', 'PENDENTE');

    const corpo = document.getElementById('tabela-corpo');
    if (!corpo) return;

    corpo.innerHTML = "";

    if (data && data.length > 0) {
        data.forEach(indicado => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${indicado.user_nome}</td>
                <td><span class="status-badge">Ativo</span></td>
            `;
            corpo.appendChild(tr);
        });
    } else {
        corpo.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma indicação ativa.</td></tr>';
    }
}

async function gerarNovoCodigo() {
    if (!podeGerar) return;

    const sessionData = localStorage.getItem('user_session');
    const user = JSON.parse(sessionData);
    const codigo = Math.floor(1000 + Math.random() * 9000).toString();

    const { error } = await supabaseClient
        .from('cadastro_usuarios')
        .insert([{ user_nome: 'PENDENTE', codigo_acesso: codigo, quem_indicou: user.user_nome }]);

    if (!error) {
        document.getElementById('display-codigo').textContent = codigo;
        bloquearBotao();
    } else {
        alert("Erro ao conectar com o servidor.");
    }
}

function bloquearBotao() {
    podeGerar = false;
    const btn = document.getElementById('btn-gerar');
    const box = document.getElementById('timer-box');
    const seg = document.getElementById('segundos');
    let tempo = 60;

    if (btn) btn.classList.add('btn-disabled');
    if (box) box.classList.remove('timer-hidden');

    const interval = setInterval(() => {
        tempo--;
        if (seg) seg.textContent = tempo;
        if (tempo <= 0) {
            clearInterval(interval);
            podeGerar = true;
            if (btn) btn.classList.remove('btn-disabled');
            if (box) box.classList.add('timer-hidden');
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', inicializar);