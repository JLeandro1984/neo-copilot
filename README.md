# Neo Copilot — Cartografia do Conhecimento

> Protótipo funcional de uma plataforma corporativa que transforma documentos dispersos (PDF) em ativos de aprendizado (resumo, glossário, FAQ, flashcards, quiz) e disponibiliza um chat baseado em RAG — tudo no navegador, sem backend, com IA real (Google Gemini).

Este é um **MVP de demonstração** construído para vender internamente a ideia de um produto de gestão de conhecimento corporativo. Faz upload real de PDF, extrai o texto no client-side, chama a API do Gemini com saída estruturada em JSON e renderiza cinco abas dinâmicas — nada de dados fixos no HTML.

---

## Índice

- [Screenshots](#screenshots)
- [Funcionalidades](#funcionalidades)
- [A Bússola — assistente de chat](#a-bússola--assistente-de-chat)
- [Stack e decisões técnicas](#stack-e-decisões-técnicas)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Como rodar localmente](#como-rodar-localmente)
- [Como obter a chave da API](#como-obter-a-chave-da-api)
- [Design system — Cartografia do Conhecimento](#design-system--cartografia-do-conhecimento)
- [PWA (Progressive Web App)](#pwa-progressive-web-app)
- [Segurança e limitações](#segurança-e-limitações)
- [O que está mockado](#o-que-está-mockado)
- [Caminho para produção](#caminho-para-produção)
- [Solução de problemas](#solução-de-problemas)

---

## Screenshots

Fluxo principal:

1. **Estado vazio** — dropzone convida ao primeiro upload
2. **Pipeline visual** — 4 etapas (Lendo PDF → Extraindo texto → Interpretando conteúdo → Gerando ativos)
3. **Resumo executivo + técnico + tópicos-chave** gerados pela IA
4. **Glossário, FAQ, Flashcards (flip 3D) e Quiz (com gabarito e score)**
5. **Bússola** — chat flutuante com RAG-simplificado, respondendo apenas com base no documento

---

## Funcionalidades

### Fluxo principal (100% real, não é mock)

- **Upload de PDF** via drag-and-drop ou input file, até 30 MB por arquivo
- **Múltiplos PDFs de uma vez** — selecione ou arraste vários; são extraídos em sequência, concatenados com separadores explicitáveis pela IA (`===== [DOCUMENTO: nome.pdf] =====`) e viram um único conjunto de ativos. A Bússola cita a fonte específica no formato `[Fonte: nome-do-arquivo.pdf]`. Se um dos PDFs falhar (ex: escaneado), ele é marcado com borda âmbar e os demais seguem
- **Extração de texto client-side** com PDF.js (nenhum byte do PDF sai da máquina do usuário)
- **Chamada real à API Google Gemini** (`gemini-flash-latest`) com saída em JSON estruturado
- **Geração dos ativos:**
  - Resumo executivo (para diretoria) + resumo técnico (para engenharia)
  - 6–10 tópicos-chave
  - Glossário (6–12 termos técnicos com definições)
  - **FAQ:** 1–15 itens (padrão 8, configurável em Configurações)
  - **Flashcards:** 1–20 itens (padrão 8, configurável em Configurações)
  - **Quiz:** 1–15 questões objetivas (padrão 5, configurável em Configurações) — cada questão com 4 alternativas, gabarito e explicação
- **Chat Bússola** com RAG-simplificado + base de conhecimento do produto (ver seção abaixo)

### Estados assíncronos tratados

- `idle → lendo → extraindo → interpretando → gerando → sucesso`
- Erros específicos com mensagem amigável e ação de recuperação:
  - Arquivo corrompido / protegido
  - PDF sem camada de texto (imagem escaneada) — sugere OCR
  - Falha de rede
  - Chave da API inválida / expirada
  - Rate limit (429)
  - Modelo indisponível (404) → fallback automático para modelos alternativos
  - Resposta da IA fora do schema esperado
  - Bloqueio por safety filter

### Abas secundárias (dados estáticos, propositalmente)

- **Admin** — KPIs de exemplo + lista de documentos indexados (para mostrar a visão de gestão)
- **Gestor** — painel de adoção, quiz médio, redução de onboarding (para mostrar métricas de negócio)

### PWA (Progressive Web App)

- Instalável em desktop e mobile
- Funciona **offline** para o shell e para extração de PDF (a geração de ativos precisa de rede, obviamente)
- Ícone da bússola em SVG (escalável) + PNGs para todos os cenários (favicon, iOS home, Android)

---

## A Bússola — assistente de chat

A Bússola é o chat flutuante (botão circular no canto inferior direito). Ela opera em **dois níveis de conhecimento independentes** e nunca os mistura:

| Nível                        | Fonte de verdade                                                | Sempre disponível?                     | Citação de fonte               |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------- | ------------------------------ |
| **1. Produto Neo Copilot**   | Base fixa em [js/product-knowledge.js](js/product-knowledge.js) | ✅ Sim, mesmo sem nenhum PDF carregado | `[Fonte: Neo Copilot]`         |
| **2. Documentos carregados** | Texto extraído dos PDFs do usuário                              | Só se houver upload                    | `[Fonte: nome-do-arquivo.pdf]` |

### Comportamento

- **Sem documento carregado:** a Bússola responde sobre o próprio Neo Copilot (o que é, como usar, features, roadmap, limitações). Únil para onboarding e demo.
- **Com 1 documento:** responde sobre o produto E sobre esse documento. Cita a fonte correta em cada resposta.
- **Com N documentos:** identifica qual arquivo contém a informação e cita `[Fonte: X.pdf]`. Se a resposta vier de mais de um, cita todos.
- **Se não souber:** diz explicitamente que a informação não está em nenhuma das fontes e sugere reformular — nunca inventa.

### Layout premium das respostas

As respostas são renderizadas com um subset de **Markdown** convertido em HTML nativo (sem lib externa, ~140 linhas em [js/dom-util.js](js/dom-util.js)):

| Sintaxe                   | Resultado visual                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `**texto**` / `__texto__` | `<strong>` em ink escuro (peso 600)                                                                       |
| `*texto*` / `_texto_`     | `<em>` itálico                                                                                            |
| `` `código` ``            | `<code>` com font mono, fundo sutil e borda                                                               |
| `- item` / `* item`       | `<ul>` com marker em cor latão                                                                            |
| `1. item`                 | `<ol>` com números em mono/latão                                                                          |
| `# Título` / `##` / `###` | H4 (Fraunces com underline) / H5 (mono uppercase) / H6                                                    |
| `[texto](url)`            | `<a target="_blank">` — só http/https/mailto viram links; outros protocolos viram texto puro (defesa XSS) |
| `[Fonte: xxx]` no fim     | Badge pill em latão com bullet colorido (uppercase mono)                                                  |

**Segurança do renderer:** zero `innerHTML`. Cada elemento nasce de `createElement`; todo texto vai por `textContent`. URLs são validadas por regex de protocolo antes de virar `<a>`. Zero `eval`/`Function`.

### Como "treinar" (na verdade, atualizar a memória)

Não é fine-tuning — é **prompt engineering com base de conhecimento injectável**, o mesmo padrão usado por OpenAI Actions, Claude Projects e Gemini Docs. Para atualizar o que a Bússola sabe sobre o produto (nova feature, novo caso de uso, mudança de política), basta editar o arquivo [js/product-knowledge.js](js/product-knowledge.js) — nenhum outro código precisa ser tocado.

---

## Stack e decisões técnicas

| Camada              | Escolha                                                            | Por quê                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **UI**              | HTML + CSS + JavaScript vanilla (sem framework, sem build)         | Zero configuração; abre com duplo clique num servidor local; ideal para demo interna                                                                    |
| **Extração de PDF** | [PDF.js 3.11.174 UMD](https://mozilla.github.io/pdf.js/) via cdnjs | Última versão que expõe `window.pdfjsLib` global (a 4.x só distribui `.mjs` no cdnjs). Client-side puro — nenhum byte do PDF sai da máquina do usuário  |
| **IA**              | [Google Gemini](https://ai.google.dev/) (`gemini-flash-latest`)    | Tier gratuito de verdade (sem cartão de crédito), JSON mode nativo (`responseMimeType: "application/json"`) e chamada REST direta do navegador com CORS |
| **PWA**             | Service Worker manual (sem Workbox)                                | Um único arquivo, ~90 linhas, com estratégia explícita por origem                                                                                       |
| **Fontes**          | Google Fonts: Fraunces + Inter + IBM Plex Mono                     | Fraunces (display) só em H1/H2; Inter no corpo; Plex Mono nos metadados "coordenadas"                                                                   |

### Arquitetura JS (módulos ES6)

Sem `type="module"` — usei scripts clássicos ordenados por dependência para manter zero build e compatibilidade com `file://`.

```
Config             — endpoints, modelo, limites globais de ativos
AssetsSettings     — gerencia quantidades de FAQ, Flashcards e Quiz (persistido em localStorage)
DOMUtil            — sanitização + renderer de Markdown seguro (sem innerHTML)
ApiKeyStore        — persistência da chave em localStorage por 30 dias (sobrevive a reboots)
Pipeline           — controla os estados visuais das 4 etapas
PDFExtractor       — extrai texto real com PDF.js, um ou muitos PDFs, com tratamento de erros
ProductKnowledge   — base de conhecimento fixa do Neo Copilot (memória da Bússola)
AIClient           — chamada Gemini + fallback de modelos + parsing defensivo do JSON
UIRenderer         — renderiza JSON nas 5 abas (Resumo, Glossário, FAQ, Flashcards, Quiz)
ChatController     — Bússola: dual-source (produto + docs) + Markdown premium
App                — bootstrap: bind de eventos, orquestração, registro do SW
```

Regras de engenharia seguidas:

- Nenhum `onclick` inline — bind sempre via `addEventListener`
- Sanitização defensiva: `textContent` / `createElement`, jamais `innerHTML` com string vinda da IA
- Parsing defensivo do JSON: `try/catch` com 3 tentativas (raw → sem cerca de código → primeiro `{...}` que aparecer)
- Validação de schema mínima antes de renderizar (previne quebra da tela)
- Chunking simples: texto truncado em ~120k caracteres com aviso ao usuário (não silencioso)
- Acessibilidade: `role="tab"`, `aria-selected`, `aria-live`, `aria-label` em ícones, foco visível

---

## Estrutura do projeto

```
projeto-neo-copilot/
├── index.html                    ponto de entrada
├── manifest.webmanifest          metadata PWA
├── sw.js                         Service Worker (cache do shell)
├── case_neo_copilot.pdf          documento de referência para testes
├── prompt-case-copilot.txt       spec original do prototype
├── README.md                     este arquivo
├── css/
│   └── styles.css                design system inteiro (tokens + responsivo)
├── icons/
│   ├── icon.svg                  source-of-truth 512×512
│   ├── icon-16.png               favicon
│   ├── icon-32.png               favicon
│   ├── icon-180.png              apple-touch-icon
│   ├── icon-192.png              PWA Android
│   └── icon-512.png              PWA maskable + splash
└── js/
    ├── config.js                 endpoints, modelo, limites
    ├── assets-settings.js        gerencia configurações de ativos (FAQ, Flashcards, Quiz)
    ├── dom-util.js               helpers seguros + renderer de Markdown
    ├── api-key-store.js          localStorage (30 dias de persistência)
    ├── pipeline.js               estados visuais
    ├── pdf-extractor.js          PDF.js real (extract + extractMany)
    ├── product-knowledge.js      base de conhecimento do Neo Copilot
    ├── ai-client.js              Gemini + JSON schema + chat dual-source
    ├── ui-renderer.js            render das 5 abas
    ├── chat-controller.js        Bússola (chat)
    └── app.js                    bootstrap + SW register
```

---

## Como rodar localmente

O app **precisa** ser servido por HTTP (não abre bem via `file://` por causa do Service Worker, do `fetch` interno e da política CORS do Gemini).

### Opção 1 — Python (mais rápido)

```powershell
# na pasta do projeto
python -m http.server 8765
```

Depois abra: **http://localhost:8765/**

### Opção 2 — Node

```powershell
npx http-server -p 8765
```

### Opção 3 — VS Code

Instale a extensão **Live Server**, clique com o botão direito em `index.html` → **Open with Live Server**.

### Depois de abrir

1. Clique em **Configurações** (ícone de engrenagem) no canto superior direito
2. Cole sua chave do Gemini (veja abaixo como obter) e **Salvar**
3. (Opcional) Ajuste os sliders de **Perguntas Frequentes**, **Flashcards** e **Questões do Quiz** para personalizar a quantidade de ativos gerados — as mudanças são salvas automaticamente
4. (Opcional) Abra a **Bússola** (botão flutuante) e pergunte _"O que é o Neo Copilot?"_ — ela responde sem precisar de PDF, só com a base do produto
5. Solte um ou mais PDFs (o app vem com `case_neo_copilot.pdf`) na dropzone
6. Assista o pipeline executar e navegue pelas 5 abas geradas — a quantidade de itens em FAQ, Flashcards e Quiz refletirá suas configurações
7. Volte na **Bússola** e pergunte sobre o conteúdo dos PDFs — ela cita a fonte específica em cada resposta

---

## Como obter a chave da API

### Google Gemini (recomendado — grátis)

1. Acesse **https://aistudio.google.com/apikey** (faça login com sua conta Google)
2. Clique em **"Criar chave de API"** (ou "Create API key")
3. Escolha o projeto **"Default Gemini Project"** (não use "Criar projeto" ou "Importar projeto" — esses geram credenciais em formato diferente que não funciona aqui)
4. Copie a chave — ela terá o formato `AQ.Ab...` (novo padrão 2026, ~50 chars) ou `AIzaSy...` (padrão legado, ~39 chars). O app aceita os dois
5. Cole no modal do app

**Limites do tier gratuito:**

- 250 requisições/dia
- 10 requisições/minuto
- 1M tokens de entrada/dia
- **Sem cartão de crédito**

### Trocar por outro provider

O `js/ai-client.js` está isolado. Para trocar por Anthropic, Groq, OpenAI, etc., só precisa reescrever esse arquivo mantendo a interface pública `generateAssets(text)` e `chat(text, name, history, message)`.

---

## Design system — Cartografia do Conhecimento

O produto se posiciona como um "atlas navegável" do conhecimento corporativo, não como um repositório frio de documentos. Toda a linguagem visual reflete isso.

### Tokens de cor (em `css/styles.css`)

```css
--ink: #1b2430; /* tinta profunda — títulos, ink */
--ink-soft: #4a5568; /* corpo secundário */
--slate: #f5f7fa; /* fundo neutro */
--paper: #ffffff; /* superfícies elevadas */
--brass: #c98a3e; /* latão — bússola, destaque, marca */
--brass-dark: #a66f2e; /* estado ativo do latão */
--teal: #1f6f6b; /* verde-mar — estado "novo" / info */
--sage: #5b8c5a; /* verde-sábio — sucesso / atualizado */
--amber-warn: #c77b2e; /* âmbar — atenção / revisar */
--line: #dedacb; /* linhas finas em papel envelhecido */
```

### Tipografia

- **Fraunces** (peso 600/700) — títulos H1/H2 e destaques (rendição serifada calorosa, mas com opsz variable)
- **Inter** (400/500/600/700) — corpo e UI
- **IBM Plex Mono** (400/500) — metadados, "coordenadas" em uppercase, badges técnicos

### Elementos de assinatura

- **Bússola** como marca e como FAB do chat (título "Bússola")
- **Coordenadas** em mono uppercase para todo metadata técnico (ex: `01.A · CASE_NEO_COPILOT.PDF`)
- **Badges semânticos:** `sage` = atualizado · `teal` = novo · `amber` = revisar
- **Dropzone** com estado `drag-over` diferenciado (borda teal + fundo teal-10 + micro-scale)

---

## PWA (Progressive Web App)

### Como instalar

- **Desktop (Chrome/Edge):** ícone ⊕ à direita da barra de endereço → **Instalar**
- **Android (Chrome):** menu ⋮ → **Instalar app** ou **Adicionar à tela inicial**
- **iOS (Safari):** botão de compartilhar → **Adicionar à Tela de Início**

Depois de instalado, abre em modo standalone (sem barra do navegador), com o ícone da bússola.

### Estratégia de cache (`sw.js`)

| Origem                              | Estratégia                          | Motivo                                 |
| ----------------------------------- | ----------------------------------- | -------------------------------------- |
| Same-origin (HTML, CSS, JS, ícones) | **cache-first** com fallback à rede | Abertura instantânea, funciona offline |
| `cdnjs.cloudflare.com` (PDF.js)     | **stale-while-revalidate**          | Funciona offline após primeiro load    |
| Google Fonts                        | **stale-while-revalidate**          | Idem                                   |
| `generativelanguage.googleapis.com` | **network-only** (nunca cacheia)    | Dados dinâmicos + rate-limit + custo   |

### O que funciona offline

- ✅ Abrir o app
- ✅ Fazer upload e **extrair texto do PDF** (PDF.js é 100% client-side)
- ❌ Gerar ativos de aprendizado (precisa da API do Gemini) → mostra erro amigável

---

## Segurança e limitações

### API Key no navegador

**Este é um protótipo de demonstração.** A chave da API é digitada pelo usuário no modal e armazenada em `localStorage` por **30 dias** (persiste entre reboots e mudanças de dia; expira automaticamente após o período). É enviada direto do navegador para `generativelanguage.googleapis.com`.

**Isso NÃO é seguro para produção.** Em ambiente real:

- A chamada precisa passar por um **backend proxy** que injeta a chave server-side
- O front-end nunca vê nem a chave nem a URL da API
- O backend também aplica rate-limiting por usuário, log de auditoria, moderação de conteúdo, etc.

Nenhuma chave está hardcoded no código-fonte.

### Sanitização de conteúdo

Todo texto vindo da IA é injetado no DOM via `textContent` ou `createElement` — **jamais** via `innerHTML` com string bruta. Isso previne XSS mesmo que a IA gere payloads maliciosos.

### CORS

- Gemini permite chamadas diretas do navegador (aceita `Origin` de qualquer host)
- PDF.js e Google Fonts também

### Rate limit

O tier gratuito do Gemini limita a 10 req/min e 250 req/dia. O app não implementa retry com backoff — se você bater o limite, aparece um toast de erro e é só aguardar 1 minuto.

### Configuração de ativos (FAQ, Flashcards, Quiz)

O número de itens gerados por documento é **totalmente configurável** via Configurações → sliders:

| Ativo      | Mín | Padrão | Máx | Armazenamento  |
| ---------- | --- | ------ | --- | -------------- |
| FAQ        | 1   | 8      | 15  | `localStorage` |
| Flashcards | 1   | 8      | 20  | `localStorage` |
| Quiz       | 1   | 5      | 15  | `localStorage` |

Os valores são **persistidos em `localStorage`** e usados automaticamente em futuras gerações. Aumentar esses limites pode resultar em respostas mais abrangentes, mas também aumenta o tempo de processamento — recomenda-se não exceeder **15 FAQ, 20 Flashcards, 15 Quiz** para manter a latência aceitável no tier gratuito.

---

## O que está mockado

**Praticamente nada no fluxo principal.** As únicas coisas mockadas são:

- **Aba Admin** — KPIs fixos ("147 documentos ativos", "2.384 ativos gerados", etc.) e uma lista de exemplo com 4 documentos
- **Aba Gestor** — KPIs fixos ("Onboarding: 6 dias", "Adoção: 92%", etc.) + um insight de exemplo

Essas abas foram marcadas visualmente como secundárias (tabs em itálico com bullet cinza) para deixar claro que o esforço de interatividade foi investido no fluxo Estudos.

---

## Caminho para produção

Se este MVP for aprovado, o roteiro natural de evolução é:

1. **Backend proxy** para a API do Gemini (Node, Python ou .NET). O front-end passa a chamar `/api/generate` e `/api/chat` — sem chave no browser.
2. **Autenticação corporativa** (SSO via Azure AD / Okta).
3. **RAG real** com chunking + embeddings + banco vetorial. Substitui a injeção ingênua de texto no `system prompt` por retrieval dos top-k trechos relevantes.
4. **Persistência** dos documentos processados (Microsoft SQL Server + Vector DB, conforme o case).
5. **Multi-formato:** DOCX, PPTX, MD, HTML — via server-side, com OCR quando necessário.
6. **Conectores enterprise:** Teams, Jira, GitLab, SharePoint (leitura direta).
7. **Gamificação:** trilhas de aprendizado, medalhas, ranking.

---

## Solução de problemas

### "Biblioteca PDF.js não carregou. Verifique sua conexão."

Você está sem internet ou o cdnjs está bloqueado. O SW cacheia o PDF.js após o primeiro load bem-sucedido — abra o app 1 vez online e depois offline funciona.

### "A IA retornou um formato que não conseguimos interpretar como JSON."

Raro com o `responseMimeType: "application/json"` do Gemini, mas se acontecer é porque o modelo devolveu markdown ou texto solto no lugar do JSON. Tente **Trocar** e enviar de novo — a resposta varia com temperatura.

### "Modelo indisponível" ou 404

O modelo primário (`gemini-flash-latest`) foi descontinuado ou não está disponível para sua conta. O app tenta automaticamente estes fallbacks em ordem: `gemini-2.5-flash-latest`, `gemini-2.0-flash`, `gemini-1.5-flash-latest`. Se todos falharem, é preciso atualizar `js/config.js`.

### "Chave da API inválida"

Você provavelmente colou uma credencial que não é chave do AI Studio (por exemplo, um OAuth token que começa com `ya29.` ou uma credencial do Google Cloud Console). Vá em https://aistudio.google.com/apikey e **crie uma chave nova no "Default Gemini Project"**.

### "Não foi possível extrair texto — o PDF parece ser uma imagem escaneada"

O PDF que você enviou é composto só de imagens (foto de páginas), sem camada de texto real. Rode um OCR antes (ex: `ocrmypdf`) ou envie outro documento.

### Página não instala como PWA

Verifique:

- Está servindo por HTTP (não `file://`)
- O `sw.js` está sendo servido com content-type `application/javascript`
- O `manifest.webmanifest` está acessível em `/manifest.webmanifest`
- O DevTools → Application → Manifest não mostra erros

---

## Licença

Uso interno / demonstração. Não distribuir sem autorização.
