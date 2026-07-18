/* =============================================================
   Neo Copilot — Config
   Endpoints, modelo e limites globais.
   ============================================================= */
const Config = Object.freeze({
  // Google Generative Language API (Gemini). Tier gratuito, sem cartão de crédito.
  // Chave criada em: https://aistudio.google.com/apikey
  API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
  // Alias oficial que aponta sempre para o Flash atual — evita quebrar quando
  // modelos específicos são descontinuados (ex.: gemini-2.5-flash saiu para
  // novos usuários em 2026). Fallbacks tentados em ordem se o primário falhar.
  MODEL: 'gemini-flash-latest',
  MODEL_FALLBACKS: ['gemini-2.5-flash-latest', 'gemini-2.0-flash', 'gemini-1.5-flash-latest'],
  // Limite de segurança para o corpo do documento enviado à IA.
  // ~120 000 caracteres ≈ 30k tokens: caber em contexto e evitar custos altos.
  // Em produção, substituir por chunking + embeddings + retrieval.
  MAX_DOC_CHARS: 120000,
  MAX_CHAT_HISTORY: 8, // pares de mensagens mantidas na chamada

  // === Limites de ativos de aprendizado (configuráveis pelo usuário) ===
  DEFAULT_FAQ_COUNT: 8,       // padrão 5-8; máximo permitido 15
  DEFAULT_FLASHCARD_COUNT: 8, // padrão 8; máximo permitido 20
  DEFAULT_QUIZ_COUNT: 5,      // padrão 5; máximo permitido 15
  MAX_FAQ_COUNT: 15,
  MAX_FLASHCARD_COUNT: 20,
  MAX_QUIZ_COUNT: 15,
});
