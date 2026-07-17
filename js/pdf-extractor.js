/* =============================================================
   Neo Copilot — PDFExtractor
   Extrai texto real do PDF client-side com PDF.js.
   Trata: formato inválido, arquivo protegido/corrompido, PDF sem
   camada de texto (imagem escaneada) e limite de tamanho.
   ============================================================= */
class PDFExtractor {
  constructor() {
    // PDF.js worker (mesma versão do script principal, servido via CDN cdnjs)
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }
  /**
   * Extrai texto de um File PDF. Retorna { text, pages, byPage: [{page, text}] }.
   * Lança erro com mensagem amigável se falhar.
   */
  async extract(file, onProgress) {
    if (!window.pdfjsLib) throw new Error('Biblioteca PDF.js não carregou. Verifique sua conexão.');
    if (!file || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
      throw new Error('Formato inválido. Envie um arquivo .pdf.');
    }
    if (file.size > 30 * 1024 * 1024) {
      throw new Error('Arquivo muito grande (>30 MB). Reduza ou divida o documento.');
    }

    const buf = await file.arrayBuffer();
    let pdf;
    try {
      pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    } catch (err) {
      throw new Error('Não foi possível abrir o PDF — o arquivo pode estar corrompido ou protegido.');
    }

    const byPage = [];
    const allText = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map(i => (i.str || '')).join(' ').replace(/\s+/g, ' ').trim();
      byPage.push({ page: p, text });
      if (text) allText.push(text);
      if (onProgress) onProgress(p, pdf.numPages);
    }

    const joined = allText.join('\n\n');
    if (!joined || joined.length < 40) {
      throw new Error('Não foi possível extrair texto — o PDF parece ser uma imagem escaneada (sem camada de texto). Tente outro arquivo ou aplique OCR antes.');
    }

    return { text: joined, pages: pdf.numPages, byPage };
  }

  /**
   * Extrai texto de múltiplos PDFs em sequência.
   * Concatena com separadores explícitos que a IA vai usar para citar a fonte.
   * Se algum PDF falhar, esse é anotado em `errors` mas os outros seguem.
   * Retorna { combinedText, files: [{name, pages, textLength, error?}], totalPages, errors }.
   */
  async extractMany(files, onProgress) {
    if (!files || files.length === 0) throw new Error('Nenhum arquivo selecionado.');

    const results = [];
    const parts = [];
    const errors = [];
    let totalPages = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const onePageProgress = (p, total) => {
        if (onProgress) onProgress({
          fileIndex: i + 1,
          fileCount: files.length,
          fileName: file.name,
          page: p,
          pageCount: total,
        });
      };
      try {
        const one = await this.extract(file, onePageProgress);
        results.push({ name: file.name, pages: one.pages, textLength: one.text.length });
        totalPages += one.pages;
        // Separador explícito para a IA saber onde começa cada documento
        parts.push(`===== [DOCUMENTO: ${file.name}] =====\n\n${one.text}`);
      } catch (err) {
        results.push({ name: file.name, error: err.message || String(err) });
        errors.push({ name: file.name, message: err.message || String(err) });
      }
    }

    // Se nenhum arquivo pôde ser processado, joga o erro do primeiro
    if (parts.length === 0) {
      throw new Error(`Nenhum PDF pôde ser processado. Primeiro erro: ${errors[0]?.message || 'desconhecido'}`);
    }

    return {
      combinedText: parts.join('\n\n\n'),
      files: results,
      totalPages,
      errors,
    };
  }
}
