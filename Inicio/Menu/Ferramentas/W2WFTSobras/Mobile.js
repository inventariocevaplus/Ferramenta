/*
 * Arquivo: Mobile.js
 * OBJETIVO: Lógica de Coleta Mobile - Sequenciamento de Locações, Câmera e Upload para Supabase.
 */

const SUPABASE_URL = 'https://wzvjgfubiodrjlycuiqa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6dmpnZnViaW9kcmpseWN1aXFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NzQwMDYsImV4cCI6MjA3ODQ1MDAwNn0.Dx1B-H93m8FH0NokBhJe8qWyGFHBGD18sEkv5zu_SMQ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET_NAME = 'w2w-sobras-images'; // Nome do seu bucket no Supabase Storage

// Variáveis de estado global
let currentKey = null;
let itemsToCollect = []; // Lista de itens (locações) para esta chave
let currentItemIndex = 0;
let photos = []; // Array para armazenar os objetos File da foto atual

// Mapeamento de DOM
const screens = {
    keyInput: document.getElementById('screen-key-input'),
    coleta: document.getElementById('screen-coleta'),
    success: document.getElementById('screen-success')
};
const inputChave = document.getElementById('input-chave');
const btnIniciarColeta = document.getElementById('btn-iniciar-coleta');
const keyErrorDiv = document.getElementById('key-error');

// Elementos de Informação
const coletaItemTitle = document.getElementById('coleta-item-title');
const infoContrato = document.getElementById('info-contrato');
const infoLocacao = document.getElementById('info-locacao');
const infoItem = document.getElementById('info-item');
const infoQuantidade = document.getElementById('info-quantidade');

// Elementos de Ação e Foto
const btnEnviarProxima = document.getElementById('btn-enviar-proxima');
const btnCapturePhoto = document.getElementById('btn-capture-photo');
const cameraInput = document.getElementById('camera-input');
const photoPreviewContainer = document.getElementById('photo-preview-container');
const photoCountSpan = document.getElementById('photo-count');
const btnCancelarColeta = document.getElementById('btn-cancelar-coleta');

// ===================================================
// FUNÇÕES DE NAVEGAÇÃO
// ===================================================

function switchScreen(activeScreen) {
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    if (activeScreen) activeScreen.classList.add('active');
}

// Retorna para a tela de input da chave
function resetToKeyInput() {
    currentKey = null;
    itemsToCollect = [];
    currentItemIndex = 0;
    photos = [];
    inputChave.value = '';
    keyErrorDiv.textContent = '';
    switchScreen(screens.keyInput);
}

// ===================================================
// FUNÇÕES DE BUSCA E INÍCIO DA COLETA
// ===================================================

async function startCollection(chave) {
    keyErrorDiv.textContent = 'Buscando chave...';

    // 1. Busca todos os itens pendentes para esta chave
    const { data, error } = await supabaseClient
        .from('w2w_sobras')
        .select(`id, nome_contrato, locacao, item, qtd`)
        .eq('chave', chave)
        .eq('status', 'Pendente') // Busca apenas itens pendentes (não coletados, não finalizados)
        .order('id', { ascending: true });

    if (error || data.length === 0) {
        keyErrorDiv.textContent = 'Erro ou Chave não encontrada, não pendente ou já coletada.';
        return;
    }

    currentKey = chave;
    itemsToCollect = data;
    currentItemIndex = 0;

    switchScreen(screens.coleta);
    loadCurrentItem();
}

function loadCurrentItem() {
    if (currentItemIndex >= itemsToCollect.length) {
        // Se todas as locações foram processadas, finaliza (embora a finalização ocorra no último submit)
        finalizeKey();
        return;
    }

    const item = itemsToCollect[currentItemIndex];
    const isLastItem = currentItemIndex === itemsToCollect.length - 1;

    // Atualiza o título e o botão
    coletaItemTitle.textContent = `Coleta (${currentItemIndex + 1} de ${itemsToCollect.length})`;
    btnEnviarProxima.textContent = isLastItem ? 'FINALIZAR COLETA' : 'ENVIAR & Próxima Locação';
    btnEnviarProxima.classList.toggle('finalizar', isLastItem);

    // Exibe as informações da locação
    infoContrato.textContent = item.nome_contrato;
    infoLocacao.textContent = item.locacao;
    infoItem.textContent = item.item;
    infoQuantidade.textContent = item.qtd;

    // Reseta as fotos para o novo item
    photos = [];
    updatePhotoPreview();

    // Habilita botões
    btnCapturePhoto.disabled = false;
    btnEnviarProxima.disabled = true; // Deve tirar pelo menos uma foto antes de enviar
}

// ===================================================
// FUNÇÕES DE FOTO E UPLOAD
// ===================================================

function updatePhotoPreview() {
    photoPreviewContainer.innerHTML = '';
    photoCountSpan.textContent = photos.length;
    btnCapturePhoto.disabled = photos.length >= 3;

    // Controla o botão Enviar: 1 foto é o mínimo
    btnEnviarProxima.disabled = photos.length === 0;

    photos.forEach((file, index) => {
        const url = URL.createObjectURL(file);
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';

        const img = document.createElement('img');
        img.src = url;
        img.className = 'photo-preview';

        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.style.position = 'absolute';
        removeBtn.style.top = '0px';
        removeBtn.style.right = '0px';
        removeBtn.style.background = '#E1261C';
        removeBtn.style.color = 'white';
        removeBtn.style.border = 'none';
        removeBtn.style.borderRadius = '50%';
        removeBtn.style.width = '20px';
        removeBtn.style.height = '20px';
        removeBtn.style.lineHeight = '1';
        removeBtn.style.padding = '0';
        removeBtn.style.cursor = 'pointer';

        removeBtn.onclick = () => {
            photos.splice(index, 1); // Remove do array
            updatePhotoPreview();
            URL.revokeObjectURL(url); // Libera o objeto URL
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        photoPreviewContainer.appendChild(wrapper);
    });
}

/**
 * Faz o upload de todas as fotos para o Storage e retorna os caminhos.
 * @param {number} itemId O ID da linha no banco de dados.
 * @returns {Array<string>} Array de caminhos de arquivos do Supabase.
 */
async function uploadPhotos(itemId) {
    const uploadedPaths = [];
    for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        // Nome do arquivo: CHAVE/ID_DO_ITEM_SEQUENCIA_TIMESTAMP.jpg
        const fileName = `${currentKey}/${itemId}_${i + 1}_${Date.now()}.jpg`;

        // 🚨 Adicionado conversão para Blob JPEG para garantir compatibilidade e tamanho
        const imageBlob = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    // Redimensiona para um tamanho razoável (ex: max 1280px largura)
                    const MAX_WIDTH = 1280;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converte para JPEG com qualidade 80%
                    canvas.toBlob(resolve, 'image/jpeg', 0.8);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });

        if (!imageBlob) {
            alert('Erro na compressão da imagem.');
            return uploadedPaths;
        }


        const { data, error } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .upload(fileName, imageBlob, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Erro ao fazer upload da foto:', error);
            alert(`Falha ao fazer upload da foto ${i + 1}. Tente novamente.`);
            return uploadedPaths;
        }
        uploadedPaths.push(data.path);
    }
    return uploadedPaths;
}

// ===================================================
// FUNÇÕES DE SUBMISSÃO E FINALIZAÇÃO
// ===================================================

async function submitItem() {
    if (photos.length === 0) {
        alert("Você deve tirar pelo menos uma foto para esta locação.");
        return;
    }

    btnEnviarProxima.disabled = true;
    btnCapturePhoto.disabled = true;
    btnEnviarProxima.textContent = 'Enviando...';

    const item = itemsToCollect[currentItemIndex];
    const itemId = item.id;

    // 1. Upload das fotos
    const photoPaths = await uploadPhotos(itemId);

    if (photoPaths.length !== photos.length) {
         // O upload falhou (erro já foi alertado dentro de uploadPhotos)
         btnEnviarProxima.disabled = false;
         btnCapturePhoto.disabled = false;
         btnEnviarProxima.textContent = 'Tentar Enviar Novamente';
         return;
    }

    // 2. Atualiza o registro no Supabase
    const isLastItem = currentItemIndex === itemsToCollect.length - 1;
    // O novo status é 'Coletado', a menos que seja o último item.
    const newStatus = isLastItem ? 'Finalizado' : 'Coletado';

    const { error } = await supabaseClient
        .from('w2w_sobras')
        .update({
            status: newStatus,
            foto_path_1: photoPaths[0] || null,
            foto_path_2: photoPaths[1] || null,
            foto_path_3: photoPaths[2] || null,
            data_coleta: new Date().toISOString()
            // ATENÇÃO: Se você precisar registrar quem coletou, você precisa de um login aqui!
            // nome_coletor: 'USUÁRIO_MOBILE'
        })
        .eq('id', itemId);

    if (error) {
        console.error('Erro ao atualizar o item no DB:', error);
        alert('Erro ao atualizar o banco de dados. Tente novamente.');
        btnEnviarProxima.disabled = false;
        btnCapturePhoto.disabled = false;
        btnEnviarProxima.textContent = isLastItem ? 'FINALIZAR COLETA' : 'ENVIAR & Próxima Locação';
        return;
    }

    // 3. Sucesso, avança para o próximo
    currentItemIndex++;
    if (isLastItem) {
        finalizeKey();
    } else {
        loadCurrentItem();
    }
}

function finalizeKey() {
    // Todos os itens foram processados e o último foi marcado como 'Finalizado'.
    switchScreen(screens.success);
}


// ===================================================
// EVENT LISTENERS E INICIALIZAÇÃO
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Tenta pegar a chave da URL
    const urlParams = new URLSearchParams(window.location.search);
    const keyFromUrl = urlParams.get('chave');

    if (keyFromUrl && keyFromUrl.length === 6) {
        inputChave.value = keyFromUrl;
        // Inicia coleta automaticamente, mas com pequeno delay para permitir renderização
        setTimeout(() => btnIniciarColeta.click(), 500);
    }

    // 2. Listener para o botão Iniciar Coleta
    if (btnIniciarColeta) {
        btnIniciarColeta.addEventListener('click', () => {
            const chave = inputChave.value.trim().toUpperCase();
            if (chave.length === 6 && /^\d+$/.test(chave)) {
                startCollection(chave);
            } else {
                keyErrorDiv.textContent = 'Chave inválida. Deve ter 6 dígitos numéricos.';
            }
        });
    }

    // 3. Listener para a Próxima/Finalizar
    if (btnEnviarProxima) {
        btnEnviarProxima.addEventListener('click', submitItem);
    }

    // 4. Listener para Tirar Foto (simula o clique no input de arquivo)
    if (btnCapturePhoto) {
        btnCapturePhoto.addEventListener('click', () => {
            if (photos.length < 3) {
                cameraInput.click();
            } else {
                alert('Você já atingiu o limite de 3 fotos para esta locação.');
            }
        });
    }

    // 5. Listener para o input de Câmera
    if (cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                // Adiciona apenas o primeiro arquivo capturado
                photos.push(files[0]);
                updatePhotoPreview();
                // Limpa o valor para que o evento 'change' dispare novamente na próxima foto
                cameraInput.value = '';
            }
        });
    }

    // 6. Listener para Cancelar Coleta
    if (btnCancelarColeta) {
        btnCancelarColeta.addEventListener('click', () => {
            if (confirm("Tem certeza que deseja cancelar e voltar para a tela inicial? O item atual não será salvo.")) {
                resetToKeyInput();
            }
        });
    }
});