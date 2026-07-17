/* =============================================================
   Neo Copilot — Pipeline
   Controla os estados visuais das 4 etapas do processamento
   e o banner de erro na sidebar.
   ============================================================= */
class Pipeline {
  constructor() {
    this.stepsEl = document.getElementById('pipeline');
    this.card = document.getElementById('pipeline-card');
    this.errorBanner = document.getElementById('error-banner');
    this.errorTitle = document.getElementById('error-title');
    this.errorMsg = document.getElementById('error-message');
  }
  show() { this.card.hidden = false; this.hideError(); }
  hide() { this.card.hidden = true; }
  reset() {
    this.stepsEl.querySelectorAll('.step').forEach(s => s.className = 'step');
    this.hideError();
  }
  setActive(name) {
    DOMUtil.liveStatus(this._label(name));
    this.stepsEl.querySelectorAll('.step').forEach(s => {
      const n = s.dataset.step;
      s.classList.remove('active', 'error');
      if (n === name) s.classList.add('active');
    });
  }
  setDone(name) {
    const el = this.stepsEl.querySelector(`.step[data-step="${name}"]`);
    if (el) { el.classList.remove('active', 'error'); el.classList.add('done'); }
  }
  setError(name) {
    const el = this.stepsEl.querySelector(`.step[data-step="${name}"]`);
    if (el) { el.classList.remove('active', 'done'); el.classList.add('error'); }
  }
  showError(title, msg) {
    this.errorTitle.textContent = title;
    this.errorMsg.textContent = msg;
    this.errorBanner.classList.add('visible');
    DOMUtil.liveStatus('Erro: ' + msg);
  }
  hideError() { this.errorBanner.classList.remove('visible'); }
  _label(name) {
    return ({
      read: 'Lendo PDF',
      extract: 'Extraindo texto do documento',
      interpret: 'Interpretando conteúdo',
      generate: 'Gerando ativos de aprendizado',
    })[name] || name;
  }
}
