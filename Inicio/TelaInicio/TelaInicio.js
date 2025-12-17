const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';

// Inicializa o cliente Supabase se ainda não estiver definido
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Carrega o conteúdo dinâmico na área central da aplicação
 */
async function loadContent(path) {
    const contentArea = document.getElementById('content-area');

    if (path === 'Dash') {
        contentArea.innerHTML = `
            <div class="dash-wrapper">
                <div class="dash-top-half">
                    <div class="resumo-header">
                        <div class="resumo-item">
                            <small>GASTO TOTAL</small>
                            <h2 id="total-gasto">R$ 0,00</h2>
                        </div>
                        <div class="resumo-item salario">
                            <small>SALÁRIO DO MÊS</small>
                            <h2 id="salario-mes">R$ 0,00</h2>
                        </div>
                    </div>
                    <div class="chart-area" id="chart-container">
                        <p><i class="fas fa-chart-line" style="margin-right:8px"></i> Gráfico de evolução</p>
                    </div>
                </div>

                <div class="dash-middle-bar">
                    <hr>
                    <button class="add-cat-float" onclick="window.location.href='categoria/categoria.html'">
                        <i class="fas fa-plus"></i> CATEGORIA
                    </button>
                </div>

                <div class="dash-bottom-half">
                    <div class="cat-grid" id="grid-categorias"></div>
                </div>
            </div>`;

        // Carrega o script da Dashboard com um timestamp para evitar cache
        const script = document.createElement('script');
        script.src = `Dash/Dash.js?v=${new Date().getTime()}`;
        document.body.appendChild(script);

    } else {
        contentArea.innerHTML = `
            <div style="padding:40px; text-align:center; color:#636e72;">
                <h2>${path}</h2>
                <p>Página em desenvolvimento.</p>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const session = JSON.parse(localStorage.getItem('user_session'));

    if (!session) {
        window.location.href = '../Login/Login.html';
        return;
    }

    const userDisplay = document.getElementById('logged-user-display');
    if (userDisplay) {
        userDisplay.textContent = `Olá, ${session.user_nome}!`;
    }

    loadContent('Dash');

    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('user_session');
            window.location.href = '../Login/Login.html';
        };
    }

    // CONFIGURAÇÃO DA NAVEGAÇÃO INFERIOR
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const p = item.getAttribute('data-path');

            // --- AJUSTE AQUI: Redirecionamento direto para as páginas HTML ---
            if(p === 'Perfil' || p === 'IABot') {
                window.location.href = `${p}/${p}.html`;
                return;
            }

            // NOVA CONDIÇÃO PARA O EXTRATO
            if(p === 'Extrato') {
                window.location.href = `Extrato/extrato.html`; // Ajuste o caminho se a pasta tiver outro nome
                return;
            }

            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            loadContent(p);
        };
    });
});