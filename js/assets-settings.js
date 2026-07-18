/* =============================================================
   Neo Copilot — AssetsSettings
   Gerencia as configurações de quantidade de ativos (FAQ, Flashcards, Quiz).
   Persiste em localStorage junto com a chave da API.
   ============================================================= */
window.AssetsSettings = {
  PREFIX: 'neo_copilot_assets_',
  
  get faqCount() {
    const v = localStorage.getItem(this.PREFIX + 'faq_count');
    const num = v ? parseInt(v, 10) : Config.DEFAULT_FAQ_COUNT;
    return Math.min(Math.max(num, 1), Config.MAX_FAQ_COUNT);
  },
  
  get flashcardCount() {
    const v = localStorage.getItem(this.PREFIX + 'flashcard_count');
    const num = v ? parseInt(v, 10) : Config.DEFAULT_FLASHCARD_COUNT;
    return Math.min(Math.max(num, 1), Config.MAX_FLASHCARD_COUNT);
  },
  
  get quizCount() {
    const v = localStorage.getItem(this.PREFIX + 'quiz_count');
    const num = v ? parseInt(v, 10) : Config.DEFAULT_QUIZ_COUNT;
    return Math.min(Math.max(num, 1), Config.MAX_QUIZ_COUNT);
  },
  
  setFaqCount(n) {
    try {
      const num = Math.min(Math.max(parseInt(n, 10) || Config.DEFAULT_FAQ_COUNT, 1), Config.MAX_FAQ_COUNT);
      localStorage.setItem(this.PREFIX + 'faq_count', String(num));
    } catch {}
  },
  
  setFlashcardCount(n) {
    try {
      const num = Math.min(Math.max(parseInt(n, 10) || Config.DEFAULT_FLASHCARD_COUNT, 1), Config.MAX_FLASHCARD_COUNT);
      localStorage.setItem(this.PREFIX + 'flashcard_count', String(num));
    } catch {}
  },
  
  setQuizCount(n) {
    try {
      const num = Math.min(Math.max(parseInt(n, 10) || Config.DEFAULT_QUIZ_COUNT, 1), Config.MAX_QUIZ_COUNT);
      localStorage.setItem(this.PREFIX + 'quiz_count', String(num));
    } catch {}
  },
  
  reset() {
    try {
      localStorage.removeItem(this.PREFIX + 'faq_count');
      localStorage.removeItem(this.PREFIX + 'flashcard_count');
      localStorage.removeItem(this.PREFIX + 'quiz_count');
    } catch {}
  },
};
