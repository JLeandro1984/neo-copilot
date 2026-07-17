/* =============================================================
   Neo Copilot — UIRenderer
   Renderiza dinamicamente o JSON da IA nas 5 abas principais.
   Só usa textContent/createElement — nunca innerHTML com dado da IA.
   ============================================================= */
class UIRenderer {
  constructor() {
    this.tabs = document.querySelectorAll('.tab');
    this.panels = document.querySelectorAll('.panel');
    this.tabs.forEach(t => t.addEventListener('click', () => this.selectTab(t.dataset.tab)));

    this.emptyResumo = document.getElementById('empty-resumo');
    this.contentResumo = document.getElementById('content-resumo');
    this.contentGlossario = document.getElementById('content-glossario');
    this.contentFaq = document.getElementById('content-faq');
    this.contentFlashcards = document.getElementById('content-flashcards');
    this.contentQuiz = document.getElementById('content-quiz');

    this.cntGloss = document.getElementById('cnt-glossario');
    this.cntFaq = document.getElementById('cnt-faq');
    this.cntFc = document.getElementById('cnt-flashcards');
    this.cntQuiz = document.getElementById('cnt-quiz');
    this.hintGloss = document.getElementById('hint-glossario');
  }

  selectTab(name) {
    this.tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    this.panels.forEach(p => {
      const on = p.dataset.panel === name;
      p.classList.toggle('active', on);
      p.hidden = !on;
    });
  }

  reset() {
    this.emptyResumo.style.display = '';
    this.contentResumo.hidden = true;
    DOMUtil.clear(this.contentResumo);
    DOMUtil.clear(this.contentGlossario);
    DOMUtil.clear(this.contentFaq);
    DOMUtil.clear(this.contentFlashcards);
    DOMUtil.clear(this.contentQuiz);
    document.getElementById('quiz-score').style.display = 'none';
    this.cntGloss.textContent = '0';
    this.cntFaq.textContent = '0';
    this.cntFc.textContent = '0';
    this.cntQuiz.textContent = '0';
    this.selectTab('resumo');
  }

  render(assets) {
    this.emptyResumo.style.display = 'none';
    this.contentResumo.hidden = false;

    this._renderResumo(assets);
    this._renderGlossario(assets.glossario || []);
    this._renderFaq(assets.faq || []);
    this._renderFlashcards(assets.flashcards || []);
    this._renderQuiz(assets.quiz || []);
  }

  _renderResumo(a) {
    const c = this.contentResumo;
    DOMUtil.clear(c);

    const title = DOMUtil.el('h2', { class: 'section-title', text: a.titulo || 'Documento processado' });
    title.style.marginBottom = '18px';
    c.appendChild(title);

    const b1 = DOMUtil.el('div', { class: 'resumo-block' });
    b1.appendChild(DOMUtil.el('h3', { text: 'Resumo Executivo' }));
    b1.appendChild(DOMUtil.el('p', { text: a.resumo_executivo }));
    c.appendChild(b1);

    const b2 = DOMUtil.el('div', { class: 'resumo-block' });
    b2.appendChild(DOMUtil.el('h3', { text: 'Resumo Técnico' }));
    b2.appendChild(DOMUtil.el('p', { text: a.resumo_tecnico }));
    c.appendChild(b2);

    if (Array.isArray(a.topicos_chave) && a.topicos_chave.length) {
      const b3 = DOMUtil.el('div', { class: 'resumo-block' });
      b3.appendChild(DOMUtil.el('h3', { text: 'Tópicos-chave' }));
      const ul = DOMUtil.el('ul');
      a.topicos_chave.forEach(t => ul.appendChild(DOMUtil.el('li', { text: String(t) })));
      b3.appendChild(ul);
      c.appendChild(b3);
    }
  }

  _renderGlossario(items) {
    DOMUtil.clear(this.contentGlossario);
    this.cntGloss.textContent = String(items.length);
    this.hintGloss.textContent = `${items.length} termo${items.length===1?'':'s'} identificado${items.length===1?'':'s'}`;
    items.forEach(({ termo, definicao }) => {
      const card = DOMUtil.el('div', { class: 'glossary-item' });
      card.appendChild(DOMUtil.el('p', { class: 'glossary-term', text: termo || '—' }));
      card.appendChild(DOMUtil.el('p', { class: 'glossary-def', text: definicao || '—' }));
      this.contentGlossario.appendChild(card);
    });
  }

  _renderFaq(items) {
    DOMUtil.clear(this.contentFaq);
    this.cntFaq.textContent = String(items.length);
    items.forEach(({ pergunta, resposta }, i) => {
      const item = DOMUtil.el('div', { class: 'faq-item' });
      if (i === 0) item.setAttribute('open', 'open');

      const btn = DOMUtil.el('button', { class: 'faq-question', attrs: { type: 'button', 'aria-expanded': i === 0 ? 'true' : 'false' } });
      btn.appendChild(DOMUtil.el('span', { text: pergunta || '—' }));
      const chev = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      chev.setAttribute('class', 'faq-chevron');
      chev.setAttribute('viewBox', '0 0 24 24');
      chev.setAttribute('fill', 'none');
      chev.setAttribute('stroke', 'currentColor');
      chev.setAttribute('stroke-width', '2');
      chev.setAttribute('stroke-linecap', 'round');
      chev.setAttribute('stroke-linejoin', 'round');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      path.setAttribute('points', '6 9 12 15 18 9');
      chev.appendChild(path);
      btn.appendChild(chev);

      const ans = DOMUtil.el('p', { class: 'faq-answer', text: resposta || '—' });
      btn.addEventListener('click', () => {
        const isOpen = item.hasAttribute('open');
        if (isOpen) item.removeAttribute('open'); else item.setAttribute('open', 'open');
        btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });

      item.appendChild(btn);
      item.appendChild(ans);
      this.contentFaq.appendChild(item);
    });
  }

  _renderFlashcards(items) {
    DOMUtil.clear(this.contentFlashcards);
    this.cntFc.textContent = String(items.length);
    items.forEach(({ frente, verso }, i) => {
      const card = DOMUtil.el('div', { class: 'flashcard', attrs: { role: 'button', tabindex: '0', 'aria-label': `Flashcard ${i+1}: clique para virar` } });
      const inner = DOMUtil.el('div', { class: 'flashcard-inner' });

      const front = DOMUtil.el('div', { class: 'flashcard-face flashcard-front' });
      front.appendChild(DOMUtil.el('div', { class: 'flashcard-index', text: String(i + 1).padStart(2, '0') + ' · frente' }));
      front.appendChild(DOMUtil.el('div', { class: 'flashcard-body', text: frente || '—' }));
      front.appendChild(DOMUtil.el('div', { class: 'flashcard-flip-hint', text: 'clique · virar' }));

      const back = DOMUtil.el('div', { class: 'flashcard-face flashcard-back' });
      back.appendChild(DOMUtil.el('div', { class: 'flashcard-index', text: String(i + 1).padStart(2, '0') + ' · verso' }));
      back.appendChild(DOMUtil.el('div', { class: 'flashcard-body', text: verso || '—' }));
      back.appendChild(DOMUtil.el('div', { class: 'flashcard-flip-hint', text: 'clique · voltar' }));

      inner.appendChild(front);
      inner.appendChild(back);
      card.appendChild(inner);

      const toggle = () => card.classList.toggle('flipped');
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

      this.contentFlashcards.appendChild(card);
    });
  }

  _renderQuiz(items) {
    DOMUtil.clear(this.contentQuiz);
    this.cntQuiz.textContent = String(items.length);
    document.getElementById('quiz-score').style.display = 'none';

    const state = { answered: 0, correct: 0, total: items.length };

    items.forEach((q, qi) => {
      const wrap = DOMUtil.el('div', { class: 'quiz-item' });
      const head = DOMUtil.el('div', { class: 'quiz-question' });
      head.appendChild(DOMUtil.el('span', { class: 'quiz-number', text: String(qi + 1).padStart(2, '0') + '.' }));
      head.appendChild(DOMUtil.el('span', { text: q.pergunta || '—' }));
      wrap.appendChild(head);

      const opts = DOMUtil.el('div', { class: 'quiz-options' });
      const letters = ['A', 'B', 'C', 'D'];
      const buttons = [];
      (q.alternativas || []).forEach((alt, i) => {
        const b = DOMUtil.el('button', { class: 'quiz-option', attrs: { type: 'button' } });
        b.appendChild(DOMUtil.el('span', { class: 'letter', text: letters[i] || String(i+1) }));
        b.appendChild(DOMUtil.el('span', { text: String(alt) }));
        buttons.push(b);
        opts.appendChild(b);
      });
      wrap.appendChild(opts);

      const feedback = DOMUtil.el('div', { class: 'quiz-feedback', text: q.explicacao || '' });
      wrap.appendChild(feedback);

      buttons.forEach((b, i) => {
        b.addEventListener('click', () => {
          if (b.disabled) return;
          buttons.forEach(x => x.disabled = true);
          const isCorrect = i === q.gabarito;
          if (isCorrect) { b.classList.add('correct'); state.correct++; }
          else {
            b.classList.add('wrong');
            buttons[q.gabarito]?.classList.add('correct');
          }
          feedback.classList.add('visible');
          state.answered++;
          if (state.answered === state.total) {
            const scoreEl = document.getElementById('quiz-score');
            scoreEl.style.display = 'block';
            document.getElementById('quiz-score-value').textContent =
              `${state.correct} / ${state.total} (${Math.round(state.correct*100/state.total)}%)`;
          }
        });
      });

      this.contentQuiz.appendChild(wrap);
    });
  }
}
