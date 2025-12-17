const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const dataAtual = new Date();

async function inicializar() {
    popularFiltros();
    await buscarGastos();

    document.getElementById('filtro-mes').addEventListener('change', buscarGastos);
    document.getElementById('filtro-ano').addEventListener('change', buscarGastos);
}

function popularFiltros() {
    const selectMes = document.getElementById('filtro-mes');
    const selectAno = document.getElementById('filtro-ano');

    meses.forEach((mes, index) => {
        let opt = document.createElement('option');
        opt.value = mes;
        opt.innerText = mes;
        if(index === dataAtual.getMonth()) opt.selected = true;
        selectMes.appendChild(opt);
    });

    for(let i = 2025; i <= 2040; i++) {
        let opt = document.createElement('option');
        opt.value = i;
        opt.innerText = i;
        if(i === dataAtual.getFullYear()) opt.selected = true;
        selectAno.appendChild(opt);
    }
}

async function buscarGastos() {
    const sessionData = localStorage.getItem('user_session');
    if (!sessionData) return;

    const user = JSON.parse(sessionData);
    const mes = document.getElementById('filtro-mes').value;
    const ano = parseInt(document.getElementById('filtro-ano').value);
    const lista = document.getElementById('lista-gastos');
    const totalDisplay = document.getElementById('total-extrato');
    const msgVazio = document.getElementById('msg-vazio');
    const periodoTexto = document.getElementById('periodo-texto');

    periodoTexto.innerText = `${mes} de ${ano}`;
    lista.innerHTML = "";
    let somaTotal = 0;

    try {
        // 1. Dicionário de Categorias
        const { data: categorias } = await supabaseClient
            .from('categorias')
            .select('id, nome_categoria')
            .eq('user_nome', user.user_nome);

        const catMap = {};
        if (categorias) {
            categorias.forEach(c => catMap[c.id] = c.nome_categoria);
        }

        // 2. Busca Gastos usando a coluna user_nome (certifique-se de ter rodado o SQL ALTER TABLE)
        const { data: gastos, error } = await supabaseClient
            .from('gastos')
            .select('valor, dia, descricao, categoria_id')
            .eq('user_nome', user.user_nome)
            .eq('mes', mes)
            .eq('ano', ano)
            .order('dia', { ascending: false });

        if (error) throw error;

        if (gastos && gastos.length > 0) {
            msgVazio.classList.add('hidden');
            gastos.forEach(g => {
                somaTotal += g.valor;
                const nomeCat = catMap[g.categoria_id] || 'Geral';
                lista.innerHTML += `
                    <tr>
                        <td><strong>${nomeCat}</strong></td>
                        <td>${g.dia}</td>
                        <td style="color:#636e72">${g.descricao || '-'}</td>
                        <td>R$ ${g.valor.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                    </tr>`;
            });
        } else {
            msgVazio.classList.remove('hidden');
        }

        totalDisplay.innerText = `R$ ${somaTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;

    } catch (err) {
        console.error("Erro:", err);
        totalDisplay.innerText = "R$ 0,00";
    }
}

inicializar();