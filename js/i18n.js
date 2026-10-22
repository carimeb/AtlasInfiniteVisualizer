// ─── I18N ────────────────────────────────────────────────────────────────────
// English lives in index.html (captured on first run); Portuguese (pt-BR) below.
// Dynamic strings use tx(en, pt) next to the code that renders them.

const PT = {
  'hdr.sub': 'HA · Failover · Escala Vertical e Horizontal · CAP · Backup — material educativo, não é documentação oficial da MongoDB',
  'hdr.badge': 'Public Preview',
  'hdr.limits': '⚠ Limitações do preview',
  'tab.arch': '① Arquitetura e Caminho da Escrita',
  'tab.ha': '② Alta Disponibilidade e Failover',
  'tab.vs': '③ Escala Vertical e Storage',
  'tab.hs': '④ Escala Horizontal de Leitura',
  'tab.bk': '⑤ Backup e Restore',
  'tab.lim': '⑥ Limitações do Preview e Fontes',

  'arch.tip': '<strong>O Atlas Infinite separa compute de storage.</strong> Os nós de compute executam queries e transações; uma <strong>camada de storage</strong> independente e multi-AZ mantém os dados duráveis e coordena o failover. Alterne <strong>Atlas Core ↔ Atlas Infinite</strong> para comparar e clique em <strong>▶ Simular Escrita</strong> ou <strong>▶ Simular Leitura</strong> para acompanhar cada etapa.',
  'arch.topo': 'Topologia do deployment',
  'arch.ideas': 'Ideias-chave',
  'arch.cmp': 'Atlas Core vs Atlas Infinite — lado a lado',
  'arch.edition': 'Edição do banco de dados',
  'cc.title': 'Configurações de escrita e leitura',
  'opt.w0': 'w: 0 — sem confirmação',
  'opt.w1': 'w: 1 — somente o primário',
  'opt.wmaj': 'w: "majority" (padrão)',
  'opt.wnum': 'w: 3 (qualquer número &gt; 2)',
  'opt.rclocal': 'local (padrão)',
  'opt.rcsnap': 'snapshot (transações)',
  'btn.simw': '▶ Simular Escrita',
  'btn.simr': '▶ Simular Leitura',
  'arch.steps': 'Passo a passo',

  'ha.tip': '<strong>Clique em qualquer nó de compute</strong> para simular uma falha, ou <strong>clique no cabeçalho de uma Availability Zone</strong> para derrubar a zona inteira (compute + réplicas de storage). Veja como a <strong>camada de storage coordena o failover</strong> — sem eleição entre os nós de compute — e como a <strong>maioria do Log Service (2 de 3 AZs)</strong> mantém as escritas duráveis.',
  'ha.bn.fo.t': '⏳ Failover em andamento — a camada de storage está promovendo o standby',
  'ha.bn.fo.d': 'Os drivers detectam a troca de primário e <strong>refazem leituras e escritas elegíveis</strong> (retryable reads/writes). As escritas confirmadas com majority já estão na camada de storage — nada precisa ser reaplicado nem sofrer rollback.',
  'ha.bn.az.t': '🛡 Uma Availability Zone caiu — o cluster continua atendendo',
  'ha.bn.az.d': 'O Log Service ainda tem <strong>maioria (2 de 3 zonas)</strong>, então as escritas continuam sendo confirmadas de forma durável. Se o primário estava na zona que caiu, o standby em outra zona assumiu.',
  'ha.bn.q.t': '⛔ Maioria da camada de storage perdida — escritas não podem ser confirmadas',
  'ha.bn.down.t': '🔴 Nenhum nó de compute disponível',
  'ha.bn.down.d': 'Nenhum nó de compute consegue atender leituras ou escritas agora. Os dados continuam duráveis na camada de storage; o serviço volta assim que um nó de compute estiver disponível.',
  'ha.topo': 'Cluster single-region em 3 Availability Zones',
  'ha.cmp': 'Failover: Atlas Core vs Atlas Infinite',
  'ha.sim': 'Simular falhas',
  'ha.btn.test': '⚡ Test Primary Failover',
  'btn.reset': '↺ Restaurar tudo',
  'ha.autoheal': 'O Atlas recupera nós de compute com falha (sem cópia de dados)',
  'ha.timeline': 'Linha do tempo do failover',
  'ha.client': 'O que a aplicação enxerga',

  'vs.tip': '<strong>Compute e storage escalam de forma independente.</strong> O tier do cluster define apenas o compute (vCPU, RAM, IOPS por nó) — o storage cresce sozinho até 128 TB por replica set. Escolha um tier para ver um <strong>resize vertical sem mover dados</strong> e depois dispare um <strong>pico de tráfego de agentes de IA</strong> no auto-scaler.',
  'vs.bn.block.t': '✋ Limite máximo de storage atingido — escritas bloqueadas, leituras continuam',
  'vs.bn.block.d': 'O tamanho lógico dos dados se aproximou do limite máximo de storage configurado. O Atlas <strong>bloqueia as escritas, mas continua atendendo leituras</strong>. Aumente o limite (ou apague dados) para retomar as escritas — sem mudar de tier.',
  'vs.compute': 'Tier de compute — escala vertical',
  'vs.as': 'Auto-scaling de compute — demanda vs capacidade provisionada',
  'vs.as.note': 'Modelo simplificado para ilustração: unidades de capacidade e thresholds não são números oficiais. O que é oficial: o scaling reativo responde a utilização alta/baixa <strong>sustentada</strong>; o scaling preditivo usa ML sobre padrões históricos para escalar <strong>para cima</strong> antes de um pico previsto; o scaling respeita os tiers mínimo/máximo configurados e a mesma classe de tier.',
  'vs.tier': 'Tier do cluster',
  'vs.asset': 'Configuração de auto-scaling',
  'vs.as.on': 'Auto-scaling de compute (recomendado)',
  'vs.as.pred': 'Scale-up preditivo',
  'vs.min': 'Tier mínimo',
  'vs.max': 'Tier máximo',
  'vs.pattern': 'Padrão de tráfego',
  'vs.p.steady': '〰 Estável',
  'vs.p.spike': '🚀 Pico de agentes de IA',
  'vs.p.daily': '📅 Pico diário recorrente',
  'btn.restart': '↺ Reiniciar',
  'vs.storage': 'Storage — cresce com os seus dados',
  'vs.maxlim': 'Limite máximo de storage',
  'vs.lim.unset': 'Não definido → 128 TB (lógico)',
  'vs.ingest': '＋ Ingerir dados',
  'vs.delete': '− Apagar dados',

  'hs.tip': '<strong>Escale leituras em minutos.</strong> Adicione até <strong>5 nós read-only ou analytics</strong> (máx. 7 nós). Os novos nós leem direto da camada de storage compartilhada — <strong>sem initial sync, sem cópia de dados</strong>. Depois altere o <strong>read preference</strong> e as <strong>tags</strong> para ver onde cada leitura cai.',
  'hs.topo': 'Roteamento de leituras e carga por nó',
  'hs.time': 'Tempo para adicionar capacidade de leitura',
  'hs.nodes': 'Nós read-only e analytics',
  'hs.addro': '＋ Nó read-only',
  'hs.addan': '＋ Nó analytics',
  'hs.rm': '− Remover último',
  'hs.ops': 'App operacional',
  'hs.tag.none': '(nenhuma — qualquer nó elegível)',
  'hs.rps': 'Tráfego de leitura',
  'hs.bi': 'App de Analytics / BI',
  'hs.chart': 'Leituras atendidas por nó',
  'hs.bi.on': 'Executar queries analíticas — readPreference: secondary, tags { nodeType: "ANALYTICS" }',

  'bk.tip': '<strong>Os backups rodam na camada de storage</strong> — independentes do compute, então não competem com suas queries. O Atlas Infinite inclui uma <strong>janela de 24 horas de continuous cloud backup</strong> para restore point-in-time, além do <strong>Additional Backup Retention</strong> (ativado por padrão) para manter snapshots por até 3 anos. Arraste o ponto de restore e escolha um destino.',
  'bk.where': 'Onde o backup acontece',
  'bk.timeline': 'Linha do tempo de recuperação',
  'bk.target': 'Destino do restore',
  'bk.target.l': 'Restaurar em…',
  'bk.t.same': 'O mesmo cluster Atlas Infinite',
  'bk.t.other': 'Outro cluster Infinite — mesma região e org',
  'bk.t.region': 'Cluster Infinite em outra região',
  'bk.t.cloud': 'Cluster em outro cloud provider',
  'bk.t.org': 'Cluster Infinite em outra organização',
  'bk.t.core': 'Um cluster Atlas Core',
  'bk.t.older': 'Cluster Infinite com versão mais antiga do MongoDB',
  'bk.run': '▶ Simular restore',
  'bk.facts': 'Fatos sobre backup',

  'lim.tip': '<strong>O Atlas Infinite está em Public Preview</strong> (anunciado em 29–30 de setembro de 2026 no MongoDB.local NYC). Recursos e documentação podem mudar antes do GA. Abaixo está o que <strong>ainda não está disponível</strong> ou tem limitações — confira as páginas oficiais linkadas antes de tomar decisões.',
  'lim.sources': 'Fontes oficiais usadas neste visualizador',
  'lim.legend': 'Chips como <a class="src">D2</a> apontam para a documentação da MongoDB; <a class="src blog">B4</a> apontam para posts de blog, press releases ou páginas de produto da MongoDB (afirmações do fabricante). Todo o resto nesta ferramenta é uma ilustração simplificada.',

  'cap.title': 'Posição no Teorema CAP',
  'cap.note': '<strong style="display:block;margin-bottom:2px">📌 Modelo simplificado — apenas ilustrativo</strong>Uma bússola direcional, não uma prova formal. Reage ao seu writeConcern, readConcern, readPreference e às falhas simuladas. Use como ponto de partida para a conversa, não como especificação.',
  'cap.c': 'Consistência',
  'cap.a': 'Disponibilidade',
  'cap.p': 'Tolerância a partição',
  'cap.zone': 'zona de operação',
  'cap.trade': 'Trade-off C ↔ A',
  'cap.l': '← Disponibilidade',
  'cap.r': 'Consistência →',
  'cap.metrics': 'Métricas de impacto',
  'cap.p.title': 'Tolerância a partição no Atlas Infinite',
  'cap.expl': 'Explicação',
  'cap.active': 'Configurações ativas',
};

function applyStaticLang() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
    const k = el.getAttribute('data-i18n');
    el.innerHTML = (S.lang === 'pt' && PT[k] !== undefined) ? PT[k] : el.dataset.en;
  });
  document.documentElement.lang = S.lang === 'pt' ? 'pt-BR' : 'en';
  document.querySelectorAll('.lang button').forEach(b => b.classList.toggle('on', b.dataset.lang === S.lang));
}

function setLang(lang) {
  S.lang = lang === 'pt' ? 'pt' : 'en';
  try { localStorage.setItem('aiv-lang', S.lang); } catch (e) { /* storage unavailable */ }
  const u = new URL(location.href);
  u.searchParams.set('lang', S.lang);
  try { history.replaceState(null, '', u); } catch (e) { /* file:// may refuse */ }
  applyStaticLang();
  if (typeof rerenderAll === 'function') rerenderAll();
}

function initLang() {
  let lang = null;
  try { lang = new URL(location.href).searchParams.get('lang'); } catch (e) { /* ignore */ }
  if (!lang) { try { lang = localStorage.getItem('aiv-lang'); } catch (e) { /* ignore */ } }
  if (!lang) lang = (navigator.language || 'en').toLowerCase().startsWith('pt') ? 'pt' : 'en';
  S.lang = lang === 'pt' ? 'pt' : 'en';
  applyStaticLang();
}
