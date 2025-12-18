async function carregarDadosDash() {
    const user = JSON.parse(localStorage.getItem('user_session'));
    const dataAtual = new Date();
    const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    const selectMes = document.getElementById('dash-filtro-mes');
    const selectAno = document.getElementById('dash-filtro-ano');

    // Tenta recuperar o que estava selecionado antes (Memória)
    const mesSalvo = localStorage.getItem('dash_mes_cache');
    const anoSalvo = localStorage.getItem('dash_ano_cache');

    // 1. Popular filtros apenas se estiverem vazios
    if (selectMes && selectMes.innerHTML === "") {
        mesesNomes.forEach((m, i) => {
            let opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            opt.style.color = "#333"; // Garante que o texto da lista apareça em preto

            // Define o selecionado: Prioridade para o cache, se não tiver, usa o mês atual
            if (mesSalvo) {
                if (m === mesSalvo) opt.selected = true;
            } else if (i === dataAtual.getMonth()) {
                opt.selected = true;
            }
            selectMes.appendChild(opt);
        });

        for (let i = 2025; i <= 2030; i++) {
            let opt = document.createElement('option');
            opt.value = i;
            opt.innerText = i;
            opt.style.color = "#333";

            // Define o selecionado: Cache ou ano atual
            if (anoSalvo) {
                if (i.toString() === anoSalvo) opt.selected = true;
            } else if (i === dataAtual.getFullYear()) {
                opt.selected = true;
            }
            selectAno.appendChild(opt);
        }

        // Evento: Quando o usuário mudar o filtro, SALVA no cache e recarrega
        selectMes.onchange = () => {
            localStorage.setItem('dash_mes_cache', selectMes.value);
            carregarDadosDash();
        };
        selectAno.onchange = () => {
            localStorage.setItem('dash_ano_cache', selectAno.value);
            carregarDadosDash();
        };
    }

    // Pega os valores atuais dos filtros para a busca no Supabase
    const mesSelecionado = selectMes.value;
    const anoSelecionado = parseInt(selectAno.value);

    // 2. Buscar categorias do usuário
    const { data: categorias } = await window.supabaseClient
        .from('categorias')
        .select('*')
        .eq('user_nome', user.user_nome);

    const grid = document.getElementById('grid-categorias');
    if (!grid) return;
    grid.innerHTML = "";

    let valorTotalGeral = 0;

    if (categorias && categorias.length > 0) {
        for (const cat of categorias) {
            // Busca gastos baseados no MÊS e ANO selecionados nos filtros
            const { data: gastos } = await window.supabaseClient
                .from('gastos')
                .select('valor')
                .eq('categoria_id', cat.id)
                .eq('mes', mesSelecionado)
                .eq('ano', anoSelecionado);

            const somaGastoReal = gastos ? gastos.reduce((acc, g) => acc + g.valor, 0) : 0;
            valorTotalGeral += somaGastoReal;

            const limite = parseFloat(cat.limite_planejado) || 0;
            const ultrapassou = somaGastoReal > limite;

            // Renderiza o Card da categoria
            grid.innerHTML += `
                <div class="cat-card ${ultrapassou ? 'limite-estourado' : ''}"
                     onclick="window.location.href='categoria/detalhes.html?id=${cat.id}'">
                    <i class="fas ${cat.icone}"></i>
                </div>
            `;
        }
    } else {
        grid.innerHTML = `<p style="grid-column: span 4; font-size: 12px; color: #b2bec3; text-align: center; padding-top: 20px;">Toque no + para adicionar categorias</p>`;
    }

    // Atualiza o Display de Gasto Total na tela
    const totalElem = document.getElementById('total-gasto');
    if (totalElem) {
        totalElem.innerText = `R$ ${valorTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    }
}

// Executa a função ao carregar o script
carregarDadosDash();