/* =============================================================
   Neo Copilot — DOMUtil
   Sanitização segura (nunca innerHTML com dados não confiáveis),
   helpers de criação de elementos, toast e live region.
   ============================================================= */
const DOMUtil = {
  /** Cria um elemento e injeta apenas via textContent — nunca innerHTML com dados não confiáveis. */
  el(tag, opts = {}) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    if (opts.children) for (const c of opts.children) node.appendChild(c);
    return node;
  },
  clear(node) { while (node.firstChild) node.removeChild(node.firstChild); },
  show(node) { node.hidden = false; },
  hide(node) { node.hidden = true; },
  toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('visible'), 3200);
  },
  liveStatus(msg) { document.getElementById('live-status').textContent = msg; },

  /**
   * Renderiza um subset seguro de Markdown dentro de `container`.
   * Suporta: parágrafos, listas (bullet e numerada), headings (#, ##, ###),
   * negrito (**), itálico (*), inline code (`), links [texto](url) e a
   * citação de fonte no formato [Fonte: xxx] no final (renderizada como badge).
   *
   * Segurança: NUNCA usa innerHTML. Cada nó é criado com createElement e o
   * conteúdo textual é sempre injetado via textContent. URLs de links são
   * validadas — só http(s) e mailto passam; outras viram texto puro.
   */
  renderMarkdown(text, container) {
    // 1) Extrai a citação de fonte no final para renderizar como badge
    let source = null;
    const srcMatch = String(text).match(/\[Fonte:\s*([^\]]+)\]\s*$/i);
    let body = String(text);
    if (srcMatch) {
      source = srcMatch[1].trim();
      body = body.slice(0, srcMatch.index).trim();
    }

    const lines = body.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }

      // Lista numerada — consome linhas consecutivas
      if (/^\s*\d+\.\s+/.test(line)) {
        const ol = document.createElement('ol');
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          const li = document.createElement('li');
          this._renderInline(lines[i].replace(/^\s*\d+\.\s+/, ''), li);
          ol.appendChild(li);
          i++;
        }
        container.appendChild(ol);
        continue;
      }

      // Lista com bullets
      if (/^\s*[-*]\s+/.test(line)) {
        const ul = document.createElement('ul');
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          const li = document.createElement('li');
          this._renderInline(lines[i].replace(/^\s*[-*]\s+/, ''), li);
          ul.appendChild(li);
          i++;
        }
        container.appendChild(ul);
        continue;
      }

      // Headings
      const h = line.match(/^(#{1,3})\s+(.+)/);
      if (h) {
        const tag = h[1].length === 1 ? 'h4' : h[1].length === 2 ? 'h5' : 'h6';
        const el = document.createElement(tag);
        this._renderInline(h[2], el);
        container.appendChild(el);
        i++; continue;
      }

      // Parágrafo: acumula linhas consecutivas até quebra ou início de outro bloco
      const paraLines = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].trim()
             && !/^\s*(\d+\.|[-*])\s+/.test(lines[j])
             && !/^#{1,3}\s+/.test(lines[j])) {
        paraLines.push(lines[j]);
        j++;
      }
      const p = document.createElement('p');
      paraLines.forEach((pl, k) => {
        if (k > 0) p.appendChild(document.createElement('br'));
        this._renderInline(pl, p);
      });
      container.appendChild(p);
      i = j;
    }

    // Fonte como badge no fim da mensagem
    if (source) {
      const cite = document.createElement('span');
      cite.className = 'msg-source';
      cite.textContent = source;
      container.appendChild(cite);
    }
  },

  /** Renderiza formatação inline de uma linha (bold, italic, code, link). */
  _renderInline(text, container) {
    // Captura tokens: **bold**, __bold__, *italic*, _italic_, `code`, [text](url)
    const pattern = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|\*[^*\n]+?\*|_[^_\n]+?_|`[^`\n]+?`|\[[^\]\n]+?\]\([^)\s]+?\))/g;
    const parts = String(text).split(pattern);
    for (const part of parts) {
      if (part === undefined || part === '') continue;
      let el;
      if (/^\*\*.+\*\*$/.test(part) || /^__.+__$/.test(part)) {
        el = document.createElement('strong');
        el.textContent = part.slice(2, -2);
      } else if (/^\*[^*].*\*$/.test(part)) {
        el = document.createElement('em');
        el.textContent = part.slice(1, -1);
      } else if (/^_[^_].*_$/.test(part)) {
        el = document.createElement('em');
        el.textContent = part.slice(1, -1);
      } else if (/^`.+`$/.test(part)) {
        el = document.createElement('code');
        el.textContent = part.slice(1, -1);
      } else if (/^\[.+\]\(.+\)$/.test(part)) {
        const m = part.match(/^\[(.+)\]\((.+)\)$/);
        const url = (m[2] || '').trim();
        // Sanitização: só protocolos seguros viram <a>; resto vira texto puro
        if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url)) {
          el = document.createElement('a');
          el.textContent = m[1];
          el.href = url;
          el.target = '_blank';
          el.rel = 'noopener noreferrer';
        } else {
          container.appendChild(document.createTextNode(part));
          continue;
        }
      } else {
        container.appendChild(document.createTextNode(part));
        continue;
      }
      container.appendChild(el);
    }
  },
};
