async function carregarDadosDash() {
    const user = JSON.parse(localStorage.getItem('user_session'));
    const { data: categorias, error } = await window.supabaseClient
        .from('categorias')
        .select('*')
        .eq('user_nome', user.user_nome);

    const grid = document.getElementById('grid-categorias');
    if (!grid) return;
    grid.innerHTML = "";

    let gastoTotal = 0;

    if (categorias && categorias.length > 0) {
        categorias.forEach(cat => {
            gastoTotal += Number(cat.gasto_atual || 0);
            grid.innerHTML += `
                <div class="cat-card" onclick="this.classList.toggle('active')">
                    <i class="fas ${cat.icone}"></i>
                </div>
            `;
        });
    } else {
        grid.innerHTML = `<p style="grid-column: span 4; font-size: 12px; color: #b2bec3; text-align: center; padding-top: 20px;">Toque no + para adicionar categorias</p>`;
    }

    document.getElementById('total-gasto').innerText = `R$ ${gastoTotal.toLocaleString('pt-BR', {minimumFractionDigits:2})}`;
    // Placeholder para o salário que vira do banco no futuro
    document.getElementById('salario-mes').innerText = `R$ 0,00`;
}
carregarDadosDash();