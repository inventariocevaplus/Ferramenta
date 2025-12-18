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
    tipoRelatorio: null,
    aguardandoSalario: false
};

// --- INICIALIZAÇÃO ---
function inicializarChat() {
    const nome = user ? user.user_nome.split(' ')[0].toUpperCase() : "USUÁRIO";
    addMessage(`Olá **${nome}**! Sou a Easy IA. Como posso ajudar suas finanças hoje?`, 'bot');
}

// --- RECONHECIMENTO DE VOZ ---
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    reconhecimento = new SpeechRecognition();
    reconhecimento.lang = 'pt-BR';
    reconhecimento.continuous = true;
    reconhecimento.interimResults = false;

    reconhecimento.onstart = () => {
        gravando = true;
        transcricaoCompleta = "";
        btnMic.classList.add('recording');
        recStatus.style.display = 'block';
    };

    reconhecimento.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcricaoCompleta += event.results[i][0].transcript;
        }
    };

    reconhecimento.onend = () => {
        btnMic.classList.remove('recording');
        recStatus.style.display = 'none';
        if (transcricaoCompleta.trim() !== "") {
            addMessage(transcricaoCompleta, 'user');
            processarCerebroIA(transcricaoCompleta);
        }
        gravando = false;
    };

    reconhecimento.onerror = (event) => {
        console.error("Erro no microfone:", event.error);
        gravando = false;
        btnMic.classList.remove('recording');
    };
}

btnMic.onclick = () => {
    if (!gravando) {
        try { reconhecimento.start(); } catch(e) { reconhecimento.stop(); }
    } else {
        reconhecimento.stop();
    }
};

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

    // 1. PRIORIDADE: TUTORIAL / AJUDA
    if (frase === "tutorial" || frase.includes("ajuda") || frase === "tutorial.") {
        addMessage(`📖 **Comandos Sugeridos:**<br>💰 "Gastei 50 em Comida"<br>💵 "Ganhei 2000 de salário"<br>📊 "Quanto eu gastei esse mês?"<br>📂 "Quais são minhas categorias?"`, "bot");
        return;
    }

    // 2. PRIORIDADE: LISTAR CATEGORIAS
    if (frase.includes("minhas categoria") || frase.includes("quais são as categoria")) {
        const { data: categorias } = await supabaseClient.from('categorias').select('nome_categoria').eq('user_nome', user.user_nome);
        const lista = categorias?.filter(c => c.nome_categoria !== 'Salario').map(c => `• ${c.nome_categoria}`).join('<br>');
        addMessage(`📂 **Suas categorias atuais:**<br>${lista || "Nenhuma categoria encontrada."}`, "bot");
        return;
    }

    // 3. ESTADO: AGUARDANDO VALOR DO SALÁRIO
    if (window.estadoIA.aguardandoSalario) {
        const regexValor = /(\d+[,.]\d{2})|(\d+)/g;
        const matches = frase.match(regexValor);
        if (matches) {
            let vStr = matches.find(m => m.includes(',') || m.includes('.')) || matches[0];
            await executarSalvarSalario(parseFloat(vStr.replace(',', '.')), mesAtual, anoAtual);
            window.estadoIA.aguardandoSalario = false; // Limpa o estado
            return;
        }
    }

    // 4. CONFIRMAÇÃO DE GASTO (OK / SIM)
    const afirmou = ["sim", "é isso", "pode", "ok", "confirmar"].some(cmd => frase === cmd || frase === cmd + ".");
    if (afirmou && window.estadoIA.pendenteGasto) {
        await salvarGastoBanco(mesAtual, anoAtual);
        return;
    }

    // 5. LÓGICA DE ATUALIZAR SALÁRIO
    if (frase.includes("salário") || frase.includes("ganhei") || frase.includes("recebi") || frase.includes("atualizar salário")) {
        const regexValor = /(\d+[,.]\d{2})|(\d+)/g;
        const matches = frase.match(regexValor);
        if (matches) {
            let vStr = matches.find(m => m.includes(',') || m.includes('.')) || matches[0];
            await executarSalvarSalario(parseFloat(vStr.replace(',', '.')), mesAtual, anoAtual);
        } else {
            window.estadoIA.aguardandoSalario = true;
            addMessage("Com certeza! Qual o valor do salário ou ganho que deseja registrar?", "bot");
        }
        return;
    }

    // 6. RELATÓRIOS (QUANTO GASTEI)
    if (frase.includes("quanto") || frase.includes("gasto esse mês") || frase.includes("gastei esse mês")) {
        await processarRelatoriosFlexiveis(frase, mesAtual, anoAtual);
        return;
    }

    // 7. LANÇAMENTO DE GASTOS (IDENTIFICA VALOR)
    const regexValor = /(\d+[,.]\d{2})|(\d+)/g;
    const matchesValores = frase.match(regexValor);
    if (matchesValores) {
        await processarLancamento(frase, fraseOriginal, matchesValores);
        return;
    }

    addMessage("Não entendi. Tente: 'Gastei 15 em Jogos descrição Skins de CS' ou peça o 'Tutorial'.", "bot");
}

async function processarLancamento(frase, fraseOriginal, matchesValores) {
    let vStr = matchesValores.find(m => m.includes(',') || m.includes('.')) || matchesValores[0];
    const valorGasto = parseFloat(vStr.replace(',', '.'));
    const { data: categoriasBD } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome);
    let catAlvo = categoriasBD?.find(c => frase.includes(c.nome_categoria.toLowerCase()) && c.nome_categoria !== 'Salario');

    if (!catAlvo) {
        addMessage("🤔 Não entendi a categoria. Tente: 'Gastei 10 em [Nome da Categoria]'", "bot");
        return;
    }

    let descricaoFinal = "Lançamento via IA";
    const regexDesc = /(?:descrição|descricao|obs|detalhe)\.?\s*(.*)/i;
    const matchDesc = fraseOriginal.match(regexDesc);
    if (matchDesc && matchDesc[1]) {
        descricaoFinal = matchDesc[1].trim();
    }

    window.estadoIA.pendenteGasto = {
        valor: valorGasto,
        categoria: catAlvo.nome_categoria,
        id_categoria: catAlvo.id,
        descricao: descricaoFinal
    };

    addMessage(`
        💰 **Confirmar Gasto?**<br>
        -------------------------<br>
        💵 **Valor:** R$ ${valorGasto.toFixed(2)}<br>
        📂 **Categoria:** ${catAlvo.nome_categoria}<br>
        📝 **Descrição:** ${descricaoFinal}<br>
        -------------------------<br>
        Diga **"OK"** para salvar!
    `, "bot");
}

async function salvarGastoBanco(mes, ano) {
    const g = window.estadoIA.pendenteGasto;
    try {
        const { error } = await supabaseClient.from('gastos').insert([{
            categoria_id: g.id_categoria,
            user_nome: user.user_nome,
            valor: g.valor,
            descricao: g.descricao,
            dia: new Date().getDate(),
            mes: mes,
            ano: parseInt(ano)
        }]);
        if(error) throw error;
        addMessage("🚀 **Salvo com sucesso!**", "bot");
    } catch(e) {
        addMessage("❌ Erro ao salvar gasto.", "bot");
    }
    window.estadoIA.pendenteGasto = null;
}

async function executarSalvarSalario(valor, mes, ano) {
    try {
        let { data: catSal } = await supabaseClient.from('categorias').select('id').eq('user_nome', user.user_nome).eq('nome_categoria', 'Salario').maybeSingle();
        if (!catSal) {
            const { data: novaCat } = await supabaseClient.from('categorias').insert([{
                user_nome: user.user_nome, nome_categoria: 'Salario', icone: 'fa-money-bill-wave', limite_planejado: 0, gasto_atual: 0, mes: mes, ano: parseInt(ano)
            }]).select().single();
            catSal = novaCat;
        }
        await supabaseClient.from('gastos').delete().eq('categoria_id', catSal.id).eq('mes', mes).eq('ano', ano);
        await supabaseClient.from('gastos').insert([{
            categoria_id: catSal.id, user_nome: user.user_nome, valor: valor, descricao: 'Entrada de Salário', dia: new Date().getDate(), mes: mes, ano: parseInt(ano)
        }]);
        addMessage(`✅ **Salário de R$ ${valor.toFixed(2)} registrado!**`, "bot");
    } catch (err) { addMessage("❌ Erro ao salvar salário.", "bot"); }
}

async function processarRelatoriosFlexiveis(frase, mes, ano) {
    // Busca os gastos e o limite planejado das categorias
    const { data: gastos, error } = await supabaseClient
        .from('gastos')
        .select('valor, categorias(nome_categoria)')
        .eq('user_nome', user.user_nome)
        .eq('mes', mes)
        .eq('ano', ano);

    if (error) {
        addMessage("❌ Erro ao buscar gastos.", "bot");
        return;
    }

    // Soma apenas o que NÃO for salário
    const totalGeral = gastos?.filter(g => g.categorias && g.categorias.nome_categoria !== 'Salario')
                             .reduce((acc, g) => acc + g.valor, 0) || 0;

    addMessage(`📊 Seu gasto total em despesas para **${mes}** é **R$ ${totalGeral.toFixed(2)}**.`, "bot");
}

inicializarChat();