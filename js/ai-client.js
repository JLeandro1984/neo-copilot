/* =============================================================
   Neo Copilot — AIClient
   Chamada real à API Google Gemini (gemini-2.5-flash).
   Usa responseMimeType=application/json para forçar JSON estruturado.
   Parsing defensivo + validação mínima de schema para nunca quebrar a UI.

   SEGURANÇA: em produção, esta chamada deve sair de um BACKEND
   PROXY. Nunca expor a chave no navegador. Aqui, o usuário informa
   a chave via modal (sessionStorage) apenas para fins do protótipo.
   ============================================================= */
class AIClient {
  constructor() {
    this.systemForAssets = this._buildAssetsPrompt();
  }

  _buildAssetsPrompt() {
    return [
      'Você é o motor cognitivo do Neo Copilot, uma plataforma corporativa de gestão de conhecimento.',
      'Sua tarefa é transformar o conteúdo de UM documento corporativo em ativos de aprendizado estruturados.',
      'REGRAS ABSOLUTAS:',
      '1. Baseie-se EXCLUSIVAMENTE no texto fornecido. Nunca invente fatos ausentes.',
      '2. Responda SEMPRE em português do Brasil, tom profissional e claro.',
      '3. Retorne APENAS um objeto JSON válido, sem texto antes ou depois, sem cercas de código.',
      '4. Siga rigorosamente o schema abaixo. Todos os campos são obrigatórios.',
      '',
      'SCHEMA:',
      '{',
      '  "titulo": "string curta que resume o documento",',
      '  "resumo_executivo": "3 a 5 frases para diretoria, focadas em valor de negócio",',
      '  "resumo_tecnico": "6 a 10 frases com maior profundidade técnica/procedural",',
      '  "topicos_chave": ["6 a 10 bullets objetivos com os principais pontos"],',
      '  "glossario": [ { "termo": "string", "definicao": "string curta e precisa" } ],  // 6 a 12 itens',
      '  "faq": [ { "pergunta": "string", "resposta": "string" } ],  // 5 a 8 itens',
      '  "flashcards": [ { "frente": "conceito/termo/pergunta curta", "verso": "definição/resposta" } ],  // exatamente 8 itens',
      '  "quiz": [',
      '    {',
      '      "pergunta": "string",',
      '      "alternativas": ["A", "B", "C", "D"],  // exatamente 4',
      '      "gabarito": 0,  // índice 0..3',
      '      "explicacao": "por que essa é correta, curta"',
      '    }',
      '  ]  // exatamente 5 questões',
      '}',
    ].join('\n');
  }

  _endpoint(model) {
    const key = ApiKeyStore.get();
    if (!key) throw new Error('Chave da API não configurada. Clique em Configurações para adicionar sua chave Google Gemini.');
    // A chave viaja como query-param — padrão da Generative Language API.
    return `${Config.API_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`;
  }

  async _post(body) {
    // Tenta modelo primário; se retornar 404 (modelo indisponível), tenta os fallbacks.
    const candidates = [Config.MODEL, ...(Config.MODEL_FALLBACKS || [])];
    let lastErr;
    for (const model of candidates) {
      let res;
      try {
        res = await fetch(this._endpoint(model), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (netErr) {
        throw new Error('Falha de rede ao chamar a API. Verifique sua conexão.');
      }
      if (res.ok) {
        // Guarda qual modelo funcionou para diagnóstico (opcional)
        this._activeModel = model;
        return res.json();
      }
      let detail = '';
      try {
        const err = await res.json();
        detail = err?.error?.message || JSON.stringify(err);
      } catch { detail = await res.text(); }

      // 404 = modelo indisponível → tenta próximo da lista
      if (res.status === 404) {
        lastErr = new Error(`Modelo "${model}" indisponível: ${detail.slice(0, 200)}`);
        continue;
      }
      // Outros erros são definitivos (chave inválida, rate limit, etc.)
      if (res.status === 400 && /API key/i.test(detail)) throw new Error('Chave da API inválida.');
      if (res.status === 401 || res.status === 403) throw new Error('Chave da API inválida ou sem permissão para este modelo.');
      if (res.status === 429) throw new Error('Limite de requisições excedido (tier gratuito). Aguarde alguns segundos.');
      throw new Error(`API Gemini retornou ${res.status}: ${detail.slice(0, 260)}`);
    }
    throw lastErr || new Error('Nenhum modelo Gemini disponível para esta chave.');
  }

  /** Gera todos os ativos a partir do texto do documento. */
  async generateAssets(docText) {
    const truncated = docText.length > Config.MAX_DOC_CHARS;
    const payloadText = truncated ? docText.slice(0, Config.MAX_DOC_CHARS) : docText;

    const userMsg =
      (truncated ? '[NOTA: documento truncado nos primeiros ~120k caracteres para caber no contexto.]\n\n' : '') +
      'DOCUMENTO:\n"""\n' + payloadText + '\n"""\n\nGere o JSON conforme o schema.';

    const body = {
      systemInstruction: { parts: [{ text: this.systemForAssets }] },
      contents: [{ role: 'user', parts: [{ text: userMsg }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
        // Força a resposta a ser JSON válido — feature nativa do Gemini.
        responseMimeType: 'application/json',
      },
    };
    const data = await this._post(body);
    const raw = this._extractText(data);
    const json = this._safeParseJSON(raw);
    this._validateAssetsSchema(json);
    return { json, truncated };
  }

  /**
   * Chat RAG-simplificado + conhecimento do produto.
   * A Bússola opera em dois níveis:
   *   1. PRODUTO — sabe sempre sobre o Neo Copilot (via ProductKnowledge).
   *   2. DOCUMENTOS — sabe sobre PDFs carregados (se houver).
   * `docText` pode ser vazio → chat funciona só sobre o produto.
   * `docName` pode ser um único nome ou uma string agregada (ex: "3 documentos").
   */
  async chat(docText, docName, history, userMessage) {
    const hasDoc = !!(docText && docText.trim().length > 0);
    const truncated = hasDoc && docText.length > Config.MAX_DOC_CHARS;
    const context = hasDoc ? (truncated ? docText.slice(0, Config.MAX_DOC_CHARS) : docText) : '';
    // Se o texto tem separadores multi-doc, ajusta o prompt para citar fonte por arquivo.
    const isMulti = hasDoc && /=====\s*\[DOCUMENTO:/i.test(context);

    const systemText = [
      'Você é a "Bússola", assistente do Neo Copilot para navegação em documentos corporativos.',
      'Você conhece DOIS níveis de informação e deve tratá-los com regras distintas:',
      '',
      '=== NÍVEL 1: PRODUTO NEO COPILOT ===',
      'Você sempre sabe o que é o Neo Copilot, como usar a plataforma, quais são as',
      'funcionalidades, o público-alvo e as limitações. Essa base está abaixo em',
      '"INFORMAÇÕES DO PRODUTO". Ao responder sobre o Neo Copilot em si (o que é,',
      'como usar, como funciona, quais features tem, como testar, roadmap, etc.),',
      'use APENAS essa base e cite ao final: [Fonte: Neo Copilot]',
      '',
      '=== NÍVEL 2: DOCUMENTO(S) CARREGADO(S) PELO USUÁRIO ===',
      hasDoc
        ? (isMulti
            ? 'Há MÚLTIPLOS documentos carregados, separados por linhas "===== [DOCUMENTO: nome.pdf] =====". Ao responder sobre o conteúdo desses documentos, use APENAS esse conteúdo e cite [Fonte: nome-do-arquivo.pdf]. Se vier de mais de um, cite todos.'
            : `Um documento foi carregado: "${docName}". Ao responder sobre o conteúdo dele, use APENAS o texto abaixo em "CONTEÚDO DO DOCUMENTO" e cite [Fonte: ${docName}]`)
        : 'Nenhum documento foi carregado ainda. Se o usuário perguntar sobre um documento específico, oriente-o a arrastar um PDF para a dropzone ou clicar em "Novo documento" no topo.',
      '',
      '=== REGRAS GERAIS ===',
      '1. NÃO misture os níveis: se a pergunta é sobre o produto, não invente coisas',
      '   do documento; se é sobre o documento, não invente features do produto.',
      '2. Se a resposta não está em NENHUM dos dois níveis, diga isso explicitamente',
      '   e sugira reformular ou carregar o documento correto.',
      '3. Sempre em português do Brasil, resposta objetiva (máx. ~6 frases).',
      '4. Nunca invente números, datas, nomes, valores, políticas ou procedimentos.',
      '5. Sempre termine com a citação de fonte entre colchetes.',
      '',
      '========================================',
      'INFORMAÇÕES DO PRODUTO NEO COPILOT',
      '========================================',
      ProductKnowledge.content,
      '',
      '========================================',
      'CONTEÚDO DO(S) DOCUMENTO(S) CARREGADO(S)',
      '========================================',
      hasDoc ? '"""\n' + context + '\n"""' : '(nenhum documento carregado)',
    ].join('\n');

    // Mantém últimas N interações para custo/latência
    const trimmed = history.slice(-Config.MAX_CHAT_HISTORY * 2);
    // Gemini usa role "model" (não "assistant") e estrutura parts[].
    const contents = [
      ...trimmed.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const body = {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };
    const data = await this._post(body);
    return this._extractText(data);
  }

  _extractText(data) {
    if (!data || !Array.isArray(data.candidates) || data.candidates.length === 0) {
      // Bloqueio por safety filter costuma trazer promptFeedback
      const blocked = data?.promptFeedback?.blockReason;
      if (blocked) throw new Error(`Resposta bloqueada por filtro de segurança (${blocked}).`);
      throw new Error('Resposta da IA em formato inesperado.');
    }
    const cand = data.candidates[0];
    if (cand.finishReason && cand.finishReason !== 'STOP' && cand.finishReason !== 'MAX_TOKENS') {
      throw new Error(`Geração interrompida (${cand.finishReason}).`);
    }
    const parts = cand.content?.parts || [];
    const text = parts.map(p => p.text || '').join('').trim();
    if (!text) throw new Error('IA retornou resposta vazia.');
    return text;
  }

  _safeParseJSON(raw) {
    // Tenta parse direto; se falhar, remove cercas ```json e busca primeiro objeto {...}
    const attempts = [
      raw,
      raw.replace(/^```(?:json)?/i, '').replace(/```$/,'').trim(),
    ];
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) attempts.push(match[0]);

    for (const candidate of attempts) {
      try { return JSON.parse(candidate); } catch { /* continua */ }
    }
    throw new Error('A IA retornou um formato que não conseguimos interpretar como JSON.');
  }

  _validateAssetsSchema(j) {
    const check = (cond, msg) => { if (!cond) throw new Error('Schema inválido: ' + msg); };
    check(j && typeof j === 'object', 'raiz não é objeto');
    check(typeof j.titulo === 'string', 'titulo ausente');
    check(typeof j.resumo_executivo === 'string', 'resumo_executivo ausente');
    check(typeof j.resumo_tecnico === 'string', 'resumo_tecnico ausente');
    check(Array.isArray(j.topicos_chave), 'topicos_chave não é lista');
    check(Array.isArray(j.glossario), 'glossario não é lista');
    check(Array.isArray(j.faq), 'faq não é lista');
    check(Array.isArray(j.flashcards) && j.flashcards.length > 0, 'flashcards ausente');
    check(Array.isArray(j.quiz) && j.quiz.length > 0, 'quiz ausente');
    for (const q of j.quiz) {
      check(Array.isArray(q.alternativas) && q.alternativas.length === 4, 'quiz.alternativas deve ter 4 itens');
      check(Number.isInteger(q.gabarito) && q.gabarito >= 0 && q.gabarito <= 3, 'quiz.gabarito fora do intervalo');
    }
  }
}
