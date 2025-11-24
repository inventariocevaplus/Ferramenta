/*
 * Arquivo: W2WFTSobras.js
 * OBJETIVO: Conexão com Supabase, Lógica de agrupamento, Geração de link mobile,
 * Busca de Pendentes/Coletados/Finalizados e Modal de Detalhes com Fotos.
 * STATUS: Versão COMPLETA + LÓGICA DE CONFIRMAÇÃO PERSONALIZADA (Substitui o confirm() nativo).
 */

// =================================================================
// 0. CONEXÃO COM SUPABASE E CONFIGURAÇÕES
// =================================================================
const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';
const BUCKET_NAME = 'w2w-sobras-images'; // Seu bucket de fotos

let supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let SUPABASE_USER_NAME = 'TESTE_ANONIMO'; // 🎯 MANTIDO FIXO COMO SOLICITADO

const btnAddSobras = document.getElementById('btnAddSobras');
const pendingListContainer = document.querySelector('#screen-pending .pending-list-container');
const finishedListContainer = document.querySelector('#screen-finished .pending-list-container');

// Mapeamento do Modal de Detalhes
const detailsModal = document.getElementById('details-modal');
const modalCloseBtn = document.querySelector('.modal-close');
const modalContentArea = document.getElementById('modal-details-content');
const customToast = document.getElementById('custom-toast');

// 🚨 Mapeamento do NOVO Modal de Confirmação
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');


// =================================================================
// 1. DECLARAÇÃO DE VARIÁVEIS (Mapeamento de DOM)
// =================================================================
const dateStartNative = document.getElementById('date-start-native');
const dateEndNative = document.getElementById('date-end-native');
const dateStartDisplay = document.getElementById('date-start-display');
const dateEndDisplay = document.getElementById('date-end-display');
const btnGenerateKey = document.getElementById('btn-generate-key');
const generatedKeyInput = document.getElementById('generated-key');
const contractNameInput = document.getElementById('contract-name');
const locationInput = document.getElementById('location');
const itemInput = document.getElementById('item');
const quantityInput = document.getElementById('quantity');
const logEntryInput = document.getElementById('log-entry');
const chkAtrelarInput = document.getElementById('chk-atrelar');

// =================================================================
// 2. FUNÇÕES DE UTILIDADE E DATA
// =================================================================

function enableAddSobrasButton() {
    if (btnAddSobras) {
        btnAddSobras.disabled = false;
        btnAddSobras.textContent = `Adicionar Sobra (${SUPABASE_USER_NAME})`;
        btnAddSobras.style.backgroundColor = '#4CAF50';
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
}

function parseDate(dateString) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year >= 1000) {
             return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }
    return null;
}

function setDefaultDates() {
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    if(dateStartNative && dateEndNative) {
        dateStartNative.value = formattedToday;
        dateEndNative.value = formattedToday;
        dateStartDisplay.value = formatDate(formattedToday);
        dateEndDisplay.value = formatDate(formattedToday);
    }
}

function syncDates(nativeInput, displayInput, selectedNativeDate) {
    const otherNativeInput = nativeInput === dateStartNative ? dateEndNative : dateStartNative;
    const otherDisplayInput = nativeInput === dateStartNative ? dateEndDisplay : dateStartDisplay;

    nativeInput.value = selectedNativeDate;
    displayInput.value = formatDate(selectedNativeDate);

    if (nativeInput === dateStartNative && otherNativeInput.value < selectedNativeDate) {
        otherNativeInput.value = selectedNativeDate;
        otherDisplayInput.value = formatDate(selectedNativeDate);
    } else if (nativeInput === dateEndNative && otherNativeInput.value > selectedNativeDate) {
        otherNativeInput.value = selectedNativeDate;
        otherDisplayInput.value = formatDate(selectedNativeDate);
    }
}

function handleManualInput(event) {
    const displayInput = event.target;
    let value = displayInput.value;
    if (event.inputType !== 'deleteContentBackward') {
        if (value.length === 2 || value.length === 5) {
            if (value.slice(-1) !== '/') {
                value += '/';
                displayInput.value = value;
            }
        }
    }
    if (value.length === 10) {
        const nativeDate = parseDate(value);
        if (nativeDate) {
            const nativeInput = displayInput === dateStartDisplay ? dateStartNative : dateEndNative;
            syncDates(nativeInput, displayInput, nativeDate);
        } else {
             const nativeInput = displayInput === dateStartDisplay ? dateStartNative : dateEndNative;
             nativeInput.value = '';
        }
    }
}

function handleNativeChange(event) {
    const nativeInput = event.target;
    const selectedDate = nativeInput.value;
    const displayInput = nativeInput === dateStartNative ? dateStartDisplay : dateEndDisplay;
    syncDates(nativeInput, displayInput, selectedDate);
}

function handleDisplayClick(nativeInput) {
    if (nativeInput) {
        nativeInput.click();
    }
}

// 🎯 FUNÇÃO TOAST: Exibe a mensagem discreta por 2 segundos
function showToast(message, type = 'success', duration = 2000) {
    if (!customToast) return;

    // Configura a mensagem e a classe de estilo
    customToast.textContent = message;
    customToast.className = `toast-message show ${type}`;

    // Remove a mensagem após a duração especificada
    setTimeout(() => {
        customToast.classList.remove('show');
    }, duration);
}

// 🚨 NOVO: Função de Confirmação Personalizada
function customConfirm(message, onConfirm) {
    if (!confirmModal || !confirmMessage || !confirmOkBtn || !confirmCancelBtn) {
        // Fallback para o confirm() nativo se o modal não for encontrado
        if (window.confirm(message)) {
            onConfirm();
        }
        return;
    }

    confirmMessage.innerHTML = message;
    confirmModal.style.display = 'flex';

    // Remove listeners anteriores para evitar múltiplos disparos
    confirmOkBtn.replaceWith(confirmOkBtn.cloneNode(true));
    confirmCancelBtn.replaceWith(confirmCancelBtn.cloneNode(true));

    const newConfirmOkBtn = document.getElementById('confirm-ok-btn');
    const newConfirmCancelBtn = document.getElementById('confirm-cancel-btn');


    const handleOk = () => {
        confirmModal.style.display = 'none';
        onConfirm();
    };

    const handleCancel = () => {
        confirmModal.style.display = 'none';
    };

    newConfirmOkBtn.addEventListener('click', handleOk);
    newConfirmCancelBtn.addEventListener('click', handleCancel);

    // Fechar ao clicar fora (se o target for o próprio modal)
    window.addEventListener('click', function closeIfOutside(event) {
        if (event.target === confirmModal) {
            confirmModal.style.display = 'none';
            window.removeEventListener('click', closeIfOutside); // Remove após uso
        }
    });
}


// =================================================================
// 3. GERAÇÃO DE CHAVE E USUÁRIO
// =================================================================

function generateKey() {
    let key = '';
    for (let i = 0; i < 6; i++) {
        key += Math.floor(Math.random() * 10).toString();
    }
    return key;
}

function handleGenerateKeyClick() {
    if (generatedKeyInput) {
        const key = generateKey();
        generatedKeyInput.value = key;
        showToast(`Nova chave gerada: ${key}`, 'info', 3000);
    }
}

// =================================================================
// 4. COLETA E ARMAZENAMENTO DE DADOS
// =================================================================

function getFormData() {
    return {
        nome_contrato: contractNameInput.value.trim(),
        data_inicio: dateStartNative.value,
        data_fim: dateEndNative.value,
        locacao: locationInput.value.trim(),
        item: itemInput.value.trim(),
        quantity: parseInt(quantityInput.value) || 0,
        chave: generatedKeyInput.value.trim(),
        log_operacao: logEntryInput.value.trim(),
        atrelar: chkAtrelarInput.checked,
        status: 'Pendente'
    };
}

function validateForm(data) {
    if (!data.nome_contrato || !data.locacao || !data.item || data.quantity <= 0) {
        alert("Por favor, preencha Contrato, Locação, Item e Quantidade (> 0).");
        return false;
    }
    if (data.chave.length !== 6) {
        alert("Por favor, gere uma chave de 6 dígitos antes de adicionar a sobra.");
        return false;
    }

    return true;
}

async function handleAddSobras() {
    if (!supabaseClient) {
        alert("Erro: Supabase Client não inicializado.");
        return;
    }

    const dados = getFormData();

    if (!validateForm(dados)) {
        return;
    }

    // Desabilitar o botão enquanto processa para evitar cliques duplos
    btnAddSobras.disabled = true;
    btnAddSobras.textContent = 'Salvando...';

    const { error } = await supabaseClient.rpc('inserir_sobra_aprovada', {
        p_nome_contrato: dados.nome_contrato,
        p_data_inicio: dados.data_inicio,
        p_data_fim: dados.data_fim,
        p_locacao: dados.locacao,
        p_item: dados.item,
        p_qtd: dados.quantity,
        p_chave: dados.chave,
        p_log_operacao: dados.log_operacao,
        p_nome_usuario: SUPABASE_USER_NAME
    });

    // Reabilita o botão
    btnAddSobras.disabled = false;
    btnAddSobras.textContent = `Adicionar Sobra (${SUPABASE_USER_NAME})`;


    if (error) {
        console.error('ERRO SUPABASE ao inserir sobra:', error);
        let userMessage = 'Falha ao salvar a sobra! Erro no banco de dados.';
        if (error.code === '42501') {
             userMessage = 'Ação Bloqueada (Permissão). Verifique as permissões da função RPC.';
        }
        showToast(`Erro: ${userMessage}`, 'error', 4000);
        return;
    }

    // 🎯 Toast de Confirmação
    showToast(`Sobra adicionada! Chave: ${dados.chave}`, 'success', 2000);

    // Limpeza de campos
    if(locationInput) locationInput.value = '';
    if(itemInput) itemInput.value = '';
    if(quantityInput) quantityInput.value = '';
    if(logEntryInput) logEntryInput.value = '';

    const isAtrelarActive = chkAtrelarInput.checked;

    if (!isAtrelarActive) {
        if(generatedKeyInput) generatedKeyInput.value = '';
    }
}

// =================================================================
// 5. FUNÇÃO AUXILIAR DE LINK EXTERNO
// =================================================================

/**
 * Gera o link externo para a tela de coleta mobile (Mobile.html) e copia para a área de transferência.
 */
function generateExternalLink(chave) {
    // Caminho relativo para o Mobile.html (assume que está na mesma pasta)
    const relativeLink = `./Mobile.html?chave=${chave}`;

    // Converte o caminho relativo em uma URL absoluta, usando a URL atual como base
    const absoluteLink = new URL(relativeLink, window.location.href).href;

    // Usaremos o Toast para a confirmação de cópia, em vez do alert, para manter a consistência visual
    navigator.clipboard.writeText(absoluteLink).then(() => {
        showToast(`Link de Coleta Mobile copiado para a área de transferência!`, 'success', 3000);
    }, (err) => {
        console.error('Falha ao copiar o link: ', err);
        // Fallback para alert se a cópia falhar
        alert(`Não foi possível copiar o link. Copie manualmente:\n${absoluteLink}`);
    });
}


// =================================================================
// 6. LÓGICA DE BUSCA, AGRUPAMENTO, MODAL E EXCLUSÃO (AJUSTADO: USA customConfirm)
// =================================================================

/**
 * 🗑️ FUNÇÃO CHAVE: Exclui todos os registros do banco de dados relacionados a uma chave.
 */
async function deleteKey(chave) {
    if (!chave) return;

    const message = `<p style="font-size: 1.1em; color: #E1261C;">ATENÇÃO!</p>
                     <p>Você tem certeza que deseja EXCLUIR TODAS as linhas relacionadas à CHAVE <strong>${chave}</strong>?</p>
                     <p style="font-weight: bold; margin-top: 10px;">Esta ação é irreversível.</p>`;

    // 🚨 Usa o modal de confirmação personalizado
    customConfirm(message, async () => {
        // Lógica de exclusão que será executada se o usuário clicar em "Sim, Excluir"
        showToast(`Excluindo chave ${chave}...`, 'info', 5000);

        // 2. Excluir os registros da tabela w2w_sobras
        const { error } = await supabaseClient
            .from('w2w_sobras')
            .delete()
            .eq('chave', chave);

        if (error) {
            console.error(`ERRO SUPABASE ao excluir chave ${chave}:`, error);
            showToast(`Falha ao excluir chave ${chave}. Verifique permissões.`, 'error', 4000);
            return;
        }

        showToast(`Chave ${chave} e todos os registros relacionados excluídos com sucesso!`, 'success', 3000);

        // 3. Recarrega a tela ativa para atualizar a lista
        const screenPending = document.getElementById('screen-pending');
        const screenFinished = document.getElementById('screen-finished');

        if (screenPending && screenPending.classList.contains('active')) {
            window.showPending();
        } else if (screenFinished && screenFinished.classList.contains('active')) {
            window.showFinished();
        }
    });
}


async function fetchSobras(status) {
    if (!supabaseClient) return [];

    const filter = status === 'Pendente' ? 'status.in.("Pendente", "Coletado")' : `status.eq.${status}`;

    const { data, error } = await supabaseClient
        .from('w2w_sobras')
        .select(`
            id, chave, nome_contrato, item, qtd, data_inicio, data_fim, locacao, log_operacao, status, created_at, nome_usuario
        `)
        .or(filter)
        .order('created_at', { ascending: false });

    if (error) {
        console.error(`ERRO ao buscar sobras ${status}:`, error);
        return [];
    }

    return data || [];
}

function groupDataByChave(data) {
    const grouped = {};
    const statusOrder = { 'Finalizado': 3, 'Coletado': 2, 'Pendente': 1 };

    data.forEach(item => {
        const key = item.chave;

        if (!grouped[key]) {
            grouped[key] = {
                chave: key,
                nomeContrato: item.nome_contrato,
                totalQtd: 0,
                itemCount: 0,
                dataInicio: item.data_inicio,
                dataFim: item.data_fim,
                locacao: item.locacao,
                status: item.status,
                ids: []
            };
        }

        if (statusOrder[item.status] > statusOrder[grouped[key].status]) {
            grouped[key].status = item.status;
        }

        grouped[key].totalQtd += item.qtd;
        grouped[key].itemCount++;
        grouped[key].ids.push(item.id);
    });
    return Object.values(grouped);
}

/**
 * 🔑 FUNÇÃO: Abre o modal e busca todos os detalhes daquela CHAVE, incluindo fotos.
 */
async function showKeyDetails(chave, agrupadoStatus) {
    if (!detailsModal || !modalContentArea) return;

    modalContentArea.innerHTML = '<p style="text-align: center; color: #021D49;">Carregando detalhes...</p>';
    detailsModal.style.display = 'flex';

    let query = supabaseClient
        .from('w2w_sobras')
        .select(`
            id, chave, nome_contrato, item, qtd, data_inicio, data_fim, locacao, log_operacao, status, created_at, nome_usuario, foto_url, data_coleta
        `)
        .eq('chave', chave);

    if (agrupadoStatus === 'Pendente' || agrupadoStatus === 'Coletado') {
        query = query.in('status', ['Pendente', 'Coletado']);
    }

    query = query.order('created_at', { ascending: true });


    const { data, error } = await query;

    if (error) {
        console.error(`Erro ao buscar detalhes da chave ${chave}:`, error);
        modalContentArea.innerHTML = `<p style="color: red; text-align: center;">Erro ao carregar detalhes: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        modalContentArea.innerHTML = `<p style="text-align: center;">Nenhum detalhe encontrado para a chave ${chave}.</p>`;
        return;
    }

    let totalQtd = data.reduce((sum, item) => sum + item.qtd, 0);
    const primaryStatusClass = agrupadoStatus.toLowerCase();

    let html = `
        <h3 class="modal-title-chave">CHAVE: <span style="color: #E1261C;">${chave}</span></h3>
        <div class="modal-summary">
            <p>Contrato: <strong>${data[0].nome_contrato}</strong></p>
            <p>Local Principal: <strong>${data[0].locacao}</strong></p>
            <p>Total de Linhas: <strong>${data.length}</strong></p>
            <p>Quantidade Total: <strong>${totalQtd}</strong></p>
            <p>Status Agrupado: <strong class="status-${primaryStatusClass}">${agrupadoStatus.toUpperCase()}</strong></p>
        </div>

        <h4 class="modal-subtitle">Detalhes da Coleta (${data.length} Linhas)</h4>

        <div class="modal-details-scroll">
        <div class="details-list">
    `;

    data.forEach((item, index) => {
        const itemStatus = item.status || 'Pendente';
        const itemStatusClass = itemStatus.toLowerCase();

        let fotoLinksHtml = '';
        const fotoPath = item.foto_url;

        if (fotoPath) {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${fotoPath}`;

            fotoLinksHtml += `
                <a href="${publicUrl}" target="_blank" title="Visualizar Foto">
                    <i class="fas fa-image"></i> Ver Foto
                </a>
            `;
        }


        html += `
            <div class="detail-item status-${itemStatusClass}">
                <div class="detail-header">
                    <span class="detail-index">#${index + 1} - ID ${item.id}</span>
                    <span class="detail-item-code">ITEM: ${item.item}</span>
                </div>
                <div class="detail-body">
                    <dl>
                        <dt>Status Item:</dt><dd><strong class="status-${itemStatusClass}">${itemStatus.toUpperCase()}</strong></dd>
                        <dt>Locação:</dt><dd>${item.locacao}</dd>
                        <dt>Qtd:</dt><dd><strong>${item.qtd}</strong></dd>
                        <dt>Usuário:</dt><dd>${item.nome_usuario}</dd>
                        <dt>Data Coleta:</dt><dd>${item.data_coleta ? formatDate(item.data_coleta.split('T')[0]) : 'N/A'}</dd>
                        <dt>Log Operação:</dt><dd>${item.log_operacao}</dd>
                        <dt>Fotos:</dt><dd>${fotoLinksHtml || 'Nenhuma foto'}</dd>
                    </dl>
                </div>
            </div>
        `;
    });

    html += `</div></div>`;
    modalContentArea.innerHTML = html;
}

function renderGroupedItems(container, groupedItems) {
    if (!container) return;

    container.innerHTML = '';

    if (groupedItems.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center;">Nenhum item encontrado.</p>';
        return;
    }

    groupedItems.forEach(group => {
        const itemElement = document.createElement('div');
        itemElement.className = `pending-item status-${group.status.toLowerCase()}`;

        itemElement.addEventListener('click', (e) => {
            if (!e.target.closest('.link-icon') && !e.target.closest('.delete-icon')) {
                showKeyDetails(group.chave, group.status);
            }
        });

        const statusLabel = group.status.toUpperCase();
        const isPendingOrCollected = (group.status === 'Pendente' || group.status === 'Coletado');

        itemElement.innerHTML = `
            <div class="pending-info">
                <span class="pending-key">CHAVE: ${group.chave}</span>
                <span class="pending-details">${group.itemCount} Itens (${group.totalQtd} QTD) | Contrato: ${group.nomeContrato}</span>
                <span class="pending-location">${group.locacao} (${formatDate(group.dataInicio)} - ${formatDate(group.dataFim)})</span>
            </div>
            <div class="pending-actions">
                <i class="fas fa-trash-alt delete-icon" title="Excluir todos os itens desta chave"></i>

                ${isPendingOrCollected ?
                '<i class="fas fa-link link-icon" title="Gerar link de coleta mobile"></i>' :
                ''}
                <span class="status-badge status-${group.status.toLowerCase()}">${statusLabel}</span>
            </div>
        `;

        const linkIcon = itemElement.querySelector('.link-icon');
        if (linkIcon) {
             linkIcon.addEventListener('click', (e) => {
                 e.stopPropagation();
                 generateExternalLink(group.chave);
             });
        }

        const deleteIcon = itemElement.querySelector('.delete-icon');
        if (deleteIcon) {
             deleteIcon.addEventListener('click', (e) => {
                 e.stopPropagation();
                 deleteKey(group.chave);
             });
        }

        container.appendChild(itemElement);
    });
}


window.showPending = async function() {
    hideAllScreens();
    const screenPending = document.getElementById('screen-pending');
    const btnPendentes = document.getElementById('btn-pendentes');

    if(screenPending) screenPending.classList.add('active');
    if(btnPendentes) btnPendentes.classList.add('active');

    if (pendingListContainer) pendingListContainer.innerHTML = '<p style="text-align: center;">Carregando...</p>';

    const sobrasPendentes = await fetchSobras('Pendente');
    const groupedItems = groupDataByChave(sobrasPendentes);

    renderGroupedItems(pendingListContainer, groupedItems);
}


window.showFinished = async function() {
    hideAllScreens();
    const screenFinished = document.getElementById('screen-finished');
    const btnFinalizados = document.getElementById('btn-finalizados');

    if(screenFinished) screenFinished.classList.add('active');
    if(btnFinalizados) btnFinalizados.classList.add('active');

    if (finishedListContainer) finishedListContainer.innerHTML = '<p style="text-align: center;">Carregando...</p>';

    const sobrasFinalizadas = await fetchSobras('Finalizado');
    const groupedItems = groupDataByChave(sobrasFinalizadas);

    renderGroupedItems(finishedListContainer, groupedItems);
}


function initNavigation() {
    const btnPendentes = document.getElementById('btn-pendentes');
    const btnFinalizados = document.getElementById('btn-finalizados');
    const titleLink = document.getElementById('title-home');

    const btnBackPending = document.getElementById('btn-back-pending');
    const btnBackFinished = document.getElementById('btn-back-finished');

    const screenForm = document.getElementById('screen-form');
    const screenPending = document.getElementById('screen-pending');
    const screenFinished = document.getElementById('screen-finished');

    window.hideAllScreens = function() {
        if(screenForm) screenForm.classList.remove('active');
        if(screenPending) screenPending.classList.remove('active');
        if(screenFinished) screenFinished.classList.remove('active');

        if(btnPendentes) btnPendentes.classList.remove('active');
        if(btnFinalizados) btnFinalizados.classList.remove('active');
    }

    function showForm() {
        window.hideAllScreens();
        if(screenForm) screenForm.classList.add('active');
    }

    if (btnPendentes) btnPendentes.addEventListener('click', window.showPending);
    if (btnFinalizados) btnFinalizados.addEventListener('click', window.showFinished);
    if (titleLink) {
        titleLink.style.cursor = 'pointer';
        titleLink.addEventListener('click', showForm);
    }

    if (btnBackPending) btnBackPending.addEventListener('click', showForm);
    if (btnBackFinished) btnBackFinished.addEventListener('click', showForm);

    showForm();
}

// =================================================================
// 7. INICIALIZAÇÃO
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    setDefaultDates();
    enableAddSobrasButton();
    initNavigation();

    // Listeners dos Modais
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if(detailsModal) detailsModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === detailsModal) {
            detailsModal.style.display = 'none';
        }
    });

    // Listeners do Modal de Confirmação são configurados na função customConfirm


    // Listeners de Data, Key e AddSobras
    if(dateStartDisplay && dateEndDisplay) {
        dateStartDisplay.addEventListener('input', handleManualInput);
        dateEndDisplay.addEventListener('input', handleManualInput);
        dateStartNative.addEventListener('change', handleNativeChange);
        dateEndNative.addEventListener('change', handleNativeChange);
        dateStartDisplay.addEventListener('click', () => handleDisplayClick(dateStartNative));
        dateEndDisplay.addEventListener('click', () => handleDisplayClick(dateEndNative));
    }
    if (btnGenerateKey) btnGenerateKey.addEventListener('click', handleGenerateKeyClick);
    if (btnAddSobras) btnAddSobras.addEventListener('click', handleAddSobras);
});