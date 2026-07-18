/* =============================================================
   Neo Copilot — App (bootstrap)
   Orquestra os módulos, bind de eventos e o fluxo completo:
   upload → extração → chamada IA → renderização + chat.
   ============================================================= */
class App {
  constructor() {
    this.pipeline = new Pipeline();
    this.extractor = new PDFExtractor();
    this.ai = new AIClient();
    this.ui = new UIRenderer();
    this.chat = new ChatController(this.ai);

    // Elementos
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.docCard = document.getElementById('doc-card');
    this.docName = document.getElementById('doc-name');
    this.docMeta = document.getElementById('doc-meta');
    this.docCoord = document.getElementById('doc-coord');
    this.docBadge = document.getElementById('doc-badge');
    this.docFileList = document.getElementById('doc-file-list');
    this.dropzoneCard = document.getElementById('dropzone-card');

    this._bindEvents();
    this._promptForKeyIfMissing();
  }

  _bindEvents() {
    // Dropzone
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault(); this.dropzone.classList.add('drag-over');
    });
    this.dropzone.addEventListener('dragleave', () => this.dropzone.classList.remove('drag-over'));
    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault(); this.dropzone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      if (files.length) this._handleFiles(files);
    });
    this.dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.fileInput.click(); }
    });
    this.fileInput.addEventListener('change', () => {
      const files = Array.from(this.fileInput.files || []);
      if (files.length) this._handleFiles(files);
    });

    // Trocar / novo
    document.getElementById('btn-swap-doc').addEventListener('click', () => this._resetForNew());
    document.getElementById('btn-new-doc').addEventListener('click', () => this.fileInput.click());
    document.getElementById('error-retry').addEventListener('click', () => this._resetForNew());

    // Settings modal
    const backdrop = document.getElementById('modal-backdrop');
    const openBtn = document.getElementById('btn-settings');
    const cancelBtn = document.getElementById('modal-cancel');
    const saveBtn = document.getElementById('modal-save');
    const keyInput = document.getElementById('input-api-key');
    
    // Inputs de configuração de ativos
    const faqInput = document.getElementById('input-faq-count');
    const flashcardInput = document.getElementById('input-flashcard-count');
    const quizInput = document.getElementById('input-quiz-count');
    const faqDisplay = document.getElementById('faq-count-display');
    const flashcardDisplay = document.getElementById('flashcard-count-display');
    const quizDisplay = document.getElementById('quiz-count-display');

    const openModal = () => {
      keyInput.value = ApiKeyStore.get();
      faqInput.value = AssetsSettings.faqCount;
      flashcardInput.value = AssetsSettings.flashcardCount;
      quizInput.value = AssetsSettings.quizCount;
      _updateAssetDisplays();
      backdrop.classList.add('visible');
      setTimeout(() => keyInput.focus(), 60);
    };
    
    const _updateAssetDisplays = () => {
      faqDisplay.textContent = faqInput.value;
      flashcardDisplay.textContent = flashcardInput.value;
      quizDisplay.textContent = quizInput.value;
    };
    
    const closeModal = () => backdrop.classList.remove('visible');

    openBtn.addEventListener('click', openModal);
    cancelBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
    
    // Event listeners para atualizar displays em tempo real
    faqInput.addEventListener('input', _updateAssetDisplays);
    flashcardInput.addEventListener('input', _updateAssetDisplays);
    quizInput.addEventListener('input', _updateAssetDisplays);
    
    saveBtn.addEventListener('click', () => {
      const val = keyInput.value.trim();
      // Google Gemini API keys aceitam múltiplos formatos:
      //  - Legacy Google API key: começa com "AIzaSy..." (~39 chars)
      //  - Novo formato AI Studio (2026+): começa com "AQ.Ab..." (~200+ chars)
      // Não validamos mais o prefixo — a própria API rejeita chaves malformadas.
      if (val && val.length < 20) {
        DOMUtil.toast('Chave muito curta — verifique se copiou o valor completo.');
      }
      if (val) ApiKeyStore.set(val); else ApiKeyStore.clear();
      
      // Salvar configurações de ativos
      AssetsSettings.setFaqCount(faqInput.value);
      AssetsSettings.setFlashcardCount(flashcardInput.value);
      AssetsSettings.setQuizCount(quizInput.value);
      
      closeModal();
      DOMUtil.toast((val ? 'Chave e ' : '') + 'configurações salvas.');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('visible')) closeModal();
    });

    // Tab switching logic
    const tabs = document.querySelectorAll('.modal-tab');
    const panes = document.querySelectorAll('.modal-pane');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        
        // Remove active from all tabs and panes
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        
        // Add active to clicked tab and corresponding pane
        tab.classList.add('active');
        document.querySelector(`[data-pane="${targetTab}"]`).classList.add('active');
      });
    });

    this._openModal = openModal;
  }

  _promptForKeyIfMissing() {
    // Não força modal — mostra toast educativo. O usuário abre via botão Configurações.
    if (!ApiKeyStore.exists()) {
      setTimeout(() => DOMUtil.toast('Configure sua chave Google Gemini em "Configurações" para começar.'), 600);
    }
  }

  _resetForNew() {
    this.fileInput.value = '';
    this.docCard.hidden = true;
    this.dropzoneCard.hidden = false;
    this.pipeline.hide();
    this.pipeline.reset();
    this.pipeline.hideError();
    this.ui.reset();
    this.chat.setDocument(null);
    DOMUtil.clear(this.docFileList);
    this.docFileList.hidden = true;
  }

  async _handleFiles(files) {
    // Validações rápidas antes de qualquer trabalho pesado
    if (!ApiKeyStore.exists()) {
      DOMUtil.toast('Adicione sua chave Google Gemini antes de enviar documentos.');
      this._openModal();
      return;
    }
    if (!files || files.length === 0) return;

    const multi = files.length > 1;

    // Reset UI
    this.dropzoneCard.hidden = true;
    this.docCard.hidden = false;
    this.pipeline.show();
    this.pipeline.reset();
    this.ui.reset();
    this.chat.setDocument(null);
    DOMUtil.clear(this.docFileList);

    // Doc card meta — modo único ou múltiplo
    if (multi) {
      this.docName.textContent = `${files.length} documentos`;
      this.docCoord.textContent = `01.A · ${files.length} DOCS`;
      this.docFileList.hidden = false;
      // Preenche a lista com placeholders (atualiza conforme extrai)
      files.forEach((f) => {
        const li = DOMUtil.el('li');
        li.appendChild(DOMUtil.el('span', { class: 'file-name', text: f.name }));
        li.appendChild(DOMUtil.el('span', { class: 'file-info', text: '…' }));
        this.docFileList.appendChild(li);
      });
    } else {
      this.docName.textContent = files[0].name;
      this.docCoord.textContent = `01.A · ${files[0].name.toUpperCase().replace(/\s+/g, '_')}`;
      this.docFileList.hidden = true;
    }
    DOMUtil.clear(this.docMeta);
    const totalKb = Math.round(files.reduce((s, f) => s + f.size, 0) / 1024);
    this.docMeta.appendChild(DOMUtil.el('span', { text: `${totalKb.toLocaleString('pt-BR')} KB` }));
    this.docMeta.appendChild(DOMUtil.el('span', { text: '·' }));
    const pageMeta = DOMUtil.el('span', { text: '— páginas' });
    this.docMeta.appendChild(pageMeta);
    this.docBadge.textContent = 'Novo';
    this.docBadge.className = 'badge teal';

    // Pipeline: leitura + extração
    this.pipeline.setActive('read');
    try {
      this.pipeline.setActive('extract');

      // Callback de progresso — atualiza a lista quando estamos em multi-doc
      const onProgress = ({ fileIndex, fileCount, fileName, page, pageCount }) => {
        if (multi) {
          pageMeta.textContent = `doc ${fileIndex}/${fileCount} · pág ${page}/${pageCount}`;
          const li = this.docFileList.children[fileIndex - 1];
          if (li) li.querySelector('.file-info').textContent = `${page}/${pageCount}`;
        } else {
          pageMeta.textContent = `página ${page} de ${pageCount}`;
        }
      };

      const extracted = await this.extractor.extractMany(files, onProgress);

      // Atualiza a lista com resultado final (sucesso ou erro por arquivo)
      if (multi) {
        DOMUtil.clear(this.docFileList);
        extracted.files.forEach((f) => {
          const li = DOMUtil.el('li', { class: f.error ? 'file-error' : '' });
          li.appendChild(DOMUtil.el('span', { class: 'file-name', text: f.name }));
          li.appendChild(DOMUtil.el('span', {
            class: 'file-info',
            text: f.error ? 'falhou' : `${f.pages}p`,
          }));
          this.docFileList.appendChild(li);
        });
      }

      pageMeta.textContent = multi
        ? `${extracted.files.filter(f => !f.error).length} de ${files.length} docs · ${extracted.totalPages} páginas`
        : `${extracted.totalPages} páginas`;

      this.pipeline.setDone('read');
      this.pipeline.setDone('extract');

      // Interpretação + geração (uma chamada IA)
      this.pipeline.setActive('interpret');
      await new Promise(r => setTimeout(r, 350));
      this.pipeline.setActive('generate');

      const { json: assets, truncated } = await this.ai.generateAssets(extracted.combinedText);

      this.pipeline.setDone('interpret');
      this.pipeline.setDone('generate');

      // Render + chat
      this.ui.render(assets);
      const chatName = multi ? `${files.length} documentos` : files[0].name;
      this.chat.setDocument({ text: extracted.combinedText, name: chatName });
      this.docBadge.textContent = 'Atualizado';
      this.docBadge.className = 'badge sage';

      // Toast contextualizado
      const successMsg = truncated
        ? 'Processado (texto truncado para caber no contexto).'
        : (extracted.errors.length
            ? `Processados ${extracted.files.filter(f => !f.error).length} de ${files.length} documentos (${extracted.errors.length} falha${extracted.errors.length>1?'s':''}).`
            : (multi
                ? `${files.length} documentos processados com sucesso.`
                : 'Documento processado com sucesso.'));
      DOMUtil.toast(successMsg);

    } catch (err) {
      // Marca a etapa ativa como erro
      const active = document.querySelector('.step.active');
      if (active) this.pipeline.setError(active.dataset.step);
      this.pipeline.showError(
        multi ? 'Não foi possível processar os documentos' : 'Não foi possível processar o documento',
        err.message || String(err)
      );
    }
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  // Segurança: garante que PDF.js carregou
  if (!window.pdfjsLib) {
    console.warn('PDF.js não disponível.');
  }
  window.__NeoCopilot = new App();

  // Registro do Service Worker (PWA). Só faz sentido em http/https, não em file://.
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    // Delay leve para não competir com o load principal.
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        console.info('[Neo Copilot] Service Worker registrado com escopo:', reg.scope);
      }).catch((err) => {
        console.warn('[Neo Copilot] Falha ao registrar Service Worker:', err);
      });
    });
  }
});
