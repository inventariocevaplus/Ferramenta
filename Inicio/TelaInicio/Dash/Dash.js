async function carregarDadosDash() {
    const user = JSON.parse(localStorage.getItem('user_session'));
    const dataAtual = new Date();
    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    const mesAtual = meses[dataAtual.getMonth()];
    const anoAtual = dataAtual.getFullYear();

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
            const { data: gastos } = await window.supabaseClient
                .from('gastos')
                .select('valor')
                .eq('categoria_id', cat.id)
                .eq('mes', mesAtual)
                .eq('ano', anoAtual);

            const somaGastoReal = gastos ? gastos.reduce((acc, g) => acc + g.valor, 0) : 0;
            valorTotalGeral += somaGastoReal;

            const limite = parseFloat(cat.limite_planejado) || 0;
            const ultrapassou = somaGastoReal > limite;

            // Mantendo exatamente a sua estrutura original de ícones e cores do CSS
            grid.innerHTML += `
                <div class="cat-card ${ultrapassou ? 'limite-estourado' : ''}"
                     onclick="window.location.href='categoria/detalhes.html?id=${cat.id}'">
                    <i class="fas ${cat.icone}"></i>
                </div>
            `;
        }
    } else {
        grid.innerHTML = `<p style="grid-column: span 4; font-size: 12px; color: #b2bec3; text-align: center; padding-top: 20px;">Toque no + para adicionar</p>`;
    }

    const totalElem = document.getElementById('total-gasto');
    if (totalElem) {
        totalElem.innerText = `R$ ${valorTotalGeral.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    }
}

carregarDadosDash();