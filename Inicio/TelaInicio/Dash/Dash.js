async function carregarDadosDash() {
    const user = JSON.parse(localStorage.getItem('user_session'));
    const dataAtual = new Date();
    const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

    const selectMes = document.getElementById('dash-filtro-mes');
    const selectAno = document.getElementById('dash-filtro-ano');

    if (selectMes && selectMes.innerHTML === "") {
        mesesNomes.forEach((m, i) => {
            let opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            if (localStorage.getItem('dash_mes_cache') ? m === localStorage.getItem('dash_mes_cache') : i === dataAtual.getMonth()) opt.selected = true;
            selectMes.appendChild(opt);
        });

        for (let i = 2025; i <= 2030; i++) {
            let opt = document.createElement('option');
            opt.value = i;
            opt.innerText = i;
            if (localStorage.getItem('dash_ano_cache') ? i.toString() === localStorage.getItem('dash_ano_cache') : i === dataAtual.getFullYear()) opt.selected = true;
            selectAno.appendChild(opt);
        }

        selectMes.onchange = () => { localStorage.setItem('dash_mes_cache', selectMes.value); carregarDadosDash(); };
        selectAno.onchange = () => { localStorage.setItem('dash_ano_cache', selectAno.value); carregarDadosDash(); };
    }

    const mesSelecionado = selectMes ? selectMes.value : mesesNomes[dataAtual.getMonth()];
    const anoSelecionado = selectAno ? parseInt(selectAno.value) : dataAtual.getFullYear();

    const { data: categorias } = await window.supabaseClient.from('categorias').select('*').eq('user_nome', user.user_nome);

    const grid = document.getElementById('grid-categorias');
    if (!grid) return;
    grid.innerHTML = "";

    let valorTotalGastos = 0;
    let valorSalarioMes = 0;

    if (categorias) {
        for (const cat of categorias) {
            const { data: registros } = await window.supabaseClient.from('gastos')
                .select('valor')
                .eq('categoria_id', cat.id)
                .eq('mes', mesSelecionado)
                .eq('ano', anoSelecionado);

            const soma = registros ? registros.reduce((acc, g) => acc + g.valor, 0) : 0;

            if (cat.nome_categoria.toLowerCase().includes('salario') || cat.nome_categoria.toLowerCase().includes('salário')) {
                valorSalarioMes = soma;
            } else {
                valorTotalGastos += soma;
                const limite = parseFloat(cat.limite_planejado) || 0;
                grid.innerHTML += `
                    <div class="cat-card ${soma > limite ? 'limite-estourado' : ''}"
                         onclick="window.location.href='categoria/detalhes.html?id=${cat.id}'">
                        <i class="fas ${cat.icone}"></i>
                    </div>`;
            }
        }
    }

    document.getElementById('total-gasto').innerText = `R$ ${valorTotalGastos.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    const saldoRestante = valorSalarioMes - valorTotalGastos;
    const saldoElem = document.getElementById('salario-mes');
    if (saldoElem) {
        saldoElem.innerText = `R$ ${saldoRestante.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
        saldoElem.style.color = saldoRestante < 0 ? "#ff7675" : "#2ecc71";
    }

    const chartBtn = document.getElementById('chart-container');
    if (chartBtn) {
        chartBtn.onclick = () => abrirModalEvolucao(user.user_nome);
    }
}

async function abrirModalEvolucao(userNome) {
    if (!document.getElementById('modal-evolucao')) {
        const modalHtml = `
            <div id="modal-evolucao" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.7); backdrop-filter: blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center;">
                <div style="background:#ffffff; width:92%; max-width:400px; border-radius:28px; padding:24px; position:relative; box-shadow:0 20px 50px rgba(0,0,0,0.3);">
                    <button onclick="document.getElementById('modal-evolucao').remove()" style="position:absolute; top:20px; right:20px; background:#f1f2f6; border:none; width:30px; height:30px; border-radius:50%; font-size:18px; color:#636e72; cursor:pointer;">&times;</button>
                    <div style="text-align:center; margin-bottom:15px;">
                        <i class="fas fa-chart-bar" style="color:#6c5ce7; font-size:24px; margin-bottom:10px;"></i>
                        <h3 style="margin:8px 0; font-size:18px; color:#2d3436;">Histórico Mensal</h3>
                        <p id="subtitulo-grafico" style="font-size:11px; color:#b2bec3; margin:0;">Toque na coluna para detalhes</p>
                    </div>

                    <div id="resumo-mes-pop" style="display:none; background:#f1f2f6; border-radius:15px; padding:12px; margin-bottom:15px; animation:fadeInUp 0.3s ease; border-left: 4px solid #6c5ce7;"></div>

                    <div id="canvas-grafico" style="display:flex; align-items:flex-end; justify-content:space-between; height:240px; padding:10px 15px; background:#f8f9fa; border-radius:18px; position:relative; overflow:visible;">
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const canvas = document.getElementById('canvas-grafico');
    canvas.innerHTML = "<div style='width:100%; text-align:center; color:#b2bec3; font-size:12px;'>Carregando dados...</div>";

    const mesesLongos = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesesNomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    const hoje = new Date();

    // 1. Criamos um array com as definições dos últimos 6 meses
    const mesesParaBuscar = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
        return {
            nomeLongo: mesesLongos[d.getMonth()],
            nomeCurto: mesesNomes[d.getMonth()],
            ano: d.getFullYear()
        };
    });

    try {
        // 2. Buscamos todas as categorias UMA ÚNICA VEZ
        const { data: categorias } = await window.supabaseClient.from('categorias').select('id, nome_categoria').eq('user_nome', userNome);

        // 3. Criamos as promessas de busca para todos os meses em paralelo
        const dadosGrafico = await Promise.all(mesesParaBuscar.map(async (mes) => {
            let sal = 0, gas = 0;

            if (categorias && categorias.length > 0) {
                // Buscamos todos os gastos do mês de uma vez só para este mês específico
                const idsCategorias = categorias.map(c => c.id);
                const { data: registros } = await window.supabaseClient
                    .from('gastos')
                    .select('valor, categoria_id')
                    .in('categoria_id', idsCategorias)
                    .eq('mes', mes.nomeLongo)
                    .eq('ano', mes.ano);

                if (registros) {
                    registros.forEach(reg => {
                        const cat = categorias.find(c => c.id === reg.categoria_id);
                        const nomeCat = cat.nome_categoria.toLowerCase();
                        if (nomeCat.includes('salario') || nomeCat.includes('salário')) {
                            sal += reg.valor;
                        } else {
                            gas += reg.valor;
                        }
                    });
                }
            }

            return {
                mes: mes.nomeCurto,
                mesLongo: mes.nomeLongo,
                salario: sal,
                gasto: gas,
                sobra: (sal - gas)
            };
        }));

        // 4. Renderização (mesmo código anterior, mas os dados chegam juntos)
        const maxValor = Math.max(...dadosGrafico.map(d => Math.max(d.salario, d.gasto)), 1);
        const alturaMaximaPx = 180;
        canvas.innerHTML = "";

        dadosGrafico.forEach(d => {
            const altSal = (d.salario / maxValor) * alturaMaximaPx;
            const altGas = (d.gasto / maxValor) * alturaMaximaPx;

            canvas.innerHTML += `
                <div class="coluna-grupo" onclick="exibirResumoMes('${d.mesLongo}', ${d.salario}, ${d.gasto}, ${d.sobra})" style="display:flex; flex-direction:column; align-items:center; flex:1; height:100%; position:relative; z-index:2; justify-content:flex-end; cursor:pointer;">
                    <div style="display:flex; align-items:flex-end; gap:6px; margin-bottom:35px;">
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <span style="font-size:8px; color:#ff7675; margin-bottom:3px; font-weight:600;">${d.gasto > 0 ? Math.round(d.gasto) : ''}</span>
                            <div class="bar" style="width:16px; height:${altGas}px; min-height:${d.gasto > 0 ? '4px' : '0'}; background:#ff7675; border-radius:4px 4px 2px 2px;"></div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:center;">
                            <span style="font-size:8px; color:#2ecc71; margin-bottom:3px; font-weight:600;">${d.salario > 0 ? Math.round(d.salario) : ''}</span>
                            <div class="bar" style="width:16px; height:${altSal}px; min-height:${d.salario > 0 ? '4px' : '0'}; background:#2ecc71; border-radius:4px 4px 2px 2px;"></div>
                        </div>
                    </div>
                    <span style="font-size:10px; font-weight:bold; color:#a4b0be; position:absolute; bottom:8px;">${d.mes}</span>
                </div>`;
        });
    } catch (error) {
        canvas.innerHTML = "<div style='color:red; font-size:10px;'>Erro ao carregar dados.</div>";
        console.error(error);
    }
}

function exibirResumoMes(nome, sal, gas, sob) {
    const pop = document.getElementById('resumo-mes-pop');
    pop.style.display = 'block';
    pop.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="font-size:14px; color:#2d3436;">${nome}</strong>
            <div style="display:flex; gap:12px; font-size:12px;">
                <span style="color:#2ecc71; font-weight:600;">▲ R$${Math.round(sal)}</span>
                <span style="color:#ff7675; font-weight:600;">▼ R$${Math.round(gas)}</span>
                <span style="font-weight:800; color:#6c5ce7;">= R$${Math.round(sob)}</span>
            </div>
        </div>
    `;
}

carregarDadosDash();