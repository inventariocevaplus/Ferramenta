const supabaseClient = window.supabase.createClient(
    'https://wzvjgfubiodrjlycuiqa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ'
);

const urlParams = new URLSearchParams(window.location.search);
const catId = urlParams.get('id');
let modoEdicaoLimite = false;
let ehSalario = false; // Variável global para controle

document.addEventListener('DOMContentLoaded', async () => {
    popularAnos();
    const d = new Date();
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById('det-mes').value = meses[d.getMonth()];
    document.getElementById('det-ano').value = d.getFullYear();

    await carregarDados();

    document.getElementById('btn-salvar-gasto').onclick = salvarGasto;
    document.getElementById('det-mes').onchange = carregarDados;
    document.getElementById('det-ano').onchange = carregarDados;
    document.getElementById('btn-edit-limite').onclick = toggleEdicaoLimite;

    const modal = document.getElementById('modal-confirm');
    document.getElementById('btn-excluir-cat').onclick = () => modal.style.display = 'flex';
    document.getElementById('confirm-nao').onclick = () => modal.style.display = 'none';
    document.getElementById('confirm-sim').onclick = deletarTudo;
});

function popularAnos() {
    const sel = document.getElementById('det-ano');
    for(let a=2025; a<=2040; a++) {
        sel.options[sel.options.length] = new Option(a, a);
    }
}

async function carregarDados() {
    const mes = document.getElementById('det-mes').value;
    const ano = parseInt(document.getElementById('det-ano').value);

    const { data: cat } = await supabaseClient.from('categorias').select('*').eq('id', catId).single();

    if(cat) {
        ehSalario = cat.nome_categoria.toLowerCase().includes("salário") || cat.nome_categoria.toLowerCase().includes("salario");
        document.getElementById('titulo-categoria').innerText = cat.nome_categoria;

        // Ajusta labels se for salário
        document.getElementById('label-limite').innerText = ehSalario ? "RENDA PREVISTA" : "LIMITE";
        document.getElementById('label-gasto').innerText = ehSalario ? "VALOR RECEBIDO" : "GASTO TOTAL";

        const elLimite = document.getElementById('kpi-limite');
        if (elLimite && !modoEdicaoLimite) {
            elLimite.innerText = `R$ ${cat.limite_planejado.toFixed(2)}`;
        }
    }

    const { data: gastos } = await supabaseClient.from('gastos')
        .select('*').eq('categoria_id', catId).eq('mes', mes).eq('ano', ano).order('dia', {ascending: false});

    const lista = document.getElementById('lista-gastos');
    lista.innerHTML = "";
    let soma = 0;

    gastos?.forEach(g => {
        soma += g.valor;
        lista.innerHTML += `
            <tr>
                <td>${g.dia}</td>
                <td style="text-align:left">${g.descricao}</td>
                <td>R$ ${g.valor.toFixed(2)}</td>
                <td><button onclick="deletarGasto(${g.id})" class="btn-del-item"><i class="fas fa-times"></i></button></td>
            </tr>`;
    });

    const kpiGasto = document.getElementById('kpi-gasto');
    kpiGasto.innerText = `R$ ${soma.toFixed(2)}`;

    // Lógica de cores: Verde para salário sempre, ou lógica de limite para despesas
    if(cat) {
        if (ehSalario) {
            kpiGasto.style.color = "#00C853"; // Sempre verde para salário
        } else {
            kpiGasto.style.color = soma > cat.limite_planejado ? "#D50000" : "#00C853";
        }
    }
}

async function toggleEdicaoLimite() {
    const container = document.getElementById('container-limite-val');
    const btnIcon = document.querySelector('#btn-edit-limite i');

    if (!modoEdicaoLimite) {
        const elLimite = document.getElementById('kpi-limite');
        const valorAtual = elLimite.innerText.replace('R$ ', '').replace(',', '.');

        modoEdicaoLimite = true;
        container.innerHTML = `<input type="number" id="input-edit-limite" value="${valorAtual}" class="input-edit-inline">`;
        btnIcon.className = "fas fa-check";
    } else {
        const input = document.getElementById('input-edit-limite');
        const novoValor = parseFloat(input.value);

        if (isNaN(novoValor)) return;

        await supabaseClient.from('categorias').update({ limite_planejado: novoValor }).eq('id', catId);

        container.innerHTML = `<h3 id="kpi-limite">R$ ${novoValor.toFixed(2)}</h3>`;

        modoEdicaoLimite = false;
        btnIcon.className = "fas fa-cog";
        await carregarDados();
    }
}

async function salvarGasto() {
    const session = JSON.parse(localStorage.getItem('user_session'));
    const nomeUsuario = session ? session.user_nome : "Desconhecido";

    const v = document.getElementById('exp-valor').value;
    const dInput = document.getElementById('exp-dia').value;
    const desc = document.getElementById('exp-desc').value || (ehSalario ? "Recebimento" : "-");

    if(!v) return;

    const diaFinal = dInput ? parseInt(dInput) : new Date().getDate();

    await supabaseClient.from('gastos').insert([{
        categoria_id: catId,
        user_nome: nomeUsuario,
        valor: parseFloat(v),
        descricao: desc,
        dia: diaFinal,
        mes: document.getElementById('det-mes').value,
        ano: parseInt(document.getElementById('det-ano').value)
    }]);

    document.getElementById('exp-valor').value = "";
    document.getElementById('exp-dia').value = "";
    document.getElementById('exp-desc').value = "";
    await carregarDados();
}

async function deletarGasto(id) {
    await supabaseClient.from('gastos').delete().eq('id', id);
    await carregarDados();
}

async function deletarTudo() {
    await supabaseClient.from('categorias').delete().eq('id', catId);
    window.location.href = '../TelaInicio.html';
}