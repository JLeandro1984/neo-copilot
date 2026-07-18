/* =============================================================
   Neo Copilot — ApiKeyStore
   Persiste a chave em localStorage por padrão (sobrevive a reboots/diários).
   Mantive suporte a expiração opcional (dias). Em produção, usar backend proxy.
   ============================================================= */
const ApiKeyStore = {
  KEY: 'neo_copilot_api_key',
  EXP_KEY: 'neo_copilot_api_key_expiry',
  DEFAULT_TTL_DAYS: 30, // default persistence window when not especificada

  _nowMs() { return Date.now(); },

  get() {
    try {
      const v = localStorage.getItem(this.KEY);
      if (!v) return '';
      const exp = localStorage.getItem(this.EXP_KEY);
      if (exp) {
        const expMs = Number(exp) || 0;
        if (expMs > 0 && this._nowMs() > expMs) {
          this.clear();
          return '';
        }
      }
      return v;
    } catch {
      return '';
    }
  },

  // set(value, days) — if days is omitted, uses DEFAULT_TTL_DAYS; if days <= 0, persist indefinitely
  set(v, days) {
    try {
      const val = (v || '').toString().trim();
      localStorage.setItem(this.KEY, val);
      const ttl = (typeof days === 'number') ? days : this.DEFAULT_TTL_DAYS;
      if (ttl > 0) {
        const expMs = this._nowMs() + ttl * 24 * 60 * 60 * 1000;
        localStorage.setItem(this.EXP_KEY, String(expMs));
      } else {
        localStorage.removeItem(this.EXP_KEY);
      }
    } catch {}
  },

  clear() {
    try {
      localStorage.removeItem(this.KEY);
      localStorage.removeItem(this.EXP_KEY);
    } catch {}
  },

  exists() { return !!this.get(); },
};
