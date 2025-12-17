const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';

if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

let iconeSelecionado = "";

// --- INICIALIZAÇÃO: Define Mês e Ano Atuais ---
document.addEventListener('DOMContentLoaded', () => {
    const dataAtual = new Date();
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const comboMes = document.getElementById('cat-mes');
    const inputAno = document.getElementById('cat-ano');

    if(comboMes) comboMes.value = meses[dataAtual.getMonth()];
    if(inputAno) inputAno.value = dataAtual.getFullYear();
});

// Função para exibir a mensagem customizada (Toast)
function mostrarMensagem(texto, cor = "#00C853") {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        document.body.appendChild(toast);
    }

    toast.textContent = texto;
    toast.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        background-color: ${cor}; color: white; padding: 12px 25px;
        border-radius: 10px; font-weight: bold; z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: opacity 0.3s;
        font-family: sans-serif; font-size: 14px; opacity: 1;
    `;

    setTimeout(() => { toast.style.opacity = "0"; }, 1000);
    setTimeout(() => { toast.remove(); }, 1300);
}

// Seleção de ícones com troca de nome DINÂMICA
document.querySelectorAll('.icon-opt').forEach(opt => {
    opt.addEventListener('click', () => {
        document.querySelectorAll('.icon-opt').forEach(i => i.classList.remove('active'));
        opt.classList.add('active');
        iconeSelecionado = opt.getAttribute('data-icon');

        const inputNome = document.getElementById('cat-nome');
        if(inputNome) {
            inputNome.value = opt.querySelector('span').textContent;
        }
    });
});

async function salvarCategoria() {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) { window.location.href = '../../Login/Login.html'; return; }

    const session = JSON.parse(sessionData);
    const mes = document.getElementById('cat-mes').value;
    const ano = document.getElementById('cat-ano').value;
    const nome = document.getElementById('cat-nome').value.trim();
    const limite = document.getElementById('cat-limite').value;

    if(!iconeSelecionado || !nome || !limite) {
        mostrarMensagem("Preencha todos os campos!", "#D50000");
        return;
    }

    try {
        // 1. Verifica se já possui a categoria criada para este usuário
        const { data: existente, error: erroBusca } = await window.supabaseClient
            .from('categorias')
            .select('id')
            .eq('user_nome', session.user_nome)
            .eq('nome_categoria', nome)
            .maybeSingle();

        if (existente) {
            mostrarMensagem("Categoria já cadastrada!", "#FF9800");
            return;
        }

        // 2. Se não existe, cria a nova categoria
        const { error } = await window.supabaseClient
            .from('categorias')
            .insert([{
                user_nome: session.user_nome,
                mes: mes,
                ano: parseInt(ano),
                icone: iconeSelecionado,
                nome_categoria: nome,
                limite_planejado: parseFloat(limite),
                gasto_atual: 0
            }]);

        if(!error) {
            mostrarMensagem("Categoria salva com sucesso!");
            setTimeout(() => {
                window.location.href = '../TelaInicio.html';
            }, 1200);
        } else {
            mostrarMensagem("Erro ao salvar!", "#D50000");
        }
    } catch (err) {
        mostrarMensagem("Erro de conexão", "#D50000");
    }
}