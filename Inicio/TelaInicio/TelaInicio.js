const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';

if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/**
 * Carrega o conteúdo dinâmico na área central da aplicação
 */
async function loadContent(path) {
    const contentArea = document.getElementById('content-area');
    const filtrosHeader = document.getElementById('filtros-header-container');

    // Limpa filtros da barra superior por padrão ao trocar de aba
    filtrosHeader.innerHTML = "";

    if (path === 'Dash') {
        // Injeta Filtros Customizados
        filtrosHeader.innerHTML = `
            <select id="dash-filtro-mes" style="background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.3); padding: 5px 8px; border-radius: 8px; font-size: 11px; color: #ffffff !important; font-weight: bold; outline: none; cursor: pointer; appearance: none;"></select>
            <select id="dash-filtro-ano" style="background: rgba(255,255,255,0.25); border: 1px solid rgba(255,255,255,0.3); padding: 5px 8px; border-radius: 8px; font-size: 11px; color: #ffffff !important; font-weight: bold; outline: none; cursor: pointer; appearance: none;"></select>
        `;

        contentArea.innerHTML = `
            <div class="dash-wrapper">
                <div class="dash-top-half">
                    <div class="resumo-header">
                        <div class="resumo-item">
                            <small>GASTO TOTAL</small>
                            <h2 id="total-gasto">R$ 0,00</h2>
                        </div>
                        <div class="resumo-item salario">
                            <small>SALDO RESTANTE</small>
                            <h2 id="salario-mes" style="color: #00C853;">R$ 0,00</h2>
                        </div>
                    </div>

                    <div style="padding: 5px 0 15px 0;">
                        <button onclick="window.location.href='Indicacao/Indicacao.html'"
                                style="width: 100%; background: #6c5ce7; color: white; border: none; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 10px rgba(108, 92, 231, 0.2);">
                            <i class="fas fa-gift"></i> INDICAR AMIGO
                        </button>
                    </div>

                    <div class="chart-area-modern" id="chart-container">
                        <div class="chart-info">
                            <div class="chart-icon-box">
                                <i class="fas fa-chart-bar"></i>
                            </div>
                            <div class="chart-text">
                                <strong>Evolução Mensal</strong>
                                <span>Toque para detalhes</span>
                            </div>
                        </div>
                        <div class="chart-visual-preview">
                            <div class="mini-bar" style="height: 40%; background: #ff7675; opacity: 0.6;"></div>
                            <div class="mini-bar" style="height: 70%; background: #00C853; opacity: 0.8;"></div>
                            <div class="mini-bar" style="height: 50%; background: #ff7675; opacity: 0.6;"></div>
                            <div class="mini-bar" style="height: 90%; background: #00C853; opacity: 0.8;"></div>
                            <i class="fas fa-chevron-right" style="color: #b2bec3; font-size: 12px; margin-left: 5px;"></i>
                        </div>
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

        const script = document.createElement('script');
        script.src = `Dash/Dash.js?v=${new Date().getTime()}`;
        document.body.appendChild(script);
    } else {
        contentArea.innerHTML = `<div style="padding:40px; text-align:center; color:#636e72;"><h2>${path}</h2><p>Página em desenvolvimento.</p></div>`;
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

    // Inicia na Dash
    loadContent('Dash');

    // Botão Sair - Limpa sessão e filtros salvos
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            localStorage.removeItem('user_session');
            localStorage.removeItem('dash_mes_cache');
            localStorage.removeItem('dash_ano_cache');
            window.location.href = '../Login/Login.html';
        };
    }

    // Navegação Inferior
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const p = item.getAttribute('data-path');

            // Redirecionamentos de pastas (Respeitando Case-Sensitive para celular)
            if(p === 'Perfil' || p === 'IABot') {
                window.location.href = `${p}/${p}.html`;
                return;
            }

            if(p === 'Indicacao') {
                window.location.href = `Indicacao/Indicacao.html`;
                return;
            }

            if(p === 'Extrato') {
                window.location.href = `Extrato/Extrato.html`;
                return;
            }

            // Ativa visualmente o ícone na barra inferior
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            loadContent(p);
        };
    });
});