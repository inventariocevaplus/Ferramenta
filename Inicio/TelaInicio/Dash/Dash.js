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
            opt.style.color = "#333";

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

            if (anoSalvo) {
                if (i.toString() === anoSalvo) opt.selected = true;
            } else if (i === dataAtual.getFullYear()) {
                opt.selected = true;
            }
            selectAno.appendChild(opt);
        }

        selectMes.onchange = () => {
            localStorage.setItem('dash_mes_cache', selectMes.value);
            carregarDadosDash();
        };
        selectAno.onchange = () => {
            localStorage.setItem('dash_ano_cache', selectAno.value);
            carregarDadosDash();
        };
    }

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

    let valorTotalGastos = 0;
    let valorSalarioMes = 0;

    if (categorias && categorias.length > 0) {
        for (const cat of categorias) {
            // Busca gastos baseados no MÊS e ANO selecionados
            const { data: registros } = await window.supabaseClient
                .from('gastos')
                .select('valor')
                .eq('categoria_id', cat.id)
                .eq('mes', mesSelecionado)
                .eq('ano', anoSelecionado);

            const somaRegistro = registros ? registros.reduce((acc, g) => acc + g.valor, 0) : 0;

            // SEPARA SALÁRIO DE GASTOS
            if (cat.nome_categoria.toLowerCase() === 'salario') {
                valorSalarioMes = somaRegistro;
                // Não renderiza o ícone de Salário no Grid de gastos
            } else {
                valorTotalGastos += somaRegistro;

                const limite = parseFloat(cat.limite_planejado) || 0;
                const ultrapassou = somaRegistro > limite;

                // Renderiza o Card da categoria (apenas gastos)
                grid.innerHTML += `
                    <div class="cat-card ${ultrapassou ? 'limite-estourado' : ''}"
                         onclick="window.location.href='categoria/detalhes.html?id=${cat.id}'">
                        <i class="fas ${cat.icone}"></i>
                    </div>
                `;
            }
        }
    } else {
        grid.innerHTML = `<p style="grid-column: span 4; font-size: 12px; color: #b2bec3; text-align: center; padding-top: 20px;">Toque no + para adicionar categorias</p>`;
    }

    // 3. Atualizar DISPLAYS de valores
    const totalElem = document.getElementById('total-gasto');
    if (totalElem) {
        totalElem.innerText = `R$ ${valorTotalGastos.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    }

    const saldoElem = document.getElementById('salario-mes');
    if (saldoElem) {
        const saldoRestante = valorSalarioMes - valorTotalGastos;

        // Atualiza o texto do rótulo para "Saldo Restante"
        const labelSaldo = saldoElem.parentElement.querySelector('small');
        if(labelSaldo) labelSaldo.innerText = "SALDO RESTANTE";

        saldoElem.innerText = `R$ ${saldoRestante.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;

        // Fica vermelho se o saldo for menor que zero
        saldoElem.style.color = saldoRestante < 0 ? "#ff5252" : "#00C853";
    }
}

carregarDadosDash();