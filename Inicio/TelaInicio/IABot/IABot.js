const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const user = JSON.parse(localStorage.getItem('user_session'));

const chatBox = document.getElementById('chat-box');
const btnMic = document.getElementById('btn-mic');
const recStatus = document.getElementById('rec-status');

let reconhecimento;
let gravando = false;
let transcricaoCompleta = "";

window.estadoIA = {
    pendenteGasto: null,
    sugestaoCategoria: null,
    tipoRelatorio: null
};

// --- MOTOR DE VOZ ---
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconhecimento = new SpeechRecognition();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.continuous = true;

    reconhecimento.onstart = () => { gravando = true; transcricaoCompleta = ""; btnMic.classList.add('recording'); recStatus.style.display = 'block'; };
    reconhecimento.onresult = (event) => { for (let i = event.resultIndex; i < event.results.length; ++i) { transcricaoCompleta += event.results[i][0].transcript; } };
    reconhecimento.onend = () => {
        btnMic.classList.remove('recording');
        recStatus.style.display = 'none';
        if (transcricaoCompleta.trim() !== "") { addMessage(transcricaoCompleta, 'user'); processarCerebroIA(transcricaoCompleta); }
        gravando = false;
    };
}

btnMic.onclick = () => { if (!gravando) reconhecimento.start(); else reconhecimento.stop(); };

function addMessage(texto, tipo) {
    const div = document.createElement('div');
    div.className = `msg ${tipo}`;
    div.innerHTML = texto;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// --- CÉREBRO DA IA ---
async function processarCerebroIA(input) {
    const fraseOriginal = input.trim();
    const frase = fraseOriginal.toLowerCase();
    const dataAtual = new Date();
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesAtual = meses[dataAtual.getMonth()];
    const anoAtual = dataAtual.getFullYear();

    // 1. CONFIRMAÇÃO (OK / SIM)
    const afirmou = ["sim", "é isso", "pode", "ok", "confirmar"].some(cmd => frase.includes(cmd));
    if (afirmou) {
        if (window.estadoIA.pendenteGasto) { await salvarGastoBanco(); return; }
        if (window.estadoIA.sugestaoCategoria) { await executarCalculoRelatorio(window.estadoIA.sugestaoCategoria, window.estadoIA.tipoRelatorio, mesAtual, anoAtual); return; }
    }

    // 2. LISTAR CATEGORIAS
    if (frase.includes("quais") && (frase.includes("categorias") || frase.includes("minhas"))) {
        const { data: categorias } = await supabaseClient.from('categorias').select('nome_categoria').eq('user_nome', user.user_nome);
        const lista = categorias.map(c => `• ${c.nome_categoria}`).join('<br>');
        addMessage(`📂 **Suas categorias:**<br>${lista}`, "bot");
        return;
    }

    // 3. IDENTIFICAÇÃO DE VALOR (LANÇAMENTO)
    const regexValor = /(\d+[,.]\d{2})|(\d+)/g;
    const matchesValores = frase.match(regexValor);

    if (matchesValores && !frase.includes("quanto")) {
        await processarLancamento(frase, fraseOriginal, matchesValores);
        return;
    }

    // 4. RELATÓRIOS
    if (frase.includes("quanto") || frase.includes("gasto") || frase.includes("limite")) {
        await processarRelatoriosFlexiveis(frase, mesAtual, anoAtual);
        return;
    }

    addMessage("Não entendi. Tente 'Gastei 100 categoria Conta' ou peça o 'Tutorial'.", "bot");
}

async function processarLancamento(frase, fraseOriginal, matchesValores) {
    let vStr = matchesValores.find(m => m.includes(',') || m.includes('.')) || matchesValores[0];
    const valorGasto = parseFloat(vStr.replace(',', '.'));
    const { data: categoriasBD } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome);

    let catFinal = null;

    // --- NOVA LÓGICA: SUPER PRIORIDADE PARA A PALAVRA "CATEGORIA" ---
    if (frase.includes("categoria")) {
        const parteDepoisCategoria = frase.split("categoria")[1].trim();
        catFinal = categoriasBD.find(c => parteDepoisCategoria.includes(c.nome_categoria.toLowerCase()));
    }

    // Se não usou a palavra "categoria", busca normal por assimilação
    if (!catFinal) {
        catFinal = categoriasBD.find(c => frase.includes(c.nome_categoria.toLowerCase()));
    }

    if (!catFinal) {
        addMessage("🤔 Categoria não identificada. Use: '... categoria [nome]'", "bot");
        return;
    }

    let desc = frase.includes("descrição") ? fraseOriginal.split(/descrição/i).pop().trim() : "";
    desc = desc.replace(/^[^a-zA-Z0-9áéíóúÁÉÍÓÚçÇ]+/, '').trim();

    window.estadoIA.pendenteGasto = {
        valor: valorGasto,
        categoria: catFinal.nome_categoria,
        id_categoria: catFinal.id,
        descricao: desc
    };

    addMessage(`
        <b>💰 Confirmar Lançamento?</b><br>
        <table style="width:100%; margin-top:10px; border-collapse: collapse;">
            <tr><td style="color:#666;">Valor:</td><td><b>R$ ${valorGasto.toFixed(2)}</b></td></tr>
            <tr><td style="color:#666;">Categoria:</td><td><b>${catFinal.nome_categoria}</b></td></tr>
            <tr><td style="color:#666;">Descrição:</td><td><i>${desc || "Não informada"}</i></td></tr>
        </table>
        <br>Diga <b>"OK"</b> para salvar!
    `, "bot");
}

// --- RESTANTE DAS FUNÇÕES (RELATÓRIOS E SALVAMENTO) ---
async function processarRelatoriosFlexiveis(frase, mes, ano) {
    const { data: categorias } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome);
    let catAlvo = categorias.find(c => frase.includes(c.nome_categoria.toLowerCase()));

    if (!catAlvo && (frase.includes("com") || frase.includes("em"))) {
        catAlvo = categorias.find(c => frase.includes(c.nome_categoria.toLowerCase().substring(0, 4)));
        if (catAlvo) {
            window.estadoIA.sugestaoCategoria = catAlvo;
            window.estadoIA.tipoRelatorio = frase.includes("posso gastar") ? "limite" : "gasto";
            addMessage(`🤔 Você quis dizer a categoria **${catAlvo.nome_categoria}**?`, "bot");
            return;
        }
    }
    await executarCalculoRelatorio(catAlvo, frase, mes, ano);
}

async function executarCalculoRelatorio(catAlvo, contexto, mes, ano) {
    const { data: gastos } = await supabaseClient.from('gastos').select('*, categorias(nome_categoria, limite_planejado)')
        .eq('user_nome', user.user_nome).eq('mes', mes).eq('ano', ano);

    if (catAlvo) {
        const totalCat = gastos.filter(g => g.categoria_id === catAlvo.id).reduce((acc, g) => acc + g.valor, 0);
        const limite = catAlvo.limite_planejado || 0;
        if (contexto.includes("posso gastar") || window.estadoIA.tipoRelatorio === "limite") {
            const sobra = limite - totalCat;
            addMessage(`💰 **${catAlvo.nome_categoria}**:<br>Já gastou: R$ ${totalCat.toFixed(2)}<br>Ainda pode: **R$ ${sobra.toFixed(2)}**`, "bot");
        } else {
            addMessage(`📊 Gastos em **${catAlvo.nome_categoria}**: R$ ${totalCat.toFixed(2)}.`, "bot");
        }
    } else {
        const totalGeral = gastos.reduce((acc, g) => acc + g.valor, 0);
        addMessage(`📉 Gasto total em ${mes}: **R$ ${totalGeral.toFixed(2)}**.`, "bot");
    }
    window.estadoIA.sugestaoCategoria = null;
    window.estadoIA.tipoRelatorio = null;
}

async function salvarGastoBanco() {
    const g = window.estadoIA.pendenteGasto;
    const d = new Date();
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    await supabaseClient.from('gastos').insert([{
        categoria_id: g.id_categoria, user_nome: user.user_nome, valor: g.valor,
        descricao: g.descricao, dia: d.getDate(), mes: meses[d.getMonth()], ano: d.getFullYear()
    }]);

    addMessage("🚀 **Salvo com sucesso no seu Dash!**", "bot");
    window.estadoIA.pendenteGasto = null;
}