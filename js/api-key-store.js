/* =============================================================
   Neo Copilot — ApiKeyStore
   Guarda a chave apenas em sessionStorage (limpa ao fechar a aba).
   Nunca é hardcoded. Em produção, use um backend proxy.
   ============================================================= */
const ApiKeyStore = {
  KEY: 'neo_copilot_api_key',
  get() { try { return sessionStorage.getItem(this.KEY) || ''; } catch { return ''; } },
  set(v) { try { sessionStorage.setItem(this.KEY, v.trim()); } catch {} },
  clear() { try { sessionStorage.removeItem(this.KEY); } catch {} },
  exists() { return !!this.get(); },
};
