/* =============================================================
   Neo Copilot — Base de Conhecimento do Produto
   ------------------------------------------------------------
   Este arquivo é a "memória permanente" do assistente Bússola
   sobre o próprio produto. É injetado no system prompt em toda
   conversa, sem consumir contexto de documentos do usuário.

   Editar este arquivo é como atualizar a documentação de vendas
   e suporte do Neo Copilot. Nenhuma outra parte do código precisa
   ser tocada quando o produto evoluir.
   ============================================================= */
const ProductKnowledge = Object.freeze({
  version: '1.0',
  content: `
# NEO COPILOT — Cartografia do Conhecimento

## O que é
O Neo Copilot é uma plataforma corporativa de gestão do conhecimento baseada
em Inteligência Artificial. Ele transforma documentos dispersos (PDFs, manuais,
políticas, procedimentos) em ativos de aprendizado dinâmicos e num assistente
de conversação que responde perguntas ancoradas nesses documentos.

Metáfora: uma "cartografia do conhecimento". Em vez de repositórios frios de
arquivos, o produto entrega um atlas navegável do que a empresa sabe.

## Propósito central (por que existe)
- Reduzir o tempo gasto procurando informações internas
- Acelerar o onboarding de novos colaboradores
- Preservar o conhecimento tácito da companhia (evitar perda com saída de talentos)
- Diminuir interrupções repetitivas a especialistas técnicos

## Problemas que resolve
- Documentação técnica dispersa em wikis, PDFs, SharePoint, Confluence, e-mails
- Materiais de treinamento que ficam obsoletos rapidamente
- Onboarding lento (novos profissionais levam semanas para entender processos)
- Conhecimento crítico "sepultado" em pastas que ninguém acessa

## Público-alvo por setor
- **Desenvolvimento:** guias de arquitetura, padrões de microsserviços, APIs
- **Qualidade (QA):** fluxogramas, critérios de aceite, procedimentos de teste
- **Gestão de Produto:** especificações, roadmaps, histórico de features
- **Recursos Humanos:** onboarding, compliance, políticas, benefícios
- **Comercial:** catálogos, propostas de referência, táticas de conversão

## Como funciona (fluxo do usuário)
1. **Upload do documento**
   - Botão "Novo documento" no topo, OU
   - Arraste um ou mais PDFs para a dropzone à esquerda ("Solte um ou mais PDFs")
   - Suporta múltiplos PDFs de uma vez (concatenados num super-documento)
   - Limite: 30 MB por arquivo (o texto é truncado em ~120k caracteres para
     caber no contexto da IA)

2. **Pipeline cognitivo** (4 etapas visíveis na sidebar)
   - Lendo PDF → Extraindo texto → Interpretando conteúdo → Gerando ativos

3. **Exploração dos ativos gerados** (5 abas no painel principal)
   - **Resumo:** título, resumo executivo (para diretoria), resumo técnico
     (para engenharia) e 6–10 tópicos-chave
   - **Glossário:** 6–12 termos com definições curtas
   - **FAQ:** 5–8 perguntas frequentes com respostas
   - **Flashcards:** 8 cartões com frente/verso, clique para virar (estudo ativo)
   - **Quiz:** 5 questões objetivas de 4 alternativas com gabarito, explicação
     por questão e score final em porcentagem

4. **Chat com a Bússola** (botão flutuante da bússola, canto inferior direito)
   - Faça perguntas em linguagem natural sobre o(s) documento(s) carregado(s)
   - As respostas são baseadas EXCLUSIVAMENTE no conteúdo — sem alucinação
   - Quando há múltiplos documentos, a Bússola cita a fonte específica
     no formato [Fonte: nome_do_arquivo.pdf]

## Abas secundárias
- **Admin:** console administrativo com KPIs (documentos ativos, ativos gerados,
  consultas ao chat) e lista de docs indexados por status (Atualizado, Revisar, Novo)
- **Gestor:** painel de gestão com métricas de adoção, tempo médio de onboarding,
  média do quiz e redução de interrupções a especialistas
- Ambas mostram dados de exemplo neste protótipo — a lógica está preparada para
  ser conectada a dados reais em produção

## Como testar rapidamente
1. Configure a chave da API Google Gemini (botão Configurações no topo).
   Grátis, obtida em aistudio.google.com/apikey. Formato AQ.Ab... ou AIzaSy...
2. Solte um PDF (o app vem com "case_neo_copilot.pdf" incluso)
3. Aguarde o pipeline
4. Explore as 5 abas e depois abra a Bússola (botão flutuante) para perguntar

## Stack técnica (protótipo)
- HTML + CSS + JavaScript vanilla (nenhum framework, nenhum build)
- PDF.js para extração 100% client-side (o PDF nunca é enviado a servidor)
- Google Gemini (gemini-flash-latest) para geração dos ativos e chat
- Service Worker + Web Manifest → instalável como PWA (Progressive Web App)
- Responsivo com breakpoints em 960px e 640px

## Design System — Cartografia do Conhecimento
- Cores: tinta (#1B2430), latão (#C98A3E), verde-mar (#1F6F6B), sábio (#5B8C5A),
  âmbar de alerta (#C77B2E)
- Tipografia: Fraunces (títulos), Inter (corpo), IBM Plex Mono (metadados)
- Elemento de assinatura: bússola (marca e chat), coordenadas em mono uppercase

## Limitações do protótipo (importante ser honesto)
- Chave da API é digitada pelo usuário e vive em sessionStorage — em produção
  precisa passar por backend proxy (nunca expor chave no navegador)
- RAG é simplificado: o texto do doc é injetado inteiro no system prompt.
  Em produção vira chunking + embeddings + banco vetorial (Vector DB)
- Não persiste documentos entre sessões (não tem backend)
- Abas Admin e Gestor mostram dados fictícios

## Roadmap (visão de futuro)
- Conectores enterprise: Teams, Jira, GitLab, SharePoint
- SSO corporativo: Azure AD, Okta
- Gamificação: trilhas de aprendizado, medalhas, ranking
- Mídia avançada: tradução em tempo real, áudio explicativo, síntese de vídeo
- Persistência real: Microsoft SQL Server + Vector Database

## Segurança e privacidade
- Nenhum PDF sai do navegador durante a extração
- Chamadas à IA saem direto do browser para a Google (com aviso ao usuário)
- Nenhum log ou tracking é enviado a terceiros neste protótipo
`.trim(),
});
