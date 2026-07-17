/* =============================================================
   Neo Copilot — ChatController
   Bússola: chat com RAG-simplificado (texto do doc no system prompt).
   Debounce no input, typing indicator e histórico limitado.
   ============================================================= */
class ChatController {
  constructor(aiClient) {
    this.ai = aiClient;
    this.panel = document.getElementById('chat-panel');
    this.messagesEl = document.getElementById('chat-messages');
    this.form = document.getElementById('chat-form');
    this.input = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send');
    this.contextEl = document.getElementById('chat-context');
    this.fab = document.getElementById('fab-chat');
    this.closeBtn = document.getElementById('chat-close');

    this.doc = null;      // { text, name }
    this.history = [];    // [{role, content}]
    this._sending = false;
    this._debounceTimer = null;

    this.fab.addEventListener('click', () => this.toggle(true));
    this.closeBtn.addEventListener('click', () => this.toggle(false));
    this.form.addEventListener('submit', (e) => this._onSubmit(e));
    this.input.addEventListener('input', () => this._onInputChange());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.form.requestSubmit();
      }
    });

    // Mensagem inicial: a Bússola sabe falar sobre o produto mesmo sem doc.
    this._greet();
  }

  _greet() {
    this.contextEl.textContent = 'Modo produto · pergunte sobre o Neo Copilot';
    this._appendSystem('Bússola pronta. Pergunte sobre o Neo Copilot ou carregue um PDF para eu ajudar com o conteúdo dele.');
  }

  toggle(force) {
    const willShow = force != null ? force : this.panel.hidden;
    this.panel.hidden = !willShow;
    if (willShow) this.input.focus();
  }

  setDocument(doc) {
    this.doc = doc;
    this.history = [];
    DOMUtil.clear(this.messagesEl);
    if (doc) {
      this.contextEl.textContent = `Ancorado em: ${this._coordsFrom(doc.name)}`;
      this._appendSystem(`Bússola calibrada. Pergunte sobre "${doc.name}" ou sobre o próprio Neo Copilot.`);
    } else {
      this._greet();
    }
    this._refreshSendState();
  }

  _coordsFrom(name) {
    const clean = (name || '').replace(/\s+/g, '_').toUpperCase();
    return `01.A · ${clean}`;
  }

  _onInputChange() {
    // Debounce apenas para refresh do botão (evita loop custoso)
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._refreshSendState(), 120);
    // Auto-grow
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
  }

  _refreshSendState() {
    // Habilita o envio se houver texto — o chat funciona mesmo sem documento
    // (nesse caso responde só sobre o produto Neo Copilot).
    const hasText = this.input.value.trim().length > 0;
    this.sendBtn.disabled = !(hasText && !this._sending);
  }

  async _onSubmit(e) {
    e.preventDefault();
    const text = this.input.value.trim();
    if (!text || this._sending) return;

    this._sending = true;
    this._refreshSendState();
    this._appendMsg('user', text);
    this.history.push({ role: 'user', content: text });
    this.input.value = '';
    this.input.style.height = 'auto';

    const typingEl = this._appendTyping();

    try {
      const docText = this.doc?.text || '';
      const docName = this.doc?.name || '';
      const answer = await this.ai.chat(docText, docName, this.history.slice(0, -1), text);
      typingEl.remove();
      this._appendMsg('assistant', answer);
      this.history.push({ role: 'assistant', content: answer });
    } catch (err) {
      typingEl.remove();
      this._appendMsg('error', err.message || 'Falha ao consultar a IA.');
    } finally {
      this._sending = false;
      this._refreshSendState();
    }
  }

  _appendMsg(role, text) {
    const cls = role === 'user' ? 'msg user'
              : role === 'error' ? 'msg assistant error'
              : 'msg assistant';
    const el = DOMUtil.el('div', { class: cls });

    if (role === 'assistant') {
      // Renderiza Markdown (parágrafos, listas, negrito, itálico, código, links, fonte)
      DOMUtil.renderMarkdown(String(text), el);
    } else {
      // User e error: texto puro (preservando quebras naturais)
      String(text).split(/\n{2,}/).forEach((para, i) => {
        if (i > 0) el.appendChild(DOMUtil.el('br'));
        el.appendChild(document.createTextNode(para));
      });
    }

    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return el;
  }

  _appendSystem(text) {
    const el = DOMUtil.el('div', { class: 'msg system', text });
    this.messagesEl.appendChild(el);
    return el;
  }

  _appendTyping() {
    const el = DOMUtil.el('div', { class: 'msg assistant' });
    const t = DOMUtil.el('div', { class: 'typing' });
    t.appendChild(DOMUtil.el('span'));
    t.appendChild(DOMUtil.el('span'));
    t.appendChild(DOMUtil.el('span'));
    el.appendChild(t);
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
    return el;
  }
}
