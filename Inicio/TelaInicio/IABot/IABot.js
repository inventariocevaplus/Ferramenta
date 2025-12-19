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
    pendenteNovaCategoria: null, // Para criação de nova categoria
    aguardandoLimite: false,
    aguardandoSalario: false
};

// --- INICIALIZAÇÃO ---
function inicializarChat() {
    const nome = user ? user.user_nome.split(' ')[0].toUpperCase() : "USUÁRIO";
    addMessage(`Olá **${nome}**! Sou a Easy IA. Como posso ajudar suas finanças hoje?`, 'bot');
}

// --- FUNÇÃO AUXILIAR: LIMPEZA DE VALORES DE ÁUDIO ---
function extrairValorNumerico(texto) {
    let t = texto.toLowerCase()
        .replace(/ reais/g, '')
        .replace(/ real/g, '')
        .replace(/ brl/g, '')
        .replace(/ centavos/g, '')
        .replace(/ e (\d{1,2})\b/g, '.$1') // Transforma "10 e 50" em "10.50"
        .replace(/, /g, '.')
        .replace(/,/g, '.');

    const matches = t.match(/\d+(\.\d+)?/g);
    return matches ? matches[0] : null;
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
    const vStr = extrairValorNumerico(frase);

    // 1. ESTADO: AGUARDANDO LIMITE PARA NOVA CATEGORIA
    if (window.estadoIA.aguardandoLimite) {
        if (vStr) {
            const limiteVal = parseFloat(vStr);
            await criarCategoriaESalvarGasto(limiteVal, mesAtual, anoAtual);
            return;
        }
    }

    // 2. PRIORIDADE: TUTORIAL COMPLETO
    if (frase === "tutorial" || frase.includes("ajuda") || frase === "tutorial.") {
        addMessage(`
            📖 **Tudo o que eu posso fazer:**<br><br>
            💰 **Lançar Gastos:**<br>
            <i>"Gastei 50 em Compras"</i><br><br>
            💵 **Gerenciar Salário:**<br>
            <i>"Recebi 3000 de salário"</i> ou <i>"Atualizar salário"</i><br><br>
            📊 **Saldo Restante:**<br>
            <i>"Quanto ainda posso gastar em Comida?"</i><br><br>
            📋 **Ver Gastos Detalhados:**<br>
            <i>"Mostre o extrato de Mercado"</i><br><br>
            ⚠️ **Alertas de Limite:**<br>
            <i>"O que passou do limite?"</i><br><br>
            📂 **Listar Categorias:**<br>
            <i>"Quais são minhas categorias?"</i><br><br>
            📉 **Gasto Total Mensal:**<br>
            <i>"Quanto eu gastei no total este mês?"</i>
        `, "bot");
        return;
    }

    // 3. RELATÓRIO: CATEGORIA QUE ULTRAPASSOU O LIMITE
    if (frase.includes("passou do limite") || frase.includes("ultrapassou") || frase.includes("limite excedido") || frase.includes("extrapolou")) {
        await relatorioLimitesExcedidos(mesAtual, anoAtual);
        return;
    }

    // 4. RELATÓRIO: EXTRATO DE CATEGORIA (TABELA)
    if (frase.includes("mostre") || frase.includes("fale os gastos") || frase.includes("extrato") || frase.includes("ver meus gastos")) {
        await mostrarExtratoCategoria(frase, mesAtual, anoAtual);
        return;
    }

    // 5. CONSULTA: QUANTO POSSO GASTAR (SALDO DISPONÍVEL)
    if (frase.includes("quanto posso gastar") || frase.includes("posso gastar em") || frase.includes("qual o saldo")) {
        await consultarSaldoCategoria(frase, mesAtual, anoAtual);
        return;
    }

    // 6. PRIORIDADE: LISTAR CATEGORIAS
    if (frase.includes("minhas categoria") || frase.includes("quais são as categoria")) {
        const { data: categorias } = await supabaseClient.from('categorias').select('nome_categoria').eq('user_nome', user.user_nome);
        const lista = categorias?.filter(c => c.nome_categoria !== 'Salario').map(c => `• ${c.nome_categoria}`).join('<br>');
        addMessage(`📂 **Suas categorias atuais:**<br>${lista || "Nenhuma categoria encontrada."}`, "bot");
        return;
    }

    // 7. ESTADO: AGUARDANDO VALOR DO SALÁRIO
    if (window.estadoIA.aguardandoSalario) {
        if (vStr) {
            await executarSalvarSalario(parseFloat(vStr), mesAtual, anoAtual);
            window.estadoIA.aguardandoSalario = false;
            return;
        }
    }

    // 8. CONFIRMAÇÃO DE GASTO (OK / SIM)
    const afirmou = ["sim", "é isso", "pode", "ok", "confirmar", "pode salvar"].some(cmd => frase.includes(cmd));
    if (afirmou && window.estadoIA.pendenteGasto) {
        await salvarGastoBanco(mesAtual, anoAtual);
        return;
    }

    // 9. LÓGICA DE ATUALIZAR SALÁRIO
    if (frase.includes("salário") || frase.includes("ganhei") || frase.includes("recebi") || frase.includes("atualizar salário")) {
        if (vStr) {
            await executarSalvarSalario(parseFloat(vStr), mesAtual, anoAtual);
        } else {
            window.estadoIA.aguardandoSalario = true;
            addMessage("Com certeza! Qual o valor do salário ou ganho que deseja registrar?", "bot");
        }
        return;
    }

    // 10. RELATÓRIOS GERAIS (Quanto gastei no total)
    if (frase.includes("quanto") && (frase.includes("gastei") || frase.includes("gasto")) && !frase.includes("posso gastar")) {
        await processarRelatoriosFlexiveis(frase, mesAtual, anoAtual);
        return;
    }

    // 11. LANÇAMENTO DE GASTOS (IDENTIFICA VALOR)
    if (vStr) {
        await processarLancamento(frase, fraseOriginal, vStr);
        return;
    }

    // 12. INDAGAÇÃO PROATIVA (VOCÊ QUERIA SABER...?)
    // Tenta encontrar se o usuário mencionou uma categoria existente
    const { data: categoriasBD } = await supabaseClient.from('categorias').select('nome_categoria').eq('user_nome', user.user_nome);
    const catSugerida = categoriasBD?.find(c => frase.includes(c.nome_categoria.toLowerCase()));

    if (catSugerida) {
        addMessage(`🧐 Vi que você mencionou **${catSugerida.nome_categoria}**, mas não entendi o comando. <br><br> **Você não quis dizer:** <br>• *"Quanto gastei em ${catSugerida.nome_categoria}?"* <br>• *"Quanto posso gastar em ${catSugerida.nome_categoria}?"*`, "bot");
        return;
    }

    if (frase.includes("quanto")) {
        addMessage(`🤔 Você queria saber o **total que você já gastou** ou o **saldo restante** de alguma categoria?`, "bot");
        return;
    }

    // Fallback Final
    addMessage(`🤔 Não entendi muito bem. Você não quis dizer:<br><br>
    • **Lançar um gasto?** <br><i>"Gastei 30 em Lazer"</i><br><br>
    • **Ver seu resumo?** <br><i>"Quanto eu gastei no total?"</i><br><br>
    Peça o **"Tutorial"** para ver todos os comandos.`, "bot");
}

async function processarLancamento(frase, fraseOriginal, vStr) {
    const valorGasto = parseFloat(vStr);
    const { data: categoriasBD } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome);

    let nomeCatDetectado = null;
    let catAlvo = null;

    // Lógica inteligente de busca de categoria (Singular/Plural)
    for (const c of categoriasBD) {
        const nomeCatDB = c.nome_categoria.toLowerCase();
        if (frase.includes(nomeCatDB) || (nomeCatDB.length > 3 && frase.includes(nomeCatDB.substring(0, nomeCatDB.length - 1)))) {
            if (nomeCatDB !== 'salario') {
                nomeCatDetectado = c.nome_categoria;
                catAlvo = c;
                break;
            }
        }
    }

    let descricaoFinal = "Lançamento via IA";
    const regexDesc = /(?:descrição|descricao|obs|detalhe)\.?\s*(.*)/i;
    const matchDesc = fraseOriginal.match(regexDesc);
    if (matchDesc && matchDesc[1]) descricaoFinal = matchDesc[1].trim();

    if (!nomeCatDetectado) {
        const tentativaCat = frase.match(/(?:em|na|no|categoria)\s+([\wáéíóúãõç]+)/i);
        const novaCatNome = tentativaCat ? tentativaCat[1] : "Diversos";

        window.estadoIA.pendenteNovaCategoria = {
            nome: novaCatNome.charAt(0).toUpperCase() + novaCatNome.slice(1),
            valor: valorGasto,
            descricao: descricaoFinal
        };
        window.estadoIA.aguardandoLimite = true;
        addMessage(`⚠️ Categoria **"${novaCatNome}"** não encontrada. Deseja criar uma nova categoria? Se sim, **qual o valor de limite mensal** para ela?`, "bot");
        return;
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

async function criarCategoriaESalvarGasto(limite, mes, ano) {
    const dados = window.estadoIA.pendenteNovaCategoria;
    try {
        const { data: novaCat, error: errCat } = await supabaseClient.from('categorias').insert([{
            user_nome: user.user_nome,
            nome_categoria: dados.nome,
            icone: 'fa-tags',
            limite_planejado: limite,
            gasto_atual: 0,
            mes: mes,
            ano: parseInt(ano)
        }]).select().single();

        if (errCat) throw errCat;

        await supabaseClient.from('gastos').insert([{
            categoria_id: novaCat.id,
            user_nome: user.user_nome,
            valor: dados.valor,
            descricao: dados.descricao,
            dia: new Date().getDate(),
            mes: mes,
            ano: parseInt(ano)
        }]);

        addMessage(`✅ Categoria **${dados.nome}** criada com limite de R$ ${limite.toFixed(2)} e gasto de R$ ${dados.valor.toFixed(2)} salvo com sucesso!`, "bot");
    } catch (e) {
        addMessage("❌ Erro ao criar categoria.", "bot");
    }
    window.estadoIA.pendenteNovaCategoria = null;
    window.estadoIA.aguardandoLimite = false;
}

async function consultarSaldoCategoria(frase, mes, ano) {
    const { data: categorias } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome).eq('mes', mes);

    const cat = categorias.find(c => {
        const n = c.nome_categoria.toLowerCase();
        return frase.includes(n) || (n.length > 3 && frase.includes(n.substring(0, n.length - 1)));
    });

    if (!cat) {
        addMessage("🤔 Não encontrei essa categoria para consultar o saldo.", "bot");
        return;
    }

    const { data: gastos } = await supabaseClient.from('gastos').select('valor').eq('categoria_id', cat.id).eq('mes', mes);
    const totalGasto = gastos?.reduce((acc, g) => acc + g.valor, 0) || 0;
    const saldo = cat.limite_planejado - totalGasto;

    addMessage(`📂 **Categoria: ${cat.nome_categoria}**<br>
    📉 Já gastou: **R$ ${totalGasto.toFixed(2)}**<br>
    🎯 Limite: **R$ ${cat.limite_planejado.toFixed(2)}**<br>
    💰 Você ainda pode gastar: **R$ ${saldo.toFixed(2)}**`, "bot");
}

async function mostrarExtratoCategoria(frase, mes, ano) {
    const { data: categorias } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome).eq('mes', mes);

    const cat = categorias.find(c => {
        const n = c.nome_categoria.toLowerCase();
        return frase.includes(n) || (n.length > 3 && frase.includes(n.substring(0, n.length - 1)));
    });

    if (!cat) {
        addMessage("🤔 Qual categoria você deseja ver os gastos?", "bot");
        return;
    }

    const { data: gastos } = await supabaseClient.from('gastos').select('*').eq('categoria_id', cat.id).eq('mes', mes).order('dia', { ascending: true });

    if (!gastos || gastos.length === 0) {
        addMessage(`📅 Não há gastos registrados em **${cat.nome_categoria}** este mês.`, "bot");
        return;
    }

    let tabela = `<table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:10px;">
        <tr style="background:#f4f4f4;">
            <th style="padding:5px; border:1px solid #ddd;">Dia</th>
            <th style="padding:5px; border:1px solid #ddd;">Descrição</th>
            <th style="padding:5px; border:1px solid #ddd;">Valor</th>
        </tr>`;

    gastos.forEach(g => {
        tabela += `<tr>
            <td style="padding:5px; border:1px solid #ddd; text-align:center;">${g.dia}</td>
            <td style="padding:5px; border:1px solid #ddd;">${g.descricao}</td>
            <td style="padding:5px; border:1px solid #ddd; color:red;">R$ ${g.valor.toFixed(2)}</td>
        </tr>`;
    });
    tabela += `</table>`;

    addMessage(`📋 **Extrato: ${cat.nome_categoria}**<br>${tabela}`, "bot");
}

async function relatorioLimitesExcedidos(mes, ano) {
    const { data: categorias } = await supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome).eq('mes', mes);
    let excedidos = [];

    for (const cat of categorias) {
        if (cat.nome_categoria === 'Salario') continue;
        const { data: gastos } = await supabaseClient.from('gastos').select('valor').eq('categoria_id', cat.id);
        const total = gastos?.reduce((acc, g) => acc + g.valor, 0) || 0;

        if (total > cat.limite_planejado) {
            excedidos.push({
                nome: cat.nome_categoria,
                gasto: total,
                limite: cat.limite_planejado,
                diff: total - cat.limite_planejado
            });
        }
    }

    if (excedidos.length === 0) {
        addMessage("✅ Nenhuma categoria ultrapassou o limite planejado este mês!", "bot");
        return;
    }

    let tabela = `<table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:10px;">
        <tr style="background:#ffeded;">
            <th style="padding:5px; border:1px solid #ddd;">Categoria</th>
            <th style="padding:5px; border:1px solid #ddd;">Gasto</th>
            <th style="padding:5px; border:1px solid #ddd;">Limite</th>
            <th style="padding:5px; border:1px solid #ddd;">Ultrapassou</th>
        </tr>`;

    excedidos.forEach(e => {
        tabela += `<tr>
            <td style="padding:5px; border:1px solid #ddd;">${e.nome}</td>
            <td style="padding:5px; border:1px solid #ddd; color:red;">R$ ${e.gasto.toFixed(2)}</td>
            <td style="padding:5px; border:1px solid #ddd;">R$ ${e.limite.toFixed(2)}</td>
            <td style="padding:5px; border:1px solid #ddd; font-weight:bold; color:darkred;">R$ ${e.diff.toFixed(2)}</td>
        </tr>`;
    });
    tabela += `</table>`;

    addMessage(`⚠️ **Categorias fora do limite:**<br>${tabela}`, "bot");
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
    const { data: gastos, error } = await supabaseClient.from('gastos').select('valor, categorias(nome_categoria)').eq('user_nome', user.user_nome).eq('mes', mes).eq('ano', ano);
    if (error) { addMessage("❌ Erro ao buscar gastos.", "bot"); return; }
    const totalGeral = gastos?.filter(g => g.categorias && g.categorias.nome_categoria !== 'Salario').reduce((acc, g) => acc + g.valor, 0) || 0;
    addMessage(`📊 Seu gasto total em despesas para **${mes}** é **R$ ${totalGeral.toFixed(2)}**.`, "bot");
}

inicializarChat();